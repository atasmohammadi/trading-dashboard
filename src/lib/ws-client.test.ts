import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TradingWSClient } from "./ws-client";
import type { ConnectionStatus, PriceTick } from "../types/trading";

class FakeSocket {
  static instances: FakeSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  readyState = 0;
  close = vi.fn();

  constructor(public url: string) {
    FakeSocket.instances.push(this);
  }
}

describe("TradingWSClient", () => {
  let statuses: ConnectionStatus[];
  let ticks: PriceTick[];
  let snapshots: unknown[];

  const make = () =>
    new TradingWSClient({
      url: "ws://test",
      onTick: (t) => ticks.push(t),
      onSnapshot: (s) => snapshots.push(s),
      onStatusChange: (s) => statuses.push(s)
    });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    FakeSocket.instances = [];
    statuses = [];
    ticks = [];
    snapshots = [];
    vi.stubGlobal("WebSocket", FakeSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reports LIVE once the socket opens", () => {
    make().connect();
    FakeSocket.instances[0].onopen?.();

    expect(statuses).toEqual(["CONNECTING", "LIVE"]);
  });

  it("forwards ticks and snapshots and survives malformed frames", () => {
    make().connect();
    const socket = FakeSocket.instances[0];
    socket.onmessage?.({ data: '{"symbol":"EURUSD","bid":"1.08412","ask":"1.08415","ts":1,"seq":5}' });
    socket.onmessage?.({ data: '{"type":"SNAPSHOT","data":[]}' });
    socket.onmessage?.({ data: "not json" });

    expect(ticks).toHaveLength(1);
    expect(snapshots).toEqual([[]]);
  });

  it("marks data STALE on close and reconnects after 1s, then 2s", () => {
    make().connect();
    FakeSocket.instances[0].onclose?.();
    expect(statuses.at(-1)).toBe("RECONNECTING");

    vi.advanceTimersByTime(999);
    expect(FakeSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeSocket.instances).toHaveLength(2);

    FakeSocket.instances[1].onclose?.();
    vi.advanceTimersByTime(1999);
    expect(FakeSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(FakeSocket.instances).toHaveLength(3);
    expect(statuses).toContain("STALE");
  });

  it("caps the reconnect delay at 16s", () => {
    const client = make();
    client.connect();
    for (let i = 0; i < 10; i++) {
      FakeSocket.instances.at(-1)!.onclose?.();
      vi.advanceTimersByTime(16_000);
    }
    const before = FakeSocket.instances.length;
    FakeSocket.instances.at(-1)!.onclose?.();
    vi.advanceTimersByTime(16_000);
    expect(FakeSocket.instances.length).toBe(before + 1);
  });

  it("stops reconnecting after disconnect()", () => {
    const client = make();
    client.connect();
    FakeSocket.instances[0].onclose?.();
    client.disconnect();
    vi.advanceTimersByTime(60_000);

    expect(FakeSocket.instances).toHaveLength(1);
    expect(statuses.at(-1)).toBe("DISCONNECTED");
  });
});
