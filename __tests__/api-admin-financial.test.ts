/** @jest-environment node */

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

describe("api/admin/financial/summary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({
      user_id: "u1",
      email: "owner@cookie-bite.com",
      role: "owner",
    });
  });

  it("GET returns revenue, expenses and net", async () => {
    const ordersChain = {
      select: jest.fn().mockReturnThis(),
      gte: jest.fn().mockResolvedValue({
        data: [{ total_egp: 100 }, { total_egp: 50 }],
      }),
    };
    const expensesChain = {
      select: jest.fn().mockResolvedValue({
        data: [
          { amount_egp: 20, category: "ops", expense_date: "2026-01-01" },
          { amount_egp: 10, category: "ops", expense_date: "2026-01-02" },
        ],
      }),
    };
    (supabaseMock.from as jest.Mock)
      .mockReturnValueOnce(ordersChain)
      .mockReturnValueOnce(expensesChain);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.revenue_30d_egp).toBe(150);
    expect(body.expenses_total_egp).toBe(30);
    expect(body.net_egp).toBe(120);
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

