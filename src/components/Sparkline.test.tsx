import React from "react";
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Sparkline } from "./Sparkline";

describe("Sparkline", () => {
  it("renders an empty placeholder until there are two points", () => {
    const { container } = render(<Sparkline data={["1.1"]} isPositive />);
    expect(container.querySelector("svg")).toBeNull();
    expect(container.firstChild).toBeInstanceOf(HTMLElement);
  });

  it("plots every history point as a polyline", () => {
    const { container } = render(<Sparkline data={["1.0", "2.0", "1.5"]} isPositive={false} />);
    const points = container.querySelector("polyline")!.getAttribute("points")!.split(" ");
    expect(points).toHaveLength(3);
  });

  it("does not produce NaN coordinates when every price is equal", () => {
    const { container } = render(<Sparkline data={["5", "5", "5"]} isPositive />);
    expect(container.querySelector("polyline")!.getAttribute("points")).not.toContain("NaN");
  });
});
