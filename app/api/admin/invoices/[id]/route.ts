import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdminAccess, requireWritePermission } from "@/lib/admin/require-admin";
import { writeAuditLog } from "@/lib/admin/audit";
import { fetchOrderItemsByOrderIds } from "@/lib/db/order-items-fetch";
import { fetchLatestPaymentsByOrderIds, isMissingInvoicesTableError } from "@/lib/db/payments-fetch";
import { bilingualError } from "@/lib/validations";
import {
  type ManualInvoiceDocument,
  createManualInvoiceSchema,
  manualInvoiceDocumentSchema,
  normalizeManualDocument,
} from "@/lib/invoices/manual-invoice";
import { legacyInvoiceToDocument } from "@/lib/invoices/legacy-invoice-document";
import {
  documentGrandTotal,
  invoiceRowToApiPayload,
  lifecycleToDbStatus,
} from "@/lib/invoices/map-invoice-row";

type UserLookupRow = { full_name: string | null; email: string | null };

async function fetchUser(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  userId: string | null,
): Promise<UserLookupRow | null> {
  if (!userId) return null;
  const { data } = await supabase
    .from("users")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();
  return (data as UserLookupRow | null) ?? null;
}

async function loadInvoiceById(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  id: string,
) {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      `
      id,
      order_id,
      amount,
      status,
      issued_at,
      created_at,
      invoice_number,
      due_at,
      currency,
      document,
      orders:order_id (
        id,
        order_code,
        status,
        guest_email,
        user_id
      )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (isMissingInvoicesTableError(error.message)) {
      return { error: "invoices_table_missing" as const };
    }
    return { error: error.message };
  }
  if (!data) return { error: "not_found" as const };

  const row = data as Record<string, unknown>;
  const orderRaw = row.orders;
  const order = ((Array.isArray(orderRaw) ? orderRaw[0] : orderRaw) as Record<string, unknown> | null) ?? null;
  const orderId = typeof order?.id === "string" ? order.id : null;
  const userId = order?.user_id != null ? String(order.user_id) : null;
  const [user, itemsByOrderId, paymentsByOrderId] = await Promise.all([
    fetchUser(supabase, userId),
    orderId ? fetchOrderItemsByOrderIds(supabase, [orderId]) : Promise.resolve(new Map()),
    orderId ? fetchLatestPaymentsByOrderIds(supabase, [orderId]) : Promise.resolve(new Map()),
  ]);
  const items = orderId ? (itemsByOrderId.get(orderId) ?? []) : [];
  const payment = orderId ? paymentsByOrderId.get(orderId) : undefined;

  const issuedAt =
    (typeof row.issued_at === "string" ? row.issued_at : null) ??
    (typeof row.created_at === "string" ? row.created_at : null) ??
    new Date().toISOString();

  const apiRow = invoiceRowToApiPayload(
    {
      id: String(row.id),
      order_id: orderId,
      amount: Number(row.amount ?? 0),
      status: String(row.status ?? "pending"),
      issued_at: issuedAt,
      created_at: typeof row.created_at === "string" ? row.created_at : issuedAt,
      invoice_number: typeof row.invoice_number === "string" ? row.invoice_number : null,
      due_at: typeof row.due_at === "string" ? row.due_at : null,
      currency: typeof row.currency === "string" ? row.currency : "EGP",
      document: row.document,
    },
    order,
    user,
    items,
    payment,
  );

  let document: ManualInvoiceDocument;
  try {
    if (row.document && typeof row.document === "object") {
      document = normalizeManualDocument(
        manualInvoiceDocumentSchema.parse(row.document),
      );
    } else {
      throw new Error("no document");
    }
  } catch {
    document = legacyInvoiceToDocument({
      status: String(row.status ?? "pending"),
      customer_name: apiRow.customer_name,
      customer_email: apiRow.customer_email,
      order_id: orderId,
      items: items.map(
        (item: {
          id: string;
          product_name: string;
          quantity: number;
          unit_price_egp: number;
        }) => ({
          id: item.id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price_egp: item.unit_price_egp,
        }),
      ),
      payment_method: payment?.method ?? null,
      payment_status: payment?.status ?? null,
      amount_paid: apiRow.status === "paid" ? apiRow.amount_egp : 0,
    });
  }

  return {
    invoice: apiRow,
    document,
    meta: {
      is_manual: Boolean(row.document),
      is_editable: true,
    },
  };
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json(
      bilingualError("Invalid invoice id", "معرّف الفاتورة غير صالح"),
      { status: 400 },
    );
  }

  await requireAdminAccess("invoices");
  const supabase = createSupabaseAdminClient();
  const loaded = await loadInvoiceById(supabase, id);

  if ("error" in loaded) {
    if (loaded.error === "not_found") {
      return NextResponse.json(bilingualError("Invoice not found", "الفاتورة غير موجودة"), {
        status: 404,
      });
    }
    if (loaded.error === "invoices_table_missing") {
      return NextResponse.json(
        {
          ...bilingualError("Invoices table is missing", "جدول الفواتير غير موجود"),
          code: "invoices_table_missing",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      bilingualError("Failed to load invoice", "تعذّر تحميل الفاتورة"),
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    invoice: loaded.invoice,
    document: loaded.document,
    meta: loaded.meta,
  });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json(
      bilingualError("Invalid invoice id", "معرّف الفاتورة غير صالح"),
      { status: 400 },
    );
  }

  const actor = await requireAdminAccess("invoices");
  requireWritePermission(actor);

  const parsed = createManualInvoiceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(bilingualError("Invalid payload", "بيانات غير صالحة"), {
      status: 400,
    });
  }

  const supabase = createSupabaseAdminClient();
  const { data: before } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  if (!before) {
    return NextResponse.json(bilingualError("Invoice not found", "الفاتورة غير موجودة"), {
      status: 404,
    });
  }

  const payload = parsed.data;
  const document = normalizeManualDocument(manualInvoiceDocumentSchema.parse(payload.document));
  const orderId = payload.order_id ?? document.reference_order_id ?? before.order_id ?? null;
  const grandTotal = documentGrandTotal(document);
  const invoiceNumber =
    payload.invoice_number?.trim() ||
    (typeof before.invoice_number === "string" ? before.invoice_number : undefined);
  const issuedAt = payload.issued_at ?? before.issued_at ?? new Date().toISOString();
  const dueAt = payload.due_at ?? before.due_at ?? null;
  const dbStatus = lifecycleToDbStatus(document.lifecycle_status);

  if (invoiceNumber && invoiceNumber !== before.invoice_number) {
    const { data: dup } = await supabase
      .from("invoices")
      .select("id")
      .eq("invoice_number", invoiceNumber)
      .neq("id", id)
      .maybeSingle();
    if (dup) {
      return NextResponse.json(
        bilingualError("Invoice number already exists", "رقم الفاتورة مستخدم مسبقاً"),
        { status: 409 },
      );
    }
  }

  const { data, error } = await supabase
    .from("invoices")
    .update({
      order_id: orderId,
      amount: grandTotal,
      status: dbStatus,
      issued_at: issuedAt,
      invoice_number: invoiceNumber,
      due_at: dueAt,
      currency: payload.currency,
      document,
    })
    .eq("id", id)
    .select(
      "id, order_id, amount, status, issued_at, invoice_number, due_at, currency, document",
    )
    .single();

  if (error || !data) {
    console.error("[admin/invoices/:id] PATCH", error);
    return NextResponse.json(bilingualError("Failed to update invoice", "فشل تحديث الفاتورة"), {
      status: 500,
    });
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "invoices.update_manual",
    module: "invoices",
    entity_id: id,
    before,
    after: data,
    request: req,
  });

  try {
    revalidatePath("/admin/invoices");
  } catch {
    /* non-fatal */
  }

  const loaded = await loadInvoiceById(supabase, id);
  return NextResponse.json({
    ok: true,
    invoice: "invoice" in loaded ? loaded.invoice : null,
  });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json(
      bilingualError("Invalid invoice id", "معرّف الفاتورة غير صالح"),
      { status: 400 },
    );
  }

  const actor = await requireAdminAccess("invoices");
  requireWritePermission(actor);

  const supabase = createSupabaseAdminClient();
  const { data: before } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle();
  if (!before) {
    return NextResponse.json(bilingualError("Invoice not found", "الفاتورة غير موجودة"), {
      status: 404,
    });
  }

  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) {
    console.error("[admin/invoices/:id] DELETE", error);
    return NextResponse.json(bilingualError("Failed to delete invoice", "فشل حذف الفاتورة"), {
      status: 500,
    });
  }

  await writeAuditLog({
    actor: { user_id: actor.user_id, email: actor.email, role: actor.role },
    action: "invoices.delete",
    module: "invoices",
    entity_id: id,
    before,
    after: null,
    request: req,
  });

  try {
    revalidatePath("/admin/invoices");
  } catch {
    /* non-fatal */
  }

  return NextResponse.json({ ok: true });
}
