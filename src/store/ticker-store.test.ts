import { describe, it, expect, beforeEach } from "vitest";
import { useTickerStore, DEFAULT_WATCHLIST } from "./ticker-store";
import type { SnapshotEntry } from "../types/trading";

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const entry = (symbol: string, bid: string, ask: string, seq: number): SnapshotEntry => ({
  symbol,
  bid,
  ask,
  ts: 1,
  seq,
  name: symbol,
  type: "forex",
  decimals: 5,
  pipSize: "0.00010"
});

describe("ticker store", () => {
  beforeEach(() => {
    localStorage.clear();
    useTickerStore.setState({ summaries: {}, symbolsList: [], watchlist: DEFAULT_WATCHLIST, selectedSymbol: null });
    useTickerStore.getState().initSnapshot([
      entry("EURUSD", "1.08412", "1.08415", 100),
      entry("GBPUSD", "1.29500", "1.29503", 100),
      entry("USDJPY", "152.400", "152.402", 100)
    ]);
  });

  it("loads summaries with instrument metadata from the snapshot", () => {
    const summary = useTickerStore.getState().summaries["EURUSD"];
    expect(summary.type).toBe("forex");
    expect(summary.decimals).toBe(5);
    expect(summary.spread).toBe("0.00003");
    expect(summary.openPrice).toBe("1.08412");
  });

  it("keeps the session open price and history when the feed reconnects", async () => {
    const store = useTickerStore.getState();
    store.ingestTick({ symbol: "EURUSD", bid: "1.08420", ask: "1.08423", ts: 2, seq: 101 });
    await nextFrame();

    store.initSnapshot([entry("EURUSD", "1.08500", "1.08503", 500)]);

    const summary = useTickerStore.getState().summaries["EURUSD"];
    expect(summary.openPrice).toBe("1.08412");
    expect(summary.history).toEqual(["1.08412", "1.08420", "1.08500"]);
    expect(summary.changePercent).not.toBe("0.00%");
  });

  it("drops a tick whose seq is not newer than the last committed seq", async () => {
    useTickerStore.getState().ingestTick({ symbol: "EURUSD", bid: "1.08420", ask: "1.08423", ts: 2, seq: 101 });
    await nextFrame();
    useTickerStore.getState().ingestTick({ symbol: "EURUSD", bid: "1.08500", ask: "1.08503", ts: 3, seq: 100 });
    await nextFrame();

    expect(useTickerStore.getState().summaries["EURUSD"].bid).toBe("1.08420");
  });

  it("drops an out-of-order tick that arrives in the same frame as a newer one", async () => {
    const store = useTickerStore.getState();
    store.ingestTick({ symbol: "EURUSD", bid: "1.08420", ask: "1.08423", ts: 2, seq: 102 });
    store.ingestTick({ symbol: "EURUSD", bid: "1.08410", ask: "1.08413", ts: 3, seq: 101 });
    await nextFrame();

    expect(useTickerStore.getState().summaries["EURUSD"].bid).toBe("1.08420");
    expect(useTickerStore.getState().summaries["EURUSD"].lastSeq).toBe(102);
  });

  it("batches several ticks for one symbol into a single committed update", async () => {
    const store = useTickerStore.getState();
    store.ingestTick({ symbol: "GBPUSD", bid: "1.29510", ask: "1.29513", ts: 2, seq: 101 });
    store.ingestTick({ symbol: "GBPUSD", bid: "1.29520", ask: "1.29523", ts: 3, seq: 102 });
    await nextFrame();

    const summary = useTickerStore.getState().summaries["GBPUSD"];
    expect(summary.bid).toBe("1.29520");
    expect(summary.history).toEqual(["1.29500", "1.29520"]);
  });

  it("persists added symbols to localStorage", () => {
    useTickerStore.getState().resetWatchlist(["EURUSD"]);
    useTickerStore.getState().addToWatchlist("USDJPY");
    expect(useTickerStore.getState().watchlist).toEqual(["EURUSD", "USDJPY"]);
    expect(JSON.parse(localStorage.getItem("trading_watchlist_v1")!)).toContain("USDJPY");
  });

  it("reorders the watchlist and persists the new order", () => {
    useTickerStore.getState().resetWatchlist(["EURUSD", "GBPUSD", "USDJPY"]);
    useTickerStore.getState().reorderWatchlist(0, 2);

    expect(useTickerStore.getState().watchlist).toEqual(["GBPUSD", "USDJPY", "EURUSD"]);
    expect(JSON.parse(localStorage.getItem("trading_watchlist_v1")!)).toEqual(["GBPUSD", "USDJPY", "EURUSD"]);
  });

  it("moves the selection when the selected symbol is removed", () => {
    useTickerStore.getState().resetWatchlist(["EURUSD", "GBPUSD"]);
    useTickerStore.getState().setSelectedSymbol("EURUSD");
    useTickerStore.getState().removeFromWatchlist("EURUSD");

    expect(useTickerStore.getState().watchlist).toEqual(["GBPUSD"]);
    expect(useTickerStore.getState().selectedSymbol).toBe("GBPUSD");
  });

  it("falls back to the default watchlist when stored data is corrupt", () => {
    localStorage.setItem("trading_watchlist_v1", "{not json");
    useTickerStore.getState().initSnapshot([entry("EURUSD", "1.08412", "1.08415", 100)]);

    expect(useTickerStore.getState().watchlist).toEqual(["EURUSD"]);
  });
});
