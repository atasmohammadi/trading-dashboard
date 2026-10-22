import { Instrument } from "../src/types/trading";

// 200 realistic trading instruments
const FOREX_MAJORS = ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD"];
const FOREX_CROSSES = [
  "EURGBP", "EURJPY", "EURCHF", "EURAUD", "EURCAD", "EURNZD",
  "GBPJPY", "GBPCHF", "GBPAUD", "GBPCAD", "GBPNZD",
  "AUDJPY", "AUDCHF", "AUDCAD", "AUDNZD",
  "CADJPY", "CADCHF", "CHFJPY", "NZDJPY", "NZDCHF", "NZDCAD"
];
const CRYPTO = [
  "BTCUSD", "ETHUSD", "SOLUSD", "BNBUSD", "XRPUSD", "ADAUSD", "DOGEUSD",
  "AVAXUSD", "LINKUSD", "DOTUSD", "MATICUSD", "NEARUSD", "LTCUSD", "UNIUSD"
];
const COMMODITIES = ["XAUUSD", "XAGUSD", "USOIL", "UKOIL", "NGAS", "COPPER"];
const INDICES = ["US500", "US100", "US30", "GER40", "UK100", "JPN225", "FRA40"];

export function generate200Instruments(): Instrument[] {
  const list: Instrument[] = [];

  // 1. Forex Majors (7)
  const forexBases: Record<string, string> = {
    EURUSD: "1.08400", GBPUSD: "1.29500", USDJPY: "152.400",
    USDCHF: "0.88600", AUDUSD: "0.65400", USDCAD: "1.38500", NZDUSD: "0.59800"
  };
  for (const s of FOREX_MAJORS) {
    list.push({
      symbol: s,
      name: `${s.slice(0, 3)} / ${s.slice(3)}`,
      type: "forex",
      decimals: s.includes("JPY") ? 3 : 5,
      pipSize: s.includes("JPY") ? "0.010" : "0.00010",
      basePrice: forexBases[s] || "1.00000"
    });
  }

  // 2. Forex Crosses (21)
  for (const s of FOREX_CROSSES) {
    list.push({
      symbol: s,
      name: `${s.slice(0, 3)} / ${s.slice(3)}`,
      type: "forex",
      decimals: s.includes("JPY") ? 3 : 5,
      pipSize: s.includes("JPY") ? "0.010" : "0.00010",
      basePrice: s.includes("JPY") ? "160.000" : "1.25000"
    });
  }

  // 3. Crypto (14)
  const cryptoBases: Record<string, string> = {
    BTCUSD: "68450.00", ETHUSD: "2650.00", SOLUSD: "175.50",
    BNBUSD: "590.00", XRPUSD: "0.5420", ADAUSD: "0.3450", DOGEUSD: "0.1420"
  };
  for (const s of CRYPTO) {
    list.push({
      symbol: s,
      name: `${s.replace("USD", "")} / US Dollar`,
      type: "crypto",
      decimals: 2,
      pipSize: "0.01",
      basePrice: cryptoBases[s] || "25.00"
    });
  }

  // 4. Commodities (6)
  for (const s of COMMODITIES) {
    list.push({
      symbol: s,
      name: s === "XAUUSD" ? "Gold Spot" : s === "XAGUSD" ? "Silver Spot" : s,
      type: "commodity",
      decimals: s.startsWith("X") ? 2 : 3,
      pipSize: "0.01",
      basePrice: s === "XAUUSD" ? "2735.50" : s === "USOIL" ? "71.20" : "33.50"
    });
  }

  // 5. Indices (7)
  for (const s of INDICES) {
    list.push({
      symbol: s,
      name: `${s} Index`,
      type: "index",
      decimals: 2,
      pipSize: "1.00",
      basePrice: s === "US500" ? "5850.00" : "19500.00"
    });
  }

  // 6. Generate remaining synthetic Equities to reach 200 total
  let counter = 1;
  while (list.length < 200) {
    const symbol = `EQ${String(counter).padStart(3, "0")}`;
    list.push({
      symbol,
      name: `Synthetic Equity ${counter}`,
      type: "index",
      decimals: 2,
      pipSize: "0.01",
      basePrice: (50 + (counter * 3.7) % 350).toFixed(2)
    });
    counter++;
  }

  return list;
}
