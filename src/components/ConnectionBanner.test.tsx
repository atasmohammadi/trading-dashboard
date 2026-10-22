import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ConnectionBanner } from "./ConnectionBanner";
import { useTickerStore } from "../store/ticker-store";

describe("ConnectionBanner", () => {
  it("announces stale data in text and as a status region", () => {
    useTickerStore.setState({ connectionStatus: "STALE" });
    render(<ConnectionBanner />);
    expect(screen.getByRole("status")).toHaveTextContent("STALE DATA (DISCONNECTED)");
  });

  it("shows the live feed badge when connected", () => {
    useTickerStore.setState({ connectionStatus: "LIVE" });
    render(<ConnectionBanner />);
    expect(screen.getByText("LIVE FEED")).toBeInTheDocument();
  });
});
