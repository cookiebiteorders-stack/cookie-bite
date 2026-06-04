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
    fetchJsonMock.mockRejectedValueOnce(new Error("analytics down"));
    renderReportsPage();

    await screen.findByText("analytics down");
    const retry = screen.getByRole("button", { name: /retry/i });
    expect(retry).toBeInTheDocument();
    fireEvent.click(retry);
  });
});

