const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const outDir = "/opt/cursor/artifacts";
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:3000");
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("text=Swi-Kan-Ban");

  const views = page.getByRole("navigation", { name: "Space views" });

  // Kanban should show nested subcards under SharePoint parent
  await page.waitForSelector("text=Create SwiCards list columns");
  await page.screenshot({ path: path.join(outDir, "kanban_with_subcards.png"), fullPage: false });

  // Open parent, add a subcard
  // Open parent via its title text button inside the card chip
  await page
    .locator("button")
    .filter({ hasText: "SharePoint list + library setup" })
    .first()
    .click();
  await page.waitForSelector("text=Subcards");
  await page.getByPlaceholder("New subcard title…").fill("Nested smoke subcard");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.waitForSelector('input[value="Nested smoke subcard"]');
  // Add a grandchild
  await page.getByPlaceholder("New subcard title…").fill("Grandchild smoke");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.waitForSelector('input[value="Grandchild smoke"]');
  await page.screenshot({ path: path.join(outDir, "subcard_drawer_nested.png"), fullPage: false });
  await page.getByRole("button", { name: "Close", exact: true }).click();

  await views.getByRole("button", { name: "Gantt", exact: true }).click();
  await page.waitForTimeout(500);
  await page.waitForSelector("text=Tree rows + indent");
  await page.waitForSelector("text=Hierarchy: parents and nested subcards");
  await page.screenshot({ path: path.join(outDir, "gantt_hierarchy.png"), fullPage: false });

  console.log("PASS: nested subcards + hierarchical gantt");
  await browser.close();
})().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
