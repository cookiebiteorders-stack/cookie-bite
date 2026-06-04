/** @jest-environment node */

const tryCreateSupabaseAdminClientMock = jest.fn();

jest.mock("@/lib/supabase/admin", () => ({
  tryCreateSupabaseAdminClient: () => tryCreateSupabaseAdminClientMock(),
}));

import { listOwnerAndAdminEmails } from "@/lib/notifications/staff-recipients";

describe("listOwnerAndAdminEmails", () => {
  const originalAdmin = process.env.ADMIN_BOOTSTRAP_EMAILS;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.OWNER_BOOTSTRAP_EMAIL = "owner@test.com";
    delete process.env.ADMIN_BOOTSTRAP_EMAILS;
  });

  afterAll(() => {
    process.env.ADMIN_BOOTSTRAP_EMAILS = originalAdmin;
  });

  it("includes bootstrap owner and admins from env", async () => {
    process.env.ADMIN_BOOTSTRAP_EMAILS = "admin1@test.com, admin2@test.com";
    tryCreateSupabaseAdminClientMock.mockReturnValue(null);

    const emails = await listOwnerAndAdminEmails();
    expect(emails).toContain("cookie-bite@cookie-bite.com");
    expect(emails).toContain("owner@test.com");
    expect(emails).toContain("admin1@test.com");
    expect(emails).toContain("admin2@test.com");
  });

  it("merges owner/admin rows from database", async () => {
    tryCreateSupabaseAdminClientMock.mockReturnValue({
      from: () => ({
        select: () => ({
          in: async () => ({
            data: [{ email: "db-admin@test.com" }],
            error: null,
          }),
        }),
      }),
    });

    const emails = await listOwnerAndAdminEmails();
    expect(emails).toContain("owner@test.com");
    expect(emails).toContain("db-admin@test.com");
  });
});
