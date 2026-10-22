import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { WatchlistRow } from "./WatchlistRow";
import { useTickerStore } from "../store/ticker-store";
import type { InstrumentSummary } from "../types/trading";

const summary = (bid: string): InstrumentSummary => ({
  symbol: "EURUSD",
  name: "EUR / USD",
  type: "forex",
  decimals: 5,
  pipSize: "0.00010",
  bid,
  ask: "1.08415",
  spread: "0.00003",
  openPrice: "1.08400",
  changeAbs: "0.00012",
  changePercent: "+0.01%",
  isPositive: true,
  history: [bid],
  lastUpdated: 1,
  lastSeq: 1
});

const renderRow = (props: Partial<React.ComponentProps<typeof WatchlistRow>> = {}) => {
  const handlers = {
    onSelect: vi.fn(),
    onRemove: vi.fn(),
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn()
  };
  render(
    <table>
      <tbody>
        <WatchlistRow
          symbol="EURUSD"
          index={0}
          isSelected={false}
          isFirst={false}
          isLast={false}
          {...handlers}
          {...props}
        />
      </tbody>
    </table>
  );
  return handlers;
};

describe("WatchlistRow", () => {
  beforeEach(() => {
    useTickerStore.setState({ summaries: { EURUSD: summary("1.08412") } });
  });

  it("shows bid, ask and spread from the store", () => {
    renderRow();
    expect(screen.getByText("1.08412")).toBeInTheDocument();
    expect(screen.getByText("1.08415")).toBeInTheDocument();
    expect(screen.getByText("0.00003")).toBeInTheDocument();
  });

  it("selects the row on Enter and on Space", () => {
    const { onSelect } = renderRow();
    const row = screen.getByRole("row");
    fireEvent.keyDown(row, { key: "Enter" });
    fireEvent.keyDown(row, { key: " " });
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenCalledWith("EURUSD");
  });

  it("removes the symbol without also selecting the row", async () => {
    const user = userEvent.setup();
    const { onRemove, onSelect } = renderRow();
    await user.click(screen.getByRole("button", { name: "Remove EURUSD from watchlist" }));
    expect(onRemove).toHaveBeenCalledWith("EURUSD");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("announces the direction of a price change in text, not only in colour", () => {
    renderRow();
    act(() => {
      useTickerStore.setState({ summaries: { EURUSD: summary("1.08420") } });
    });
    expect(screen.getByText("▲")).toBeInTheDocument();
    expect(screen.getByText("Price up")).toBeInTheDocument();
  });

  it("marks a falling price as down", () => {
    renderRow();
    act(() => {
      useTickerStore.setState({ summaries: { EURUSD: summary("1.08400") } });
    });
    expect(screen.getByText("▼")).toBeInTheDocument();
    expect(screen.getByText("Price down")).toBeInTheDocument();
  });
});
