/** @jest-environment node */

import { GET } from "@/app/api/admin/settings/health/route";

const requireAdminAccessMock = jest.fn();
const checkProductionEnvMock = jest.fn();

jest.mock("@/lib/admin/require-admin", () => ({
  requireAdminAccess: (...args: unknown[]) => requireAdminAccessMock(...args),
}));

jest.mock("@/lib/config/production-lock", () => ({
  PRODUCTION_HOST: "cookie-bite.com",
  checkProductionEnv: () => checkProductionEnvMock(),
  getIntegrationEnvStatus: () => ({
    app_urls: true,
    clerk: true,
    supabase: true,
    paymob: true,
    resend: true,
    internal_api: true,
    ai_gemini: true,
    cms_sanity: true,
  }),
}));

describe("api/admin/settings/health GET", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({
      user_id: "u1",
      email: "owner@cookie-bite.com",
      role: "owner",
    });
    checkProductionEnvMock.mockReturnValue({
      ok: true,
      missing: [],
      warnings: [],
    });
  });

  it("returns canonical host, env health, and integration flags", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.canonical_host).toBe("cookie-bite.com");
    expect(body.env.ok).toBe(true);
    expect(body.integrations.supabase).toBe(true);
    expect(requireAdminAccessMock).toHaveBeenCalledWith("settings");
  });
});

