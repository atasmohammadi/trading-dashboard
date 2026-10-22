"use client";

import React, { memo } from "react";
import { useTickerStore } from "../store/ticker-store";

export const InteractiveChart = memo(function InteractiveChart() {
  const selectedSymbol = useTickerStore((state) => state.selectedSymbol);
  const summary = useTickerStore((state) =>
    selectedSymbol ? state.summaries[selectedSymbol] : null
  );

  if (!summary) {
    return (
      <div className="h-48 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 text-sm">
        Select an instrument to view chart
      </div>
    );
  }

  // Display-only: these floats position the SVG and never feed a price or an order.
  const points = summary.history.map((h) => parseFloat(h));
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 0.0001;

  const width = 600;
  const height = 140;

  const polylineCoords = points
    .map((p, i) => {
      const x = (i / Math.max(1, points.length - 1)) * (width - 20) + 10;
      const y = height - ((p - min) / range) * (height - 24) - 12;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <section
      aria-label={`Chart for ${summary.symbol}`}
      className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-mono text-lg font-bold text-zinc-100">{summary.symbol}</h3>
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase">
              {summary.type}
            </span>
          </div>
          <p className="text-xs text-zinc-400">Live Tick Stream (Last 20 updates)</p>
        </div>

        <div className="text-right">
          <div className="font-mono text-xl font-bold text-zinc-100">{summary.bid}</div>
          <div className={`text-xs font-semibold ${summary.isPositive ? "text-emerald-400" : "text-rose-400"}`}>
            {summary.changePercent} ({summary.changeAbs})
          </div>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${summary.symbol} price history, low ${min.toFixed(summary.decimals)}, high ${max.toFixed(summary.decimals)}`}
          className="w-full h-36 bg-zinc-950/60 rounded border border-zinc-800/60"
        >
          {/* Subtle grid lines */}
          <line x1="0" y1="35" x2={width} y2="35" stroke="#27272a" strokeDasharray="4 4" />
          <line x1="0" y1="70" x2={width} y2="70" stroke="#27272a" strokeDasharray="4 4" />
          <line x1="0" y1="105" x2={width} y2="105" stroke="#27272a" strokeDasharray="4 4" />

          {/* Price line */}
          <polyline
            fill="none"
            stroke={summary.isPositive ? "#10b981" : "#f43f5e"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polylineCoords}
          />
        </svg>
      </div>

      <div className="flex justify-between items-center text-[11px] text-zinc-500 mt-2 font-mono">
        <span>Low: {min.toFixed(summary.decimals)}</span>
        <span>Spread: {summary.spread}</span>
        <span>High: {max.toFixed(summary.decimals)}</span>
      </div>
    </section>
  );
});
