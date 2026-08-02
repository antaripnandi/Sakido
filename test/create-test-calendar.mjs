import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages()[0];

  await page.goto('https://sakidoapp.vercel.app/dashboard/calendar');
  await page.waitForTimeout(3000);

  const addBtn = page.locator('button:has-text("Add calendar")');
  if (await addBtn.isVisible()) {
    await addBtn.click();
    await page.waitForTimeout(500);
    const input = page.locator('input[placeholder="Calendar name"]');
    if (await input.isVisible()) {
      await input.fill('Sakido Test');
      await input.press('Enter');
      await page.waitForTimeout(2000);
      console.log('Calendar creation attempted');
      await page.screenshot({ path: 'C:/Users/banta/Desktop/Personal tests/Sakido/test/calendar-created.png' });
    }
  }
  await browser.close();
}

main();
