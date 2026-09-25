const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const outDir = "/opt/cursor/artifacts";
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  // clear localStorage so renamed demo cards load
  await page.goto("http://localhost:3000");
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("text=Swi-Kan-Ban");

  const views = page.getByRole("navigation", { name: "Space views" });

  await page.screenshot({ path: path.join(outDir, "kanban_board.png"), fullPage: false });

  await views.getByRole("button", { name: "Calendar", exact: true }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, "calendar_view.png"), fullPage: false });

  await views.getByRole("button", { name: "Gantt", exact: true }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, "gantt_view.png"), fullPage: false });

  await views.getByRole("button", { name: "Kanban", exact: true }).click();
  await page.getByPlaceholder("New card title…").fill("Playwright smoke card");
  await page.getByRole("button", { name: "Add card" }).click();
  await page.waitForSelector('input[value="Playwright smoke card"]', { timeout: 5000 });
  await page.screenshot({ path: path.join(outDir, "card_drawer_new.png"), fullPage: false });

  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("button", { name: "Playwright smoke card" }).first().waitFor();

  console.log("PASS: Kanban, Calendar, Gantt, Add card");
  await browser.close();
})().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
