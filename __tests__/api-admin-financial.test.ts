/** @jest-environment node */

import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/admin/financial/summary/route";

const requireAdminAccessMock = jest.fn();
const requireWritePermissionMock = jest.fn();
const writeAuditLogMock = jest.fn();

const supabaseMock = {
  from: jest.fn(),
};

jest.mock("@/lib/admin/require-admin", () => ({
  requireAdminAccess: (...args: unknown[]) => requireAdminAccessMock(...args),
  requireWritePermission: (...args: unknown[]) => requireWritePermissionMock(...args),
}));

jest.mock("@/lib/admin/audit", () => ({
  writeAuditLog: (...args: unknown[]) => writeAuditLogMock(...args),
}));

jest.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => supabaseMock,
}));

function chainOrders(rows: unknown[]) {
  return {
    select: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: rows, error: null }),
  };
}

function chainExpenses(rows: unknown[]) {
  return {
    select: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue({ data: rows, error: null }),
  };
}

describe("api/admin/financial/summary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({
      user_id: "u1",
      email: "owner@cookie-bite.com",
      role: "owner",
    });
  });

  it("GET returns KPIs for current month range", async () => {
    const ordersChain = chainOrders([
      { total_egp: 100, created_at: "2026-01-15T10:00:00.000Z", payment_status: "paid" },
      { total_egp: 50, created_at: "2026-01-16T10:00:00.000Z", payment_status: "paid" },
    ]);
    const expensesChain = chainExpenses([
      {
        id: "e1",
        title: "Ops",
        amount_egp: 20,
        category: "ops",
        expense_date: "2026-01-01",
        notes: null,
      },
      {
        id: "e2",
        title: "Ops2",
        amount_egp: 10,
        category: "ops",
        expense_date: "2026-01-02",
        notes: null,
      },
    ]);
    (supabaseMock.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "orders") return ordersChain;
      if (table === "expenses") return expensesChain;
      return ordersChain;
    });

    const req = new NextRequest(
      "http://localhost/api/admin/financial/summary?preset=custom&from=2026-01-01&to=2026-01-31",
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { kpis: { revenue_egp: number; expenses_egp: number; net_egp: number } };
    expect(body.kpis.revenue_egp).toBe(150);
    expect(body.kpis.expenses_egp).toBe(30);
    expect(body.kpis.net_egp).toBe(120);
  });

  it("POST creates expense with actor id and writes audit", async () => {
    const insertChain = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: "e1", title: "Packaging", amount_egp: 40 },
        error: null,
      }),
    };
    (supabaseMock.from as jest.Mock).mockReturnValueOnce(insertChain);

    const req = new Request("http://localhost/api/admin/financial/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Packaging",
        category: "ops",
        amount_egp: 40,
        expense_date: "2026-01-03",
      }),
    }) as unknown as import("next/server").NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ created_by: "u1" }),
    );
    expect(writeAuditLogMock).toHaveBeenCalled();
  });
});
