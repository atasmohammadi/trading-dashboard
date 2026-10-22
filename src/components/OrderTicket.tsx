"use client";

import React, { useState, useCallback, useId } from "react";
import { useTickerStore } from "../store/ticker-store";
import { OrderSide, ExecutedOrder } from "../types/trading";
import { calculateEstimatedCost, checkSlippage, toDecimal } from "../lib/decimal-math";
import { ShieldAlert, CheckCircle2, Lock } from "lucide-react";

interface SlippageAlert {
  lockedPrice: string;
  currentPrice: string;
  diffPips: string;
  side: OrderSide;
  quantity: string;
}

// Accepts plain positive decimals such as "10", "0.5", "1.25". Anything else is invalid.
const isPositiveDecimal = (value: string) => /^\d+(\.\d+)?$/.test(value) && toDecimal(value).greaterThan(0);
const isNonNegativeDecimal = (value: string) => /^\d+(\.\d+)?$/.test(value);

export function OrderTicket() {
  const selectedSymbol = useTickerStore((state) => state.selectedSymbol);
  const summary = useTickerStore((state) =>
    selectedSymbol ? state.summaries[selectedSymbol] : null
  );
  const connectionStatus = useTickerStore((state) => state.connectionStatus);
  const formId = useId();

  // Local form state, isolated from the feed: typing never waits on a tick.
  const [side, setSide] = useState<OrderSide>("BUY");
  const [quantity, setQuantity] = useState("10");
  const [limitPrice, setLimitPrice] = useState(() =>
    summary ? (side === "BUY" ? summary.ask : summary.bid) : ""
  );
  const [tolerancePips, setTolerancePips] = useState("2.0");

  const [slippageModal, setSlippageModal] = useState<SlippageAlert | null>(null);
  const [recentOrders, setRecentOrders] = useState<ExecutedOrder[]>([]);

  // Prefill the limit price when the symbol or side changes (adjusting state during render, not in an effect)
  const [prevSelection, setPrevSelection] = useState<{ symbol?: string; side: OrderSide }>({
    symbol: summary?.symbol,
    side
  });
  if (summary && (prevSelection.symbol !== summary.symbol || prevSelection.side !== side)) {
    setPrevSelection({ symbol: summary.symbol, side });
    setLimitPrice(side === "BUY" ? summary.ask : summary.bid);
  }

  const isConnected = connectionStatus === "LIVE";
  const quantityValid = isPositiveDecimal(quantity);
  const priceValid = isPositiveDecimal(limitPrice);
  const toleranceValid = isNonNegativeDecimal(tolerancePips);
  const canSubmit = isConnected && quantityValid && priceValid && toleranceValid;
  const estimatedCost = quantityValid && priceValid ? calculateEstimatedCost(quantity, limitPrice, 2) : "0.00";

  const executeOrder = useCallback(
    (lockedPrice: string, executedPrice: string, diffPips: string) => {
      if (!summary) return;

      const order: ExecutedOrder = {
        id: crypto.randomUUID().slice(0, 8),
        symbol: summary.symbol,
        side,
        quantity,
        requestedPrice: lockedPrice,
        executedPrice,
        slippagePips: diffPips,
        estimatedCost: calculateEstimatedCost(quantity, executedPrice, 2),
        status: "FILLED",
        timestamp: Date.now()
      };

      setRecentOrders((prev) => [order, ...prev.slice(0, 9)]);
      setSlippageModal(null);
    },
    [summary, side, quantity]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary || !canSubmit) return;

    // 1. Price lock: the quote the trader sees in the form is the locked price
    const lockedPrice = limitPrice;
    const liveMarketPrice = side === "BUY" ? summary.ask : summary.bid;

    // 2. Check slippage tolerance against the live market
    const { exceeded, diffPips } = checkSlippage(lockedPrice, liveMarketPrice, summary.pipSize, tolerancePips);

    if (exceeded) {
      // Pause and ask for confirmation before anything is executed
      setSlippageModal({ lockedPrice, currentPrice: liveMarketPrice, diffPips, side, quantity });
      return;
    }

    // Within tolerance: the trader gets the price they were shown
    executeOrder(lockedPrice, lockedPrice, diffPips);
  };

  if (!summary) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 text-zinc-500 text-sm">
        Select an instrument from the watchlist to trade.
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
        <div>
          <h2 className="font-mono text-base font-bold text-zinc-100 flex items-center gap-2">
            <span>Order Ticket: {summary.symbol}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-sans">
              Quote Lock
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Market: Bid {summary.bid} / Ask {summary.ask}
          </p>
        </div>

        {!isConnected && (
          <span className="text-xs font-semibold px-2 py-1 bg-amber-950 text-amber-400 border border-amber-800/50 rounded flex items-center gap-1">
            <Lock className="w-3 h-3" aria-hidden="true" /> Trading Disabled (Stale)
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Buy / Sell Selector */}
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Order Side">
          <button
            type="button"
            role="radio"
            aria-checked={side === "BUY"}
            onClick={() => setSide("BUY")}
            className={`py-2 rounded text-xs font-bold font-mono transition ${
              side === "BUY"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/30"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            BUY (Ask: {summary.ask})
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={side === "SELL"}
            onClick={() => setSide("SELL")}
            className={`py-2 rounded text-xs font-bold font-mono transition ${
              side === "SELL"
                ? "bg-rose-600 text-white shadow-lg shadow-rose-900/30"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            SELL (Bid: {summary.bid})
          </button>
        </div>

        {/* Quantity & Limit Price Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${formId}-qty`} className="block text-xs font-medium text-zinc-400 mb-1">
              Quantity
            </label>
            <input
              id={`${formId}-qty`}
              type="text"
              inputMode="decimal"
              value={quantity}
              aria-invalid={!quantityValid}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 font-mono text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor={`${formId}-limit`} className="block text-xs font-medium text-zinc-400 mb-1">
              Limit Price (Locked)
            </label>
            <input
              id={`${formId}-limit`}
              type="text"
              inputMode="decimal"
              value={limitPrice}
              aria-invalid={!priceValid}
              onChange={(e) => setLimitPrice(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 font-mono text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Tolerance Input */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor={`${formId}-tol`} className="text-xs font-medium text-zinc-400">
              Slippage Tolerance (Pips)
            </label>
            <span className="text-[11px] text-zinc-500">Pip size: {summary.pipSize}</span>
          </div>
          <input
            id={`${formId}-tol`}
            type="text"
            inputMode="decimal"
            value={tolerancePips}
            aria-invalid={!toleranceValid}
            onChange={(e) => setTolerancePips(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 font-mono text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Estimated Cost Preview */}
        <div className="bg-zinc-950/60 p-3 rounded border border-zinc-800/60 flex justify-between items-center text-xs">
          <span className="text-zinc-400">Estimated Cost:</span>
          <span className="font-mono font-bold text-zinc-100 text-sm">${estimatedCost}</span>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full py-2.5 rounded font-mono font-bold text-sm tracking-wide transition ${
            !canSubmit
              ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              : side === "BUY"
              ? "bg-emerald-600 hover:bg-emerald-500 text-white"
              : "bg-rose-600 hover:bg-rose-500 text-white"
          }`}
        >
          {isConnected ? `PLACE ${side} ORDER` : "FEED DISCONNECTED"}
        </button>
      </form>

      {/* Slippage Tolerance Confirmation Modal */}
      {slippageModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            role="alertdialog"
            aria-labelledby={`${formId}-slip-title`}
            className="bg-zinc-900 border border-amber-600/80 rounded-xl max-w-md w-full p-5 shadow-2xl"
          >
            <div id={`${formId}-slip-title`} className="flex items-center gap-2 text-amber-400 font-bold mb-3">
              <ShieldAlert className="w-5 h-5" aria-hidden="true" />
              <span>Price Movement Exceeded Tolerance</span>
            </div>

            <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
              Market moved while placing your order.
              <br />
              Requested Quote: <strong className="font-mono text-zinc-100">{slippageModal.lockedPrice}</strong>
              <br />
              Current Live Price: <strong className="font-mono text-amber-400">{slippageModal.currentPrice}</strong>
              <br />
              Deviation: <strong className="font-mono text-rose-400">{slippageModal.diffPips} pips</strong> (Tolerance is {tolerancePips} pips).
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSlippageModal(null)}
                className="flex-1 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300"
              >
                Reject & Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  executeOrder(slippageModal.lockedPrice, slippageModal.currentPrice, slippageModal.diffPips)
                }
                className="flex-1 py-2 rounded bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white"
              >
                Accept New Price
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Executed Orders History */}
      {recentOrders.length > 0 && (
        <div className="mt-6 border-t border-zinc-800 pt-4">
          <h3 className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            Recent Executions
          </h3>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {recentOrders.map((ord) => (
              <div
                key={ord.id}
                className="bg-zinc-950/80 border border-zinc-800/80 rounded px-2.5 py-1.5 text-[11px] font-mono flex justify-between items-center"
              >
                <div>
                  <span className={`font-bold mr-1.5 ${ord.side === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>
                    {ord.side}
                  </span>
                  <span className="text-zinc-200">{ord.quantity} {ord.symbol}</span>
                  <span className="text-zinc-500 ml-1.5">@ {ord.executedPrice}</span>
                </div>
                <div className="text-right text-zinc-400">
                  <span>${ord.estimatedCost}</span>
                  {toDecimal(ord.slippagePips).greaterThan(0) && (
                    <span className="text-amber-500/80 ml-1">({ord.slippagePips}p)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
