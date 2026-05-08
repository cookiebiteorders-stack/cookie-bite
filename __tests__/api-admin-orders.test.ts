/** @jest-environment node */

import { GET } from "@/app/api/admin/orders/route";

const requireAdminAccessMock = jest.fn();

const queryChain = {
  select: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  range: jest.fn(),
};

const supabaseMock = {
  from: jest.fn(() => queryChain),
};

jest.mock("@/lib/admin/require-admin", () => ({
  requireAdminAccess: (...args: unknown[]) => requireAdminAccessMock(...args),
}));

jest.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => supabaseMock,
}));

describe("api/admin/orders GET", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({
      user_id: "u1",
      email: "admin@cookie-bite.com",
      role: "admin",
    });
  });

  it("returns filtered order list with pagination", async () => {
    queryChain.range.mockResolvedValueOnce({
      data: [{ id: "o1", status: "pending" }],
      error: null,
      count: 1,
    });

    const req = {
      nextUrl: new URL(
        "http://localhost/api/admin/orders?status=pending&payment_status=paid&page=1&limit=20",
      ),
    } as import("next/server").NextRequest;

    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.orders).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(queryChain.eq).toHaveBeenCalledWith("status", "pending");
    expect(queryChain.eq).toHaveBeenCalledWith("payment_status", "paid");
    expect(requireAdminAccessMock).toHaveBeenCalledWith("orders");
  });
});

