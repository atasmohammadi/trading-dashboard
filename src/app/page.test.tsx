import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TradingDashboardPage from "./page";

// The page opens a real socket on mount; the client is covered in ws-client.test.ts.
vi.mock("../lib/ws-client", () => ({
  TradingWSClient: class {
    connect() {}
    disconnect() {}
  }
}));

describe("TradingDashboardPage", () => {
  it("renders the banner, the watchlist table and the order ticket shell", () => {
    render(<TradingDashboardPage />);
    expect(screen.getByRole("heading", { name: /ALTI-TRADE/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Bid" })).toBeInTheDocument();
    expect(screen.getByText("Select an instrument from the watchlist to trade.")).toBeInTheDocument();
  });
});
