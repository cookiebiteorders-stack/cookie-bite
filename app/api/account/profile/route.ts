import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { isProfileComplete } from "@/lib/account/profile-complete";
import {
  completeProfileSchema,
  firstProfileSchemaError,
  hasAnyProfileFields,
  hasMeaningfulAddress,
  isSkipProfileRequest,
} from "@/lib/account/profile-schema";
import {
  ensureDbUserForClerk,
  isSupabaseAdminConfigured,
} from "@/lib/db/ensure-db-user";
import {
  getUserByClerkId,
  markProfileCompleted,
  updateUserProfile,
} from "@/lib/db/users";
import {
  buildAddressInsertRow,
  minimalAddressInsertRow,
  normalizeAddressRow,
  stripMissingAddressColumns,
} from "@/lib/db/addresses";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { tryNotifyStaffNewCustomer } from "@/lib/notifications/new-customer-staff-alert";
import { bilingualError } from "@/lib/validations";

function devDbDebug(message: string, hint?: string) {
  if (process.env.NODE_ENV === "production") return undefined;
  return { message, hint };
}

function supabaseUnavailableResponse() {
  return NextResponse.json(
    {
      ...bilingualError(
        "Database not configured on server",
        "قاعدة البيانات غير مضبوطة على السيرفر — أضف SUPABASE_SERVICE_KEY",
      ),
      debug: devDbDebug(
        "SUPABASE_ADMIN_UNAVAILABLE",
        "تحقق من .env على Hostinger: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY",
      ),
    },
    { status: 503 },
  );
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(bilingualError("Unauthorized", "غير مصرح"), { status: 401 });
  }

  if (!isSupabaseAdminConfigured()) {
    return supabaseUnavailableResponse();
  }

  let dbUser = await ensureDbUserForClerk(userId);
  if (!dbUser) {
    return NextResponse.json(
      bilingualError("Profile not found", "لم يُعثر على الملف"),
      { status: 404 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data: defaultAddress } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", dbUser.id)
    .eq("is_default", true)
    .maybeSingle();

  return NextResponse.json({
    profile: dbUser,
    complete: isProfileComplete(dbUser),
    default_address: normalizeAddressRow(defaultAddress ?? undefined),
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(bilingualError("Unauthorized", "غير مصرح"), { status: 401 });
  }

  if (!isSupabaseAdminConfigured()) {
    return supabaseUnavailableResponse();
  }

  const parsed = completeProfileSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    const { en, ar } = firstProfileSchemaError(parsed.error);
    return NextResponse.json({ ...bilingualError(en, ar) }, { status: 400 });
  }

  const dbUser = await ensureDbUserForClerk(userId);
  if (!dbUser) {
    return NextResponse.json(
      {
        ...bilingualError("Could not save profile", "تعذّر حفظ الملف"),
        debug: devDbDebug(
          "ensureDbUserForClerk failed",
          "تأكد من webhook Clerk أو شغّل POST /api/account/provision ثم أعد المحاولة",
        ),
      },
      { status: 500 },
    );
  }

  const body = parsed.data;

  if (!isSkipProfileRequest(body) && hasAnyProfileFields(body)) {
    const updated = await updateUserProfile(dbUser.id, {
      ...(body.full_name_en != null ? { full_name_en: body.full_name_en } : {}),
      ...(body.full_name_ar != null ? { full_name_ar: body.full_name_ar } : {}),
      ...(body.phone != null ? { phone: body.phone } : {}),
      ...(body.phone_secondary != null
        ? { phone_secondary: body.phone_secondary }
        : {}),
      ...(body.profile_notes != null ? { profile_notes: body.profile_notes } : {}),
      ...(body.full_name_en
        ? { full_name: body.full_name_en }
        : body.full_name_ar
          ? { full_name: body.full_name_ar }
          : {}),
    });
    if (!updated) {
      return NextResponse.json(
        {
          ...bilingualError("Could not save profile", "تعذّر حفظ الملف"),
          debug: devDbDebug(
            "updateUserProfile failed",
            "شغّل npm run supabase:migrate (0027, 0029) على مشروع Supabase",
          ),
        },
        { status: 500 },
      );
    }
    Object.assign(dbUser, updated);
  }

  let savedAddress: {
    label: string | null;
    recipient: string | null;
    phone: string | null;
    phone_secondary: string | null;
    street: string | null;
    building: string | null;
    floor: string | null;
    apartment: string | null;
    city: string | null;
    governorate: string | null;
    delivery_notes: string | null;
    latitude: number;
    longitude: number;
  } | null = null;

  if (!isSkipProfileRequest(body) && hasMeaningfulAddress(body.address)) {
    const addr = body.address!;
    const lat = addr.latitude ?? 30.0444;
    const lng = addr.longitude ?? 31.2357;
    const fallbackRecipient =
      addr.recipient ?? dbUser.full_name_en ?? dbUser.full_name ?? "Customer";
    const fallbackPhone = addr.phone ?? body.phone ?? "";

    const supabase = createSupabaseAdminClient();
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", dbUser.id);

    const addressRow = buildAddressInsertRow(
      dbUser.id,
      addr,
      { recipient: fallbackRecipient, phone: fallbackPhone },
      { latitude: lat, longitude: lng },
    );

    let { error: addrError } = await supabase.from("addresses").insert(addressRow);

    if (addrError) {
      const stripped = stripMissingAddressColumns(addressRow, addrError.message ?? "");
      if (stripped) {
        const retry = await supabase.from("addresses").insert(stripped);
        addrError = retry.error;
      }
    }
    if (addrError) {
      const minimal = minimalAddressInsertRow(addressRow);
      const retry = await supabase.from("addresses").insert(minimal);
      addrError = retry.error;
    }

    if (addrError) {
      console.error("complete profile address insert", addrError);
      return NextResponse.json(
        {
          ...bilingualError("Could not save address", "تعذّر حفظ العنوان"),
          debug: devDbDebug(addrError.message, addrError.code ?? addrError.hint ?? undefined),
        },
        { status: 500 },
      );
    }

    savedAddress = {
      label: addr.label,
      recipient: addr.recipient,
      phone: addr.phone,
      phone_secondary: addr.phone_secondary,
      street: addr.street,
      building: addr.building,
      floor: addr.floor,
      apartment: addr.apartment,
      city: addr.city,
      governorate: addr.governorate,
      delivery_notes: addr.delivery_notes,
      latitude: lat,
      longitude: lng,
    };
  }

  const completed = await markProfileCompleted(dbUser.id);
  if (!completed) {
    return NextResponse.json(
      {
        ...bilingualError(
          "Could not mark profile complete — database unavailable",
          "تعذّر إكمال الملف — تحقق من اتصال قاعدة البيانات",
        ),
        debug: devDbDebug("markProfileCompleted failed"),
      },
      { status: 503 },
    );
  }
  const profileUser = completed;

  try {
    const staffResult = await tryNotifyStaffNewCustomer({
      kind: "profile_complete",
      user: profileUser,
      address: savedAddress,
    });
    if (staffResult.sent === 0 && staffResult.reason !== "already_sent") {
      console.warn("staff profile alert skipped", staffResult.reason);
    }
  } catch (err) {
    console.error("staff profile alert failed", err);
  }

  if (!isSkipProfileRequest(body) && body.full_name_en) {
    try {
      const client = await clerkClient();
      const parts = body.full_name_en.trim().split(/\s+/);
      const firstName = parts[0] ?? body.full_name_en;
      const lastName = parts.slice(1).join(" ") || undefined;
      await client.users.updateUser(userId, {
        firstName,
        lastName: lastName || undefined,
      });
    } catch (err) {
      console.error("sync clerk name after profile complete", err);
    }
  }

  return NextResponse.json({
    ok: true,
    profile: profileUser,
    complete: true,
    skipped: isSkipProfileRequest(body),
  });
}
