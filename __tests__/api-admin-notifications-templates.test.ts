/** @jest-environment node */

import { GET, POST } from "@/app/api/admin/notifications/templates/route";

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

describe("api/admin/notifications/templates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({
      user_id: "u1",
      email: "owner@cookie-bite.com",
      role: "owner",
    });
  });

  it("GET returns templates list", async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [{ id: "t1", key: "order_confirmed" }],
        error: null,
      }),
    };
    (supabaseMock.from as jest.Mock).mockReturnValueOnce(chain);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.templates).toHaveLength(1);
  });

  it("POST upserts template and writes audit", async () => {
    const chain = {
      upsert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: "t2", channel: "email", key: "order_confirmed", language: "en" },
        error: null,
      }),
    };
    (supabaseMock.from as jest.Mock).mockReturnValueOnce(chain);

    const req = new Request("http://localhost/api/admin/notifications/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: "email",
        key: "order_confirmed",
        language: "en",
        body: "Thanks for your order",
      }),
    }) as unknown as import("next/server").NextRequest;

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ key: "order_confirmed" }),
      { onConflict: "channel,key,language" },
    );
    expect(writeAuditLogMock).toHaveBeenCalled();
  });
});

