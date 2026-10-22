import { describe, it, expect } from "vitest";
import {
  calculateSpread,
  calculateChange,
  calculateEstimatedCost,
  checkSlippage
} from "./decimal-math";

describe("Precision Financial Decimal Math", () => {
  it("avoids floating-point errors when calculating spread", () => {
    // In IEEE-754: 1.08415 - 1.08412 = 0.0000300000000000078
    const spread = calculateSpread("1.08415", "1.08412", 5);
    expect(spread).toBe("0.00003");
  });

  it("calculates estimated cost accurately for high quantities", () => {
    const cost = calculateEstimatedCost("150.5", "68450.25", 2);
    expect(cost).toBe("10301762.63");
  });

  it("calculates percentage change correctly", () => {
    const res = calculateChange("105.00", "100.00");
    expect(res.changeAbs).toBe("5.0000");
    expect(res.changePercent).toBe("+5.00%");
    expect(res.isPositive).toBe(true);
  });

  it("detects slippage exceeding tolerance", () => {
    // Locked at 1.08412, current is 1.08442, pipSize is 0.00010 (diff = 3.0 pips)
    // Tolerance is 2.0 pips -> exceeded!
    const result = checkSlippage("1.08412", "1.08442", "0.00010", "2.0");
    expect(result.exceeded).toBe(true);
    expect(result.diffPips).toBe("3.0");
  });

  it("allows price movement within tolerance", () => {
    // Diff is 1.0 pip, tolerance is 2.0 pips -> not exceeded
    const result = checkSlippage("1.08412", "1.08422", "0.00010", "2.0");
    expect(result.exceeded).toBe(false);
    expect(result.diffPips).toBe("1.0");
  });

  it("treats malformed input as zero instead of NaN", () => {
    expect(calculateEstimatedCost("abc", "1.5", 2)).toBe("0.00");
    expect(calculateSpread("", "", 5)).toBe("0.00000");
  });

  it("does not exceed tolerance when the price is unchanged", () => {
    const result = checkSlippage("1.08412", "1.08412", "0.00010", "0");
    expect(result.exceeded).toBe(false);
    expect(result.diffPips).toBe("0.0");
  });
});
