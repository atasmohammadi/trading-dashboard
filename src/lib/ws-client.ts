import { PriceTick, ConnectionStatus, SnapshotEntry } from "../types/trading";

interface WSClientOptions {
  url: string;
  onTick: (tick: PriceTick) => void;
  onSnapshot: (entries: SnapshotEntry[]) => void;
  onStatusChange: (status: ConnectionStatus) => void;
}

export class TradingWSClient {
  private url: string;
  private ws: WebSocket | null = null;
  private onTick: (tick: PriceTick) => void;
  private onSnapshot: (entries: SnapshotEntry[]) => void;
  private onStatusChange: (status: ConnectionStatus) => void;

  private reconnectAttempts = 0;
  private maxReconnectDelay = 16000;
  private baseReconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isDisposed = false;

  constructor(options: WSClientOptions) {
    this.url = options.url;
    this.onTick = options.onTick;
    this.onSnapshot = options.onSnapshot;
    this.onStatusChange = options.onStatusChange;
  }

  public connect() {
    if (this.isDisposed) return;

    this.onStatusChange(this.reconnectAttempts === 0 ? "CONNECTING" : "RECONNECTING");

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.onStatusChange("LIVE");
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "SNAPSHOT") {
            this.onSnapshot(payload.data);
          } else if (payload.symbol && payload.bid && payload.ask) {
            this.onTick(payload as PriceTick);
          }
        } catch (err) {
          console.error("[WSClient] Failed to parse tick frame", err);
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (!this.isDisposed) {
          this.onStatusChange("STALE");
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn("[WSClient] Socket error", err);
        // onclose will trigger next
      };
    } catch {
      this.onStatusChange("STALE");
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    // Exponential backoff: base * 2^attempts (capped) + jitter (up to 300ms)
    const delay = Math.min(
      this.maxReconnectDelay,
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts)
    ) + Math.floor(Math.random() * 300);

    this.reconnectAttempts++;
    this.onStatusChange("RECONNECTING");

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  public disconnect() {
    this.isDisposed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.onStatusChange("DISCONNECTED");
  }
}
