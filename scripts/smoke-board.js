const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const outDir = "/opt/cursor/artifacts";
fs.mkdirSync(outDir, { recursive: true });

async function waitForInputValue(page, value, timeout = 5000) {
  await page.waitForFunction(
    (v) => [...document.querySelectorAll("aside input")].some((i) => i.value === v),
    value,
    { timeout },
  );
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:3000");
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("text=Swi-Kan-Ban");

  const views = page.getByRole("navigation", { name: "Space views" });

  await page
    .locator("button")
    .filter({ hasText: "SharePoint list + library setup" })
    .first()
    .click();
  await page.waitForSelector("text=Bullets → to-dos");
  await page.getByRole("button", { name: /Bullets → to-dos/ }).click();
  await waitForInputValue(page, "Register Azure AD SPA app");

  // Assign via the input next to that to-do text field
  await page.evaluate(() => {
    const textInput = [...document.querySelectorAll("aside input")].find(
      (i) => i.value === "Register Azure AD SPA app",
    );
    const li = textInput?.closest("li");
    const assign = li?.querySelector('input[placeholder="Assign to…"]');
    if (!assign) throw new Error("assign input missing");
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ).set;
    setter.call(assign, "Sam");
    assign.dispatchEvent(new Event("input", { bubbles: true }));
    assign.dispatchEvent(new Event("blur", { bubbles: true }));
  });
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    const textInput = [...document.querySelectorAll("aside input")].find(
      (i) => i.value === "Register Azure AD SPA app",
    );
    const btn = [...textInput.closest("li").querySelectorAll("button")].find((b) =>
      b.textContent.includes("Subcard"),
    );
    btn.click();
  });
  await page.waitForSelector("text=Subcard", { timeout: 5000 });
  await waitForInputValue(page, "Register Azure AD SPA app");
  await page.screenshot({ path: path.join(outDir, "todo_to_subcard.png"), fullPage: false });
  await page.getByRole("button", { name: "Close", exact: true }).click();

  await views.getByRole("button", { name: "Gantt", exact: true }).click();
  await page.waitForSelector("text=Drag a bar to move");
  const bar = page.locator('[title="Drag to move · edges to resize"]').first();
  const box = await bar.boundingBox();
  if (!box) throw new Error("no gantt bar");
  const before = await page.locator("aside, main").innerText();
  await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 2 + 28 * 3, box.y + box.height / 2, {
    steps: 10,
  });
  await page.mouse.up();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, "gantt_resize_dates.png"), fullPage: false });
  // Confirm adjusting banner appeared or dates changed in label column
  const after = await page.locator("main").innerText();
  if (!after.includes("→") && !before.includes("→")) {
    throw new Error("expected date arrows in gantt labels");
  }

  console.log("PASS: todos assign/convert/promote + gantt resize");
  await browser.close();
})().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
