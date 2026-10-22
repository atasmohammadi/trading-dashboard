import "@testing-library/jest-dom/vitest";

// Node 22+ defines a global `localStorage` accessor that yields undefined without
// --localstorage-file, and jsdom cannot override it. Install an in-memory Storage instead.
if (typeof globalThis.localStorage?.getItem !== "function") {
  const items = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => {
      items.delete(key);
    },
    setItem: (key, value) => {
      items.set(key, String(value));
    }
  };
  Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true });
}
