/** @jest-environment node */

import { GET, PATCH } from "@/app/api/admin/products/route";

const requireAdminAccessMock = jest.fn();
const requireWritePermissionMock = jest.fn();
const writeAuditLogMock = jest.fn();

const queryChain = {
  select: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  range: jest.fn(),
  in: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
};

const supabaseMock = {
  from: jest.fn(() => queryChain),
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

describe("api/admin/products", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({
      user_id: "u1",
      email: "admin@cookie-bite.com",
      role: "admin",
    });
  });

  it("GET applies search and low stock filters", async () => {
    queryChain.range.mockResolvedValueOnce({
      data: [{ id: "p1", stock: 2 }],
      count: 1,
      error: null,
    });
    const req = {
      nextUrl: new URL(
        "http://localhost/api/admin/products?page=1&limit=20&search=choco&low_stock=true&active=true",
      ),
    } as import("next/server").NextRequest;

    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products).toHaveLength(1);
    expect(queryChain.or).toHaveBeenCalled();
    expect(queryChain.lte).toHaveBeenCalledWith("stock", 10);
    expect(queryChain.eq).toHaveBeenCalledWith("is_active", true);
  });

  it("PATCH updates products and writes audit", async () => {
    // deterministic chain for PATCH only: first "before" query then update query
    const beforeChain = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ data: [{ id: "p1", stock: 1 }] }),
    };
    const updateChain = {
      update: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ data: [{ id: "p1", stock: 5 }], error: null }),
    };
    (supabaseMock.from as jest.Mock)
      .mockReturnValueOnce(beforeChain)
      .mockReturnValueOnce(updateChain);

    const req = new Request("http://localhost/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: ["550e8400-e29b-41d4-a716-446655440000"],
        patch: { stock: 5 },
      }),
    }) as unknown as import("next/server").NextRequest;

    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(writeAuditLogMock).toHaveBeenCalled();
  });
});

