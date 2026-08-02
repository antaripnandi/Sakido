const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages()[0];
  if (!page.url().includes('/dashboard/calendar')) {
    await page.goto('https://sakidoapp.vercel.app/dashboard/calendar');
  }
  const addBtn = page.locator('button:has-text("Add calendar")');
  if (await addBtn.isVisible()) {
    await addBtn.click();
  }
  await page.waitForTimeout(500);
  const input = page.locator('input[placeholder="Calendar name"]');
  if (await input.isVisible()) {
    await input.fill('Sakido Test');
    await page.locator('button:has-text("Create")').first().click();
  }
  await page.waitForTimeout(1000);
  await browser.close();
})();
