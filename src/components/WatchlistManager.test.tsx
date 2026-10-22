import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import { WatchlistManager } from "./WatchlistManager";
import { useTickerStore, DEFAULT_WATCHLIST } from "../store/ticker-store";

describe("WatchlistManager", () => {
  beforeEach(() => {
    localStorage.clear();
    useTickerStore.setState({
      symbolsList: ["EURUSD", "GBPUSD", "GER40", "XAUUSD"],
      watchlist: ["EURUSD"]
    });
  });

  it("lists only instruments that are not already watched and match the search", async () => {
    const user = userEvent.setup();
    render(<WatchlistManager />);
    await user.click(screen.getByRole("button", { name: /add symbol/i }));
    await user.type(screen.getByPlaceholderText(/search/i), "g");

    expect(screen.getByRole("button", { name: /GBPUSD/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /GER40/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^EURUSD/ })).toBeNull();
  });

  it("adds the chosen instrument to the watchlist", async () => {
    const user = userEvent.setup();
    render(<WatchlistManager />);
    await user.click(screen.getByRole("button", { name: /add symbol/i }));
    await user.click(screen.getByRole("button", { name: /XAUUSD/ }));

    expect(useTickerStore.getState().watchlist).toEqual(["EURUSD", "XAUUSD"]);
  });

  it("restores the default watchlist on reset", async () => {
    const user = userEvent.setup();
    render(<WatchlistManager />);
    await user.click(screen.getByRole("button", { name: /reset watchlist/i }));

    expect(useTickerStore.getState().watchlist).toEqual(DEFAULT_WATCHLIST);
  });
});
