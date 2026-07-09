import { fireEvent, render, screen } from "@testing-library/react";

import CaseStudyPage from "@/app/case-study/page";
import LandingPage from "@/app/page";

describe("public portfolio pages", () => {
  it("presents the product with verifiable engineering evidence", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", { name: /community savings, made transparent/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("113")).toBeInTheDocument();
    expect(screen.getByText("97")).toBeInTheDocument();
    expect(screen.queryByText("99.9%")).not.toBeInTheDocument();
    expect(screen.queryByText(/trusted by communities everywhere/i)).not.toBeInTheDocument();
  });

  it("keeps mobile portfolio navigation keyboard-operable", () => {
    render(<LandingPage />);

    const trigger = screen.getByRole("button", { name: /open navigation/i });
    fireEvent.click(trigger);

    expect(screen.getByRole("navigation", { name: /mobile navigation/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /close navigation/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("explains architecture, scope, and financial boundaries in the case study", () => {
    render(<CaseStudyPage />);

    expect(
      screen.getByRole("heading", { name: /designing trust into community finance/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Track money; do not custody it")).toBeInTheDocument();
    expect(screen.getByText("mongodb-memory-server")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /view source/i }).length).toBeGreaterThan(0);
  });
});
