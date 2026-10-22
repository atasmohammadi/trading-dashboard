"use client";

import React, { useState, useMemo } from "react";
import { useTickerStore, DEFAULT_WATCHLIST } from "../store/ticker-store";
import { Plus, Search, RotateCcw } from "lucide-react";

export function WatchlistManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const symbolsList = useTickerStore((state) => state.symbolsList);
  const watchlist = useTickerStore((state) => state.watchlist);
  const addToWatchlist = useTickerStore((state) => state.addToWatchlist);
  const resetWatchlist = useTickerStore((state) => state.resetWatchlist);

  const availableSymbols = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return symbolsList.filter(
      (sym) => !watchlist.includes(sym) && sym.toLowerCase().includes(term)
    );
  }, [symbolsList, watchlist, searchTerm]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          Add Symbol
        </button>

        <button
          type="button"
          onClick={() => resetWatchlist(DEFAULT_WATCHLIST)}
          title="Reset to default watchlist"
          className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="sr-only">Reset Watchlist</span>
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50 p-3">
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" aria-hidden="true" />
            <input
              type="text"
              aria-label="Search instruments"
              placeholder={`Search ${symbolsList.length} instruments...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1">
            {availableSymbols.length === 0 ? (
              <p className="text-xs text-zinc-500 py-2 text-center">No matching instruments</p>
            ) : (
              availableSymbols.slice(0, 30).map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => addToWatchlist(sym)}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-zinc-800 text-xs font-mono text-zinc-200 flex justify-between items-center group"
                >
                  <span>{sym}</span>
                  <span className="text-zinc-500 group-hover:text-emerald-400 text-[11px]">+ Add</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
