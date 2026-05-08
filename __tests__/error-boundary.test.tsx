import { render, screen } from "@testing-library/react";
import React from "react";
import { ErrorBoundary } from "@/components/error-boundary";

jest.mock("next/link", () => {
  return function MockLink(props: { href: string; children: React.ReactNode }) {
    return <a href={props.href}>{props.children}</a>;
  };
});

function Thrower(): React.JSX.Element {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <div>safe content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("safe content")).toBeInTheDocument();
  });

  it("renders fallback UI when child throws", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>,
    );
    expect(
      screen.getByText(/Something went wrong|حدث خطأ غير متوقع/i),
    ).toBeInTheDocument();
    spy.mockRestore();
  });
});

