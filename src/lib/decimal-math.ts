import Decimal from "decimal.js-light";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export function toDecimal(val: string | number | Decimal): Decimal {
  try {
    return new Decimal(val);
  } catch {
    return new Decimal(0);
  }
}

/**
 * Calculates spread in decimal string
 */
export function calculateSpread(ask: string, bid: string, decimals: number): string {
  const a = toDecimal(ask);
  const b = toDecimal(bid);
  return a.minus(b).toFixed(decimals);
}

/**
 * Calculates absolute and percentage change from open price
 */
export function calculateChange(currentPrice: string, openPrice: string) {
  const curr = toDecimal(currentPrice);
  const open = toDecimal(openPrice);
  if (open.isZero()) {
    return { changeAbs: "0.00", changePercent: "0.00%", isPositive: true };
  }

  const diff = curr.minus(open);
  const pct = diff.dividedBy(open).times(100);

  const isPositive = !diff.isNegative();
  return {
    changeAbs: diff.toFixed(4),
    changePercent: `${isPositive ? "+" : ""}${pct.toFixed(2)}%`,
    isPositive
  };
}

/**
 * Calculates total estimated cost: Quantity * Price
 */
export function calculateEstimatedCost(quantity: string, price: string, decimals = 2): string {
  const q = toDecimal(quantity);
  const p = toDecimal(price);
  return q.times(p).toFixed(decimals);
}

/**
 * Checks whether price movement exceeds the user-configured pip tolerance.
 * Returns { exceeded: boolean, diffPips: string }
 */
export function checkSlippage(
  lockedPrice: string,
  currentPrice: string,
  pipSize: string,
  tolerancePips: string
): { exceeded: boolean; diffPips: string; rawDiff: string } {
  const locked = toDecimal(lockedPrice);
  const curr = toDecimal(currentPrice);
  const pip = toDecimal(pipSize);
  const tol = toDecimal(tolerancePips);

  const rawDiff = curr.minus(locked).abs();
  const diffInPips = pip.isZero() ? new Decimal(0) : rawDiff.dividedBy(pip);

  const exceeded = diffInPips.greaterThan(tol);

  return {
    exceeded,
    diffPips: diffInPips.toFixed(1),
    rawDiff: rawDiff.toFixed(5)
  };
}
