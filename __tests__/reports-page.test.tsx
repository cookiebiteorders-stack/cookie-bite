import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import AdminReportsPage from "@/app/(admin)/admin/reports/page";

const fetchJsonMock = jest.fn();

jest.mock("@/lib/http/fetch-json", () => ({
  fetchJson: (...args: unknown[]) => fetchJsonMock(...args),
}));

describe("AdminReportsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders error state with retry action", async () => {
    fetchJsonMock.mockRejectedValueOnce(new Error("analytics down"));
    render(<AdminReportsPage />);

    await screen.findByText("analytics down");
    const retry = screen.getByRole("button", { name: /retry/i });
    expect(retry).toBeInTheDocument();
    fireEvent.click(retry);
  });
});

