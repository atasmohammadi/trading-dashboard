import React, { memo } from "react";

interface SparklineProps {
  data: string[];
  isPositive: boolean;
  width?: number;
  height?: number;
}

export const Sparkline = memo(function Sparkline({
  data,
  isPositive,
  width = 90,
  height = 24
}: SparklineProps) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} className="bg-zinc-800/20 rounded" />;
  }

  // Numbers here only position pixels; they never feed back into any price or order value.
  const numbers = data.map((d) => parseFloat(d));
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const range = max - min || 1;

  // Build SVG path points
  const points = numbers
    .map((val, idx) => {
      const x = (idx / (numbers.length - 1)) * (width - 4) + 2;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const strokeColor = isPositive ? "#34d399" : "#f87171"; // emerald-400 or rose-400

  return (
    <svg
      width={width}
      height={height}
      className="overflow-visible inline-block align-middle"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
});
