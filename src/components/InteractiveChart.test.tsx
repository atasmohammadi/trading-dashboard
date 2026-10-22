import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { InteractiveChart } from "./InteractiveChart";
import { useTickerStore } from "../store/ticker-store";

describe("InteractiveChart", () => {
  beforeEach(() => {
    useTickerStore.setState({ selectedSymbol: null, summaries: {} });
  });

  it("asks the user to select an instrument when nothing is selected", () => {
    render(<InteractiveChart />);
    expect(screen.getByText("Select an instrument to view chart")).toBeInTheDocument();
  });

  it("describes the selected symbol's price range for screen readers", () => {
    useTickerStore.setState({
      selectedSymbol: "EURUSD",
      summaries: {
        EURUSD: {
          symbol: "EURUSD", name: "EUR / USD", type: "forex", decimals: 5, pipSize: "0.00010",
          bid: "1.08420", ask: "1.08423", spread: "0.00003", openPrice: "1.08400",
          changeAbs: "0.00020", changePercent: "+0.02%", isPositive: true,
          history: ["1.08400", "1.08420"], lastUpdated: 1, lastSeq: 1
        }
      }
    });
    render(<InteractiveChart />);
    expect(screen.getByRole("img", { name: /EURUSD price history, low 1\.08400, high 1\.08420/ })).toBeInTheDocument();
  });
});
