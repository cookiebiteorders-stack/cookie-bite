/** @jest-environment node */

import { GET, POST } from "@/app/api/admin/discounts/route";

const requireAdminAccessMock = jest.fn();
const requireWritePermissionMock = jest.fn();
const writeAuditLogMock = jest.fn();

const chain = {
  select: jest.fn().mockReturnThis(),
  order: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  single: jest.fn(),
};

const supabaseMock = {
  from: jest.fn(() => chain),
};

jest.mock("@/lib/admin/require-admin", () => ({
  requireAdminAccess: (...args: unknown[]) => requireAdminAccessMock(...args),
  requireWritePermission: (...args: unknown[]) => requireWritePermissionMock(...args),
}));

jest.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => supabaseMock,
}));

jest.mock("@/lib/admin/audit", () => ({
  writeAuditLog: (...args: unknown[]) => writeAuditLogMock(...args),
}));

describe("api/admin/discounts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({
      user_id: "u1",
      email: "admin@cookie-bite.com",
      role: "admin",
    });
  });

  it("GET returns discounts list", async () => {
    chain.order.mockResolvedValueOnce({
      data: [{ id: "d1", code: "WELCOME" }],
      error: null,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.discounts).toHaveLength(1);
    expect(requireAdminAccessMock).toHaveBeenCalledWith("discounts");
  });

  it("POST validates payload and maps DB fields", async () => {
    chain.single.mockResolvedValueOnce({
      data: { id: "d2", code: "SALE10", type: "percent", is_active: true },
      error: null,
    });

    const req = new Request("http://localhost/api/admin/discounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "sale10",
        type: "percent",
        value: 10,
        active: true,
      }),
    }) as unknown as import("next/server").NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "SALE10",
        type: "percent",
        is_active: true,
        valid_until: null,
      }),
    );
    expect(writeAuditLogMock).toHaveBeenCalled();
  });

  it("POST returns 400 for invalid payload", async () => {
    const req = new Request("http://localhost/api/admin/discounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "x",
      }),
    }) as unknown as import("next/server").NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

