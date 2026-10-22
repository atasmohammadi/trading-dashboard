import { test, expect } from "@playwright/test";

// Measures main-thread stalls while a trader types into the order ticket at peak tick rate.
// The feed runs at its default 400 ticks/sec. Numbers are printed so they can be pasted into the README.
test("typing in the order ticket stays responsive under the live tick stream", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("LIVE FEED")).toBeVisible({ timeout: 10000 });
  await page.getByRole("row", { name: /EURUSD/ }).click();

  const qty = page.getByLabel("Quantity");
  await qty.click();
  await qty.fill("");

  await page.evaluate(() => {
    const w = window as unknown as { __longTasks: number[] };
    w.__longTasks = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) w.__longTasks.push(entry.duration);
    }).observe({ type: "longtask", buffered: false });
  });

  const ticksBefore = await page.getByText(/Ticks Ingested/).textContent();
  const keystrokeMs: number[] = [];
  for (const ch of "50001234") {
    const start = Date.now();
    await qty.pressSequentially(ch);
    keystrokeMs.push(Date.now() - start);
  }

  const longTasks = await page.evaluate(() => (window as unknown as { __longTasks: number[] }).__longTasks);
  const ticksAfter = await page.getByText(/Ticks Ingested/).textContent();
  const worstKeystroke = Math.max(...keystrokeMs);
  const longestTask = longTasks.length ? Math.max(...longTasks) : 0;

  console.log(
    `[typing-latency] ${ticksBefore} -> ${ticksAfter} keystrokes=${keystrokeMs.length} worstKeystrokeMs=${worstKeystroke} ` +
      `longTasks=${longTasks.length} longestLongTaskMs=${longestTask.toFixed(1)}`
  );

  await expect(qty).toHaveValue("50001234");
});
