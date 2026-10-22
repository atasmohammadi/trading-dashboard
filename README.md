# Real-Time Trading Dashboard

A watchlist and order ticket that stays responsive while a mock feed pushes 300–500 price ticks per second, and never places an order at a price the trader did not see.

Stack: Next.js 16 (App Router, Turbopack), React 19, TypeScript (strict), Tailwind CSS v4, Zustand, `decimal.js-light`, `ws`, Vitest + React Testing Library, Playwright.

## Run it

Requires Node 22+ (developed on Node 26).

```bash
npm install        # install dependencies
npm run dev        # starts the mock feed on ws://localhost:3001 and Next.js on http://localhost:3000
npm test           # unit + component tests (Vitest, jsdom)
npm run lint       # ESLint 9 flat config (eslint-config-next)
npm run build      # production build
npm run test:e2e   # Playwright end-to-end + typing-latency test (needs `npx playwright install chromium` once)
```

Feed knobs (environment variables for `npm run server` / `npm run dev`):

| Variable | Default | Meaning |
| --- | --- | --- |
| `TICK_RATE` | `400` | Ticks per second across all 200 instruments |
| `OUT_OF_ORDER_RATE` | `0.02` | Fraction of ticks sent with an older `seq` |
| `SIMULATE_DROPS` | `false` | `true` terminates client sockets every 60 s to exercise reconnect |

The tolerance is set per order in the ticket ("Slippage Tolerance (Pips)", default 2.0). `NEXT_PUBLIC_WS_URL` overrides the feed URL.

## Requirements coverage

| Requirement | Where |
| --- | --- |
| 200 instruments; symbol, bid, ask, spread, change since open; flash on change | `server/instruments-data.ts`, `src/components/WatchlistRow.tsx` |
| Add, remove, reorder; persists across reloads | `src/components/WatchlistManager.tsx`, `src/store/ticker-store.ts` (`trading_watchlist_v1` in localStorage) |
| Click row → order ticket (side, quantity, prefilled limit, estimated cost) | `src/components/OrderTicket.tsx` |
| Price lock; confirm if moved beyond tolerance | `OrderTicket.handleSubmit` + `checkSlippage` |
| Reconnect with exponential backoff; stale state; disable submit when disconnected; ignore older `seq` | `src/lib/ws-client.ts`, `ticker-store.ingestTick`, `ConnectionBanner`, `OrderTicket` |
| Sparkline per row; chart for selected symbol | `Sparkline.tsx`, `InteractiveChart.tsx` |
| No float arithmetic on money | `src/lib/decimal-math.ts` (all prices, quantities, costs and pip maths are `decimal.js-light`) |
| Keyboard navigable; no colour-only cues; `prefers-reduced-motion` | rows are `tabIndex=0` with Enter/Space; direction shown as ▲/▼ plus screen-reader text; flash background is `motion-safe:`; global reduced-motion CSS |

## Architecture

```
WebSocket feed (server/feed-server.ts, 400 ticks/s)
        │  SNAPSHOT (200 entries with metadata) once, then TICK frames
        ▼
TradingWSClient (src/lib/ws-client.ts)
  • onopen → LIVE; onclose → STALE → RECONNECTING with 1s·2ⁿ backoff (cap 16s) + jitter
        │
        ▼
ticker store (src/store/ticker-store.ts, Zustand)
  • ingestTick: drop tick if seq ≤ newest accepted seq (committed OR still pending this frame)
  • pendingTicks Map: latest accepted tick per symbol, flushed once per requestAnimationFrame
  • summaries keyed by symbol; watchlist + selection persisted to localStorage
        │  selective subscriptions: state.summaries[symbol]
        ├──► WatchlistRow × N   (memo; re-renders only when its own symbol changes)
        ├──► InteractiveChart   (selected symbol)
        └──► OrderTicket        (selected symbol's quote; form state is local)
```

Key decisions:

