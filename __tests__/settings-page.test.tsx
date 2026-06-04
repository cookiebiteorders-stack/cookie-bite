import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LanguageProvider } from "@/components/providers/language-provider";
import AdminSettingsPage from "@/app/(admin)/admin/settings/page";

function renderSettings() {
  return render(
    <LanguageProvider initialLang="en">
      <AdminSettingsPage />
    </LanguageProvider>,
  );
}

const fetchJsonMock = jest.fn();

jest.mock("@/lib/http/fetch-json", () => ({
  fetchJson: (...args: unknown[]) => fetchJsonMock(...args),
}));

describe("AdminSettingsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows error and retry button, then recovers on retry", async () => {
    let healthCalls = 0;
    fetchJsonMock.mockImplementation((url: string) => {
      if (url.includes("/api/admin/settings/health")) {
        healthCalls += 1;
        if (healthCalls === 1) {
          return Promise.reject(new Error("network fail"));
        }
        return Promise.resolve({
          canonical_host: "cookie-bite.com",
          node_env: "development",
          env: { ok: true, missing: [], warnings: [] },
          integrations: {
            app_urls: true,
            clerk: true,
            supabase: true,
            paymob: true,
            resend: true,
            internal_api: true,
          },
        });
      }
      if (url.includes("/api/admin/notifications/templates")) {
        return Promise.resolve({ templates: [] });
      }
      return Promise.reject(new Error("unexpected url"));
    });

    renderSettings();
    await screen.findByText("network fail");
    const retry = screen.getByRole("button", { name: /^Retry$/i });
    fireEvent.click(retry);

    await waitFor(() => {
      expect(healthCalls).toBeGreaterThan(1);
      expect(screen.queryByText("network fail")).not.toBeInTheDocument();
    });
  }, 15000);
});

