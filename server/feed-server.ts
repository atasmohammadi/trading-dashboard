import { WebSocketServer, WebSocket } from "ws";
import { generate200Instruments } from "./instruments-data";
import Decimal from "decimal.js-light";

const PORT = 3001;
const TICKS_PER_SECOND = parseInt(process.env.TICK_RATE || "400", 10);
const SIMULATE_DROPS = process.env.SIMULATE_DROPS === "true";
const OUT_OF_ORDER_RATE = parseFloat(process.env.OUT_OF_ORDER_RATE || "0.02"); // 2% out-of-order ticks

const instruments = generate200Instruments();
console.log(`[Feed Server] Loaded ${instruments.length} instruments.`);

// Current price state in memory
interface InstrumentRuntime {
  bid: Decimal;
  ask: Decimal;
  spread: Decimal;
  seq: number;
}

const state = new Map<string, InstrumentRuntime>();

for (const inst of instruments) {
  const base = new Decimal(inst.basePrice);
  const spread = base.times("0.00015"); // 1.5 pips spread
  state.set(inst.symbol, {
    bid: base,
    ask: base.plus(spread),
    spread,
    seq: 1000 + Math.floor(Math.random() * 500)
  });
}

const wss = new WebSocketServer({ port: PORT });
console.log(`[Feed Server] WebSocket server listening on ws://localhost:${PORT}`);

wss.on("connection", (ws: WebSocket) => {
  console.log(`[Feed Server] Client connected. Active clients: ${wss.clients.size}`);

  // Send initial snapshot of all 200 instruments so client has baseline
  const snapshot = instruments.map((inst) => {
    const s = state.get(inst.symbol)!;
    return {
      symbol: inst.symbol,
      bid: s.bid.toFixed(inst.decimals),
      ask: s.ask.toFixed(inst.decimals),
      ts: Date.now(),
      seq: s.seq
    };
  });

  ws.send(JSON.stringify({ type: "SNAPSHOT", data: snapshot }));

  ws.on("close", () => {
    console.log(`[Feed Server] Client disconnected. Remaining: ${wss.clients.size}`);
  });
});

// Periodic price tick generator at 300-500 ticks/sec
const intervalMs = Math.max(2, Math.floor(1000 / TICKS_PER_SECOND));

setInterval(() => {
  if (wss.clients.size === 0) return;

  // Pick a random instrument
  const idx = Math.floor(Math.random() * instruments.length);
  const inst = instruments[idx];
  const s = state.get(inst.symbol)!;

  // Random walk delta (-0.05% to +0.05%)
  const percentDelta = (Math.random() - 0.499) * 0.0008;
  const newBid = s.bid.times(new Decimal(1).plus(percentDelta));
  const newAsk = newBid.plus(s.spread);

  s.bid = newBid;
  s.ask = newAsk;
  s.seq += 1;

  // Simulate occasional out-of-order sequence (older seq)
  let emissionSeq = s.seq;
  if (Math.random() < OUT_OF_ORDER_RATE) {
    emissionSeq = s.seq - (1 + Math.floor(Math.random() * 3)); // Decremented seq!
  }

  const tick = {
    symbol: inst.symbol,
    bid: s.bid.toFixed(inst.decimals),
    ask: s.ask.toFixed(inst.decimals),
    ts: Date.now(),
    seq: emissionSeq
  };

  const payload = JSON.stringify(tick);

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}, intervalMs);

// Optional connection drop simulation every 60 seconds if SIMULATE_DROPS=true
if (SIMULATE_DROPS) {
  setInterval(() => {
    console.log("[Feed Server] Simulating random connection drop to test client backoff...");
    for (const client of wss.clients) {
      client.terminate();
    }
  }, 60000);
}
