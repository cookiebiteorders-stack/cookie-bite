import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import AdminReportsPage from "@/app/(admin)/admin/reports/page";
import { LanguageProvider } from "@/components/providers/language-provider";

const fetchJsonMock = jest.fn();

jest.mock("@/lib/http/fetch-json", () => ({
  fetchJson: (...args: unknown[]) => fetchJsonMock(...args),
}));

function renderReportsPage() {
  return render(
    <LanguageProvider initialLang="en">
      <AdminReportsPage />
    </LanguageProvider>,
  );
}

describe("AdminReportsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders error state with retry action", async () => {
    fetchJsonMock.mockImplementation((url: unknown) => {
      if (typeof url === "string" && url.includes("/api/admin/reports/overview")) {
        return Promise.reject(new Error("analytics down"));
      }
      return Promise.resolve({
        period_days: 30,
        gift_boxes: { count: 0, revenue_egp: 0, by_size: [] },
        addons: { top: [] },
      });
    });
    renderReportsPage();

    await screen.findByText("analytics down");
    const retry = screen.getByRole("button", { name: /retry/i });
    expect(retry).toBeInTheDocument();
    fireEvent.click(retry);
  });
});

