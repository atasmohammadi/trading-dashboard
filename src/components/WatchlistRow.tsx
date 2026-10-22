"use client";

import React, { memo, useRef, useEffect, useState } from "react";
import { useTickerStore } from "../store/ticker-store";
import { Sparkline } from "./Sparkline";
import { ArrowUp, ArrowDown, X, ChevronUp, ChevronDown } from "lucide-react";
import { toDecimal } from "../lib/decimal-math";

interface WatchlistRowProps {
  symbol: string;
  index: number;
  isSelected: boolean;
  onSelect: (symbol: string) => void;
  onRemove: (symbol: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  isFirst: boolean;
  isLast: boolean;
}

type Direction = "up" | "down" | null;

export const WatchlistRow = memo(function WatchlistRow({
  symbol,
  index,
  isSelected,
  onSelect,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast
}: WatchlistRowProps) {
  // Subscribe strictly to this symbol's summary
  const summary = useTickerStore((state) => state.summaries[symbol]);
  const prevBidRef = useRef<string | null>(null);
  const [direction, setDirection] = useState<Direction>(null);

  useEffect(() => {
    if (!summary) return;

    const prev = prevBidRef.current;
    prevBidRef.current = summary.bid;
    if (prev === null || prev === summary.bid) return;

    // Decimal comparison: no float conversion on prices
    const nextDirection: Direction = toDecimal(summary.bid).greaterThan(toDecimal(prev)) ? "up" : "down";
    setDirection(nextDirection);

    const timer = setTimeout(() => setDirection(null), 400);
    return () => clearTimeout(timer);
  }, [summary]);

  if (!summary) {
    return (
      <tr className="border-b border-zinc-800 text-zinc-500 text-sm">
        <td colSpan={7} className="px-4 py-3">Loading {symbol}...</td>
      </tr>
    );
  }

  // Colour is a second cue only: the arrow and the sr-only text carry the direction.
  // The background flash is skipped entirely under prefers-reduced-motion.
  const flashClass =
    direction === "up"
      ? "motion-safe:bg-emerald-500/20 text-emerald-400"
      : direction === "down"
        ? "motion-safe:bg-rose-500/20 text-rose-400"
        : "";

  return (
    <tr
      onClick={() => onSelect(symbol)}
      tabIndex={0}
      role="row"
      aria-selected={isSelected}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(symbol);
        }
      }}
      className={`group border-b border-zinc-800/80 cursor-pointer transition-colors outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 ${
        isSelected ? "bg-indigo-950/40 border-indigo-700/60" : "hover:bg-zinc-800/40"
      }`}
    >
      {/* Symbol & Name */}
      <td className="px-4 py-2.5 font-medium text-zinc-100 flex items-center gap-2">
        <span className="font-mono text-sm tracking-wide">{summary.symbol}</span>
        <span className="text-xs text-zinc-400 uppercase hidden sm:inline">{summary.type}</span>
      </td>

      {/* Bid */}
      <td className="px-3 py-2.5 text-right font-mono text-sm">
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded transition-all duration-200 motion-reduce:transition-none ${flashClass}`}
        >
          {direction === "up" && <span aria-hidden="true">▲</span>}
          {direction === "down" && <span aria-hidden="true">▼</span>}
          {direction && <span className="sr-only">{direction === "up" ? "Price up" : "Price down"}</span>}
          {summary.bid}
        </span>
      </td>

      {/* Ask */}
      <td className="px-3 py-2.5 text-right font-mono text-sm text-zinc-300">
        {summary.ask}
      </td>

      {/* Spread */}
      <td className="px-3 py-2.5 text-right font-mono text-xs text-zinc-400 hidden md:table-cell">
        {summary.spread}
      </td>

      {/* Change */}
      <td className="px-3 py-2.5 text-right font-mono text-sm">
        <span
          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-semibold ${
            summary.isPositive
              ? "text-emerald-400 bg-emerald-950/40 border border-emerald-800/30"
              : "text-rose-400 bg-rose-950/40 border border-rose-800/30"
          }`}
        >
          {summary.isPositive ? (
            <ArrowUp className="w-3 h-3 text-emerald-400" aria-hidden="true" />
          ) : (
            <ArrowDown className="w-3 h-3 text-rose-400" aria-hidden="true" />
          )}
          <span className="sr-only">{summary.isPositive ? "Up" : "Down"}</span>
          {summary.changePercent}
        </span>
      </td>

      {/* Sparkline */}
      <td className="px-3 py-2.5 text-center hidden lg:table-cell w-28">
        <Sparkline data={summary.history} isPositive={summary.isPositive} />
      </td>

      {/* Actions (Reorder & Remove) */}
      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            disabled={isFirst}
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp(index);
            }}
            aria-label={`Move ${symbol} up`}
            className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-20 rounded"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown(index);
            }}
            aria-label={`Move ${symbol} down`}
            className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-20 rounded"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(symbol);
            }}
            aria-label={`Remove ${symbol} from watchlist`}
            className="p-1 text-zinc-500 hover:text-rose-400 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
});
