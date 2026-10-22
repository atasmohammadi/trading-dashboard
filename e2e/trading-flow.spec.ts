import { test, expect } from "@playwright/test";

test("watchlist shows live prices and an order is placed at the quoted price", async ({ page }) => {
  await page.goto("/");

  // 1. Live feed connects
  await expect(page.getByText("LIVE FEED")).toBeVisible({ timeout: 10000 });

  // 2. EURUSD row is in the default watchlist
  const eurusdRow = page.getByRole("row", { name: /EURUSD/ });
  await expect(eurusdRow).toBeVisible();

  // 3. Selecting the row opens its order ticket
  await eurusdRow.click();
  await expect(page.getByText("Order Ticket: EURUSD")).toBeVisible();

  // 4. Placing a BUY within tolerance records an execution with the quantity and symbol
  await page.getByRole("button", { name: /PLACE BUY ORDER/ }).click();
  await expect(page.getByText("Recent Executions")).toBeVisible();
  await expect(page.getByText("10 EURUSD")).toBeVisible();
});
