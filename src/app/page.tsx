"use client";

import React, { useEffect, useRef } from "react";
import { useTickerStore } from "../store/ticker-store";
import { TradingWSClient } from "../lib/ws-client";
import { ConnectionBanner } from "../components/ConnectionBanner";
import { WatchlistRow } from "../components/WatchlistRow";
import { WatchlistManager } from "../components/WatchlistManager";
import { InteractiveChart } from "../components/InteractiveChart";
import { OrderTicket } from "../components/OrderTicket";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";

export default function TradingDashboardPage() {
  const watchlist = useTickerStore((state) => state.watchlist);
  const selectedSymbol = useTickerStore((state) => state.selectedSymbol);
  const setSelectedSymbol = useTickerStore((state) => state.setSelectedSymbol);
  const removeFromWatchlist = useTickerStore((state) => state.removeFromWatchlist);
  const reorderWatchlist = useTickerStore((state) => state.reorderWatchlist);
  const ingestTick = useTickerStore((state) => state.ingestTick);
  const initSnapshot = useTickerStore((state) => state.initSnapshot);
  const setConnectionStatus = useTickerStore((state) => state.setConnectionStatus);

  const clientRef = useRef<TradingWSClient | null>(null);

  useEffect(() => {
    const client = new TradingWSClient({
      url: WS_URL,
      onTick: ingestTick,
      onSnapshot: initSnapshot,
      onStatusChange: setConnectionStatus
    });

    clientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
    };
  }, [ingestTick, initSnapshot, setConnectionStatus]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <ConnectionBanner />

      <main className="flex-1 p-4 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Watchlist (7 cols on desktop) */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold font-mono tracking-wider text-zinc-400 uppercase">
              Watchlist ({watchlist.length} Active)
            </h2>
            <WatchlistManager />
          </div>

          <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/60 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900 text-[11px] font-mono text-zinc-400 uppercase">
                    <th scope="col" className="px-4 py-2.5">Symbol</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Bid</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Ask</th>
                    <th scope="col" className="px-3 py-2.5 text-right hidden md:table-cell">Spread</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Change</th>
                    <th scope="col" className="px-3 py-2.5 text-center hidden lg:table-cell">Trend</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {watchlist.map((sym, idx) => (
                    <WatchlistRow
                      key={sym}
                      symbol={sym}
                      index={idx}
                      isSelected={sym === selectedSymbol}
                      onSelect={setSelectedSymbol}
                      onRemove={removeFromWatchlist}
                      onMoveUp={(i) => reorderWatchlist(i, i - 1)}
                      onMoveDown={(i) => reorderWatchlist(i, i + 1)}
                      isFirst={idx === 0}
                      isLast={idx === watchlist.length - 1}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Chart & Order Ticket (5 cols on desktop) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <InteractiveChart />
          <OrderTicket />
        </div>
      </main>
    </div>
  );
}
