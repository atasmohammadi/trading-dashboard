import { create } from "zustand";
import { PriceTick, InstrumentSummary, ConnectionStatus, SnapshotEntry } from "../types/trading";
import { calculateSpread, calculateChange } from "../lib/decimal-math";

interface TickerState {
  summaries: Record<string, InstrumentSummary>;
  symbolsList: string[]; // Master list of symbols
  watchlist: string[];   // User's active ordered symbols
  selectedSymbol: string | null;
  connectionStatus: ConnectionStatus;
  tickCount: number;
  lastTickTime: number | null;

  // Actions
  initSnapshot: (entries: SnapshotEntry[]) => void;
  ingestTick: (tick: PriceTick) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setSelectedSymbol: (symbol: string) => void;
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  reorderWatchlist: (fromIndex: number, toIndex: number) => void;
  resetWatchlist: (symbols: string[]) => void;
}

const STORAGE_KEY = "trading_watchlist_v1";

export const DEFAULT_WATCHLIST = [
  "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "BTCUSD",
  "ETHUSD", "SOLUSD", "XAUUSD", "USOIL", "US500", "US100"
];

// Ingestion buffer running outside React render cycle
const pendingTicks = new Map<string, PriceTick>();
let rAFScheduled = false;

function loadWatchlist(): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((s) => typeof s === "string") ? parsed : null;
  } catch {
    return null;
  }
}

function saveWatchlist(symbols: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
  } catch {
    // Storage full or blocked: the in-memory watchlist still works for this session.
  }
}

export const useTickerStore = create<TickerState>((set, get) => ({
  summaries: {},
  symbolsList: [],
  watchlist: DEFAULT_WATCHLIST,
  selectedSymbol: "EURUSD",
  connectionStatus: "CONNECTING",
  tickCount: 0,
  lastTickTime: null,

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),

  initSnapshot: (entries) => {
    const summaries: Record<string, InstrumentSummary> = {};
    const symbolsList: string[] = [];

    // A reconnect delivers a fresh snapshot. Keep the session open price and sparkline history
    // so "change since open" does not reset every time the socket drops.
    const previous = get().summaries;

    for (const e of entries) {
      symbolsList.push(e.symbol);
      const prev = previous[e.symbol];
      const openPrice = prev?.openPrice ?? e.bid;
      const history = prev ? [...prev.history.slice(-19), e.bid] : [e.bid];
      const { changeAbs, changePercent, isPositive } = calculateChange(e.bid, openPrice);
      summaries[e.symbol] = {
        symbol: e.symbol,
        name: e.name,
        type: e.type,
        decimals: e.decimals,
        pipSize: e.pipSize,
        bid: e.bid,
        ask: e.ask,
        spread: calculateSpread(e.ask, e.bid, e.decimals),
        openPrice,
        changeAbs,
        changePercent,
        isPositive,
        history,
        lastUpdated: e.ts,
        lastSeq: e.seq
      };
    }

    // Keep only symbols this feed actually serves, so a stale stored entry never shows as "Loading..." forever
    const known = (symbols: string[]) => symbols.filter((s) => summaries[s]);
    const watchlist = known(loadWatchlist() ?? DEFAULT_WATCHLIST);
    const effectiveWatchlist = watchlist.length > 0 ? watchlist : known(DEFAULT_WATCHLIST);

    set({
      summaries,
      symbolsList,
      watchlist: effectiveWatchlist,
      selectedSymbol: effectiveWatchlist[0] || symbolsList[0] || null
    });
  },

  ingestTick: (tick: PriceTick) => {
    // 1. Sequence filter: compare against the newest seq already accepted,
    //    either committed to the store or still waiting in this frame's buffer.
    const pending = pendingTicks.get(tick.symbol);
    const lastSeq = pending?.seq ?? get().summaries[tick.symbol]?.lastSeq;
    if (lastSeq !== undefined && tick.seq <= lastSeq) {
      return; // Ignore older or duplicate seq
    }

    // 2. Queue into mutable Ingestion Buffer (latest accepted tick per symbol wins)
    pendingTicks.set(tick.symbol, tick);

    // 3. Schedule single requestAnimationFrame batch
    if (!rAFScheduled) {
      rAFScheduled = true;
      requestAnimationFrame(() => {
        rAFScheduled = false;
        if (pendingTicks.size === 0) return;

        set((state) => {
          const updated = { ...state.summaries };
          let count = state.tickCount;

          for (const [sym, t] of pendingTicks.entries()) {
            const prev = updated[sym];
            if (!prev) continue;

            const { changeAbs, changePercent, isPositive } = calculateChange(t.bid, prev.openPrice);
            const history = prev.history.length >= 20
              ? [...prev.history.slice(1), t.bid]
              : [...prev.history, t.bid];

            updated[sym] = {
              ...prev,
              bid: t.bid,
              ask: t.ask,
              spread: calculateSpread(t.ask, t.bid, prev.decimals),
              changeAbs,
              changePercent,
              isPositive,
              history,
              lastUpdated: t.ts,
              lastSeq: t.seq
            };
            count++;
          }

          pendingTicks.clear();

          return {
            summaries: updated,
            tickCount: count,
            lastTickTime: Date.now()
          };
        });
      });
    }
  },

  addToWatchlist: (symbol) => {
    set((state) => {
      if (state.watchlist.includes(symbol)) return state;
      const next = [...state.watchlist, symbol];
      saveWatchlist(next);
      return { watchlist: next };
    });
  },

  removeFromWatchlist: (symbol) => {
    set((state) => {
      const next = state.watchlist.filter((s) => s !== symbol);
      saveWatchlist(next);
      return {
        watchlist: next,
        selectedSymbol: state.selectedSymbol === symbol ? next[0] || null : state.selectedSymbol
      };
    });
  },

  reorderWatchlist: (fromIndex, toIndex) => {
    set((state) => {
      const items = [...state.watchlist];
      const [moved] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, moved);
      saveWatchlist(items);
      return { watchlist: items };
    });
  },

  resetWatchlist: (symbols) => {
    saveWatchlist(symbols);
    set({ watchlist: symbols, selectedSymbol: symbols[0] || null });
  }
}));
