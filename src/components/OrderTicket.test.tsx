import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import { OrderTicket } from "./OrderTicket";
import { useTickerStore } from "../store/ticker-store";
import type { InstrumentSummary } from "../types/trading";

const eurusd = (overrides: Partial<InstrumentSummary> = {}): InstrumentSummary => ({
  symbol: "EURUSD",
  name: "EUR / USD",
  type: "forex",
  decimals: 5,
  pipSize: "0.00010",
  bid: "1.08412",
  ask: "1.08415",
  spread: "0.00003",
  openPrice: "1.08400",
  changeAbs: "0.00012",
  changePercent: "+0.01%",
  isPositive: true,
  history: ["1.08412"],
  lastUpdated: Date.now(),
  lastSeq: 100,
  ...overrides
});

const setQuote = (summary: InstrumentSummary) => {
  act(() => {
    useTickerStore.setState({ summaries: { EURUSD: summary } });
  });
};

describe("OrderTicket Component", () => {
  beforeEach(() => {
    useTickerStore.setState({
      connectionStatus: "LIVE",
      selectedSymbol: "EURUSD",
      summaries: { EURUSD: eurusd() }
    });
  });

  it("prefills the ask price on BUY and shows the estimated cost", () => {
    render(<OrderTicket />);

    expect(screen.getByDisplayValue("1.08415")).toBeInTheDocument();
    expect(screen.getByText("PLACE BUY ORDER")).toBeInTheDocument();
    // 10 units * 1.08415 = 10.8415, rounded half-up to 2 places
    expect(screen.getByText("$10.84")).toBeInTheDocument();
  });

  it("disables order placement when connection status is STALE", () => {
    useTickerStore.setState({ connectionStatus: "STALE" });
    render(<OrderTicket />);

    const submitBtn = screen.getByRole("button", { name: /FEED DISCONNECTED/i });
    expect(submitBtn).toBeDisabled();
  });

  it("triggers slippage confirmation modal if price moved past tolerance", () => {
    render(<OrderTicket />);

    // User is viewing EURUSD at 1.08415 with 2.0 pip tolerance
    // Market suddenly jumps to 1.08455 (4 pips higher)
    setQuote(eurusd({ ask: "1.08455", lastSeq: 101 }));

    fireEvent.click(screen.getByText("PLACE BUY ORDER"));

    expect(screen.getByText("Price Movement Exceeded Tolerance")).toBeInTheDocument();
    expect(screen.getByText("Accept New Price")).toBeInTheDocument();
  });

  it("places the order directly when the move is within tolerance", async () => {
    const user = userEvent.setup();
    render(<OrderTicket />);

    setQuote(eurusd({ ask: "1.08416", lastSeq: 101 }));
    await user.click(screen.getByText("PLACE BUY ORDER"));

    expect(screen.queryByText("Price Movement Exceeded Tolerance")).toBeNull();
    expect(screen.getByText("Recent Executions")).toBeInTheDocument();
    expect(screen.getByText("@ 1.08415")).toBeInTheDocument();
  });

  it("executes at the locked price when the trader accepts the new price", async () => {
    const user = userEvent.setup();
    render(<OrderTicket />);

    setQuote(eurusd({ ask: "1.08455", lastSeq: 101 }));
    await user.click(screen.getByText("PLACE BUY ORDER"));
    await user.click(screen.getByText("Accept New Price"));

    expect(screen.queryByText("Price Movement Exceeded Tolerance")).toBeNull();
    expect(screen.getByText("Recent Executions")).toBeInTheDocument();
    expect(screen.getByText("@ 1.08455")).toBeInTheDocument();
  });

  it("refuses to submit a zero or non-numeric quantity", async () => {
    const user = userEvent.setup();
    render(<OrderTicket />);

    const qty = screen.getByLabelText("Quantity");
    await user.clear(qty);
    await user.type(qty, "0");

    expect(screen.getByRole("button", { name: /PLACE BUY ORDER/ })).toBeDisabled();
  });
});
