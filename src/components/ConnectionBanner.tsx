"use client";

import React from "react";
import { useTickerStore } from "../store/ticker-store";
import { Wifi, WifiOff, AlertTriangle, RefreshCw } from "lucide-react";

export function ConnectionBanner() {
  const status = useTickerStore((state) => state.connectionStatus);
  const tickCount = useTickerStore((state) => state.tickCount);

  const getStatusBadge = () => {
    switch (status) {
      case "LIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
            <Wifi className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            LIVE FEED
          </span>
        );
      case "STALE":
        return (
          <span
            role="status"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950 text-amber-400 border border-amber-800"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
            STALE DATA (DISCONNECTED)
          </span>
        );
      case "RECONNECTING":
        return (
          <span
            role="status"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-950 text-blue-400 border border-blue-800"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-400 motion-safe:animate-spin" aria-hidden="true" />
            RECONNECTING...
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400">
            <WifiOff className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex items-center justify-between py-2 px-4 bg-zinc-950 border-b border-zinc-800">
      <div className="flex items-center gap-3">
        <h1 className="font-mono font-bold text-sm text-zinc-100 tracking-wider">
          ALTI-TRADE // REAL-TIME DESK
        </h1>
        {getStatusBadge()}
      </div>

      <div className="text-xs font-mono text-zinc-400 hidden sm:flex items-center gap-3">
        <span>Ticks Ingested: <strong className="text-zinc-200">{tickCount.toLocaleString()}</strong></span>
      </div>
    </div>
  );
}