- **Batch by frame, not by message.** Ticks are written to a plain `Map` and committed at most once per animation frame. A single tick never triggers a React render.
- **Per-row subscriptions.** Each row selects only `state.summaries[symbol]`, so a tick for EURUSD re-renders one row, not 200.
- **Local form state in the ticket.** Quantity, limit price and tolerance live in `OrderTicket`'s own `useState`. Typing never waits on the feed.
- **Strings for money.** Prices arrive and are stored as strings. Arithmetic goes through `decimal.js-light` with 20 significant digits and half-up rounding. `parseFloat` appears only in the sparkline and chart SVG geometry, where a rounding error changes a pixel, not a price.
- **Price lock is the quote on screen.** The limit price field is what the trader saw when they clicked. On submit, that price is compared with the live ask (BUY) or bid (SELL). Beyond tolerance, the order pauses behind a modal that quotes both prices. "Accept New Price" fills at the live price; within tolerance the order fills at the locked price and records the deviation in pips.
- **Disconnected means no orders.** The submit button is disabled unless status is `LIVE`, and the handler re-checks the status.

### Trade-offs

- **Zustand over Context.** Context re-renders every consumer on each value change. Zustand's selectors give the per-row isolation the feed needs.
- **Pure state, no charting library.** The sparkline and chart are hand-written SVG. A charting library would add weight and per-frame work for 200 small charts.
- **Mock feed volatility is per class.** A single random step of ±0.04% moves EURUSD around 4 pips per tick, which trips the 2-pip tolerance almost every time. Forex steps are ±0.3 pips, crypto and indices larger. This is a deliberate change from the first draft; the Playwright run caught the problem.
- **Reorder with up/down buttons, not drag-and-drop.** Buttons are keyboard- and screen-reader-friendly with no extra dependency. Drag-and-drop would be a later enhancement.
- **Sequence gaps are not backfilled.** Older `seq` values are dropped. A real gateway would request a snapshot when it sees a gap larger than the expected step.

## Performance evidence

The React Profiler was not captured in this environment. Instead, `e2e/typing-latency.spec.ts` runs the production build in headless Chromium, types into the Quantity field while the feed streams at its default 400 ticks/s, and records main-thread long tasks (`PerformanceObserver` `longtask`) and per-keystroke wall time.

Measured on this machine (three repeats, `npx playwright test e2e/typing-latency.spec.ts --repeat-each=3`):

| Run | Keystrokes | Worst keystroke (ms) | Long tasks (>50 ms) | Longest long task (ms) |
| --- | --- | --- | --- | --- |
| 1 | 8 | 9 | 0 | 0 |
| 2 | 8 | 9 | 0 | 0 |
| 3 | 8 | 10 | 0 | 0 |

Ticks ingested during each run rose by about 28–30 (committed rows, after per-symbol coalescing). Headless Chromium throttles rAF, so this is a lower bound on the flush rate, not a measurement of it.

These numbers come from headless Chromium on one machine. They show the main thread does not stall while typing. They are not a substitute for a Profiler trace on a real browser.

## Testing

- **Unit (Vitest):** decimal math (spread, cost, change, slippage, malformed input), the store (seq filtering including out-of-order ticks in the same frame, rAF batching, persistence, reorder, selection on remove, corrupt storage, open price across reconnect), WebSocket client (LIVE/STALE/RECONNECTING, backoff 1 s → 2 s, 16 s cap, `disconnect()` stops reconnects, malformed frames).
- **Component (RTL):** rows (keyboard select, remove without selecting, ▲/▼ text cues), sparkline (flat series, no NaN), chart (accessible name), watchlist manager (search, add, reset), order ticket (prefill and cost, STALE disables submit, modal on tolerance breach, direct fill within tolerance, accept new price, invalid quantity), banner, page smoke test.
- **E2E (Playwright, Chromium):** live feed connects, EURUSD row opens its ticket, BUY is recorded in Recent Executions. Plus the typing-latency measurement above.

## What I would do with more time

1. **Sequence gap recovery.** Detect gaps per symbol and request a snapshot for that symbol, not just drop stale ticks.
2. **Flush on a worker or with `useSyncExternalStore` batching.** Measure whether the rAF loop is still the bottleneck at 1,000+ ticks/s.
3. **Stale-per-symbol.** A symbol with no tick for N seconds should show its own stale marker, not rely on the socket state alone.
4. **Real order gateway.** Submission currently fills locally. It needs an idempotency key, server-side price validation and a reject path.
5. **Profiler evidence.** Capture a React Profiler trace and a Chrome performance trace with CPU throttling, then commit the screenshots under `docs/`.
6. **Keyboard model.** Arrow-key navigation through rows, and shortcuts for side and quantity.
7. **Tests.** Contract tests between the feed and client against one schema, and a Playwright case for the disconnect → STALE → reconnect path using `SIMULATE_DROPS`.
