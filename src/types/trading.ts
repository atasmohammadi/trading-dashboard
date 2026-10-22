export type InstrumentType = "forex" | "crypto" | "commodity" | "index";

export interface Instrument {
  symbol: string;
  name: string;
  type: InstrumentType;
  decimals: number;
  pipSize: string; // e.g. "0.00010" for EURUSD, "0.01" for USDJPY
  basePrice: string;
}

export interface PriceTick {
  symbol: string;
  bid: string;
  ask: string;
  ts: number;
  seq: number;
}

export interface InstrumentSummary {
  symbol: string;
  name: string;
  type: InstrumentType;
  decimals: number;
  pipSize: string;
  bid: string;
  ask: string;
  spread: string;
  openPrice: string;
  changeAbs: string;
  changePercent: string;
  isPositive: boolean;
  history: string[]; // Recent price points for sparkline
  lastUpdated: number;
  lastSeq: number;
}

export type ConnectionStatus = "CONNECTING" | "LIVE" | "STALE" | "DISCONNECTED" | "RECONNECTING";

export type OrderSide = "BUY" | "SELL";

export interface OrderTicketState {
  symbol: string;
  side: OrderSide;
  quantity: string;
  limitPrice: string;
  tolerancePips: string; // Slippage tolerance in pips
}

export interface ExecutedOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  quantity: string;
  requestedPrice: string;
  executedPrice: string;
  slippagePips: string;
  estimatedCost: string;
  status: "FILLED" | "REJECTED";
  timestamp: number;
}

// One entry of the feed's initial SNAPSHOT frame: a tick plus instrument metadata.
export interface SnapshotEntry extends PriceTick {
  name: string;
  type: InstrumentType;
  decimals: number;
  pipSize: string;
}
