import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages()[0];

  await page.goto('https://calendar.google.com/calendar/r/settings');
  await page.waitForTimeout(3000);

  // Expand "Add calendar" and click "Create new calendar"
  await page.locator('text=Add calendar').click();
  await page.waitForTimeout(1000);
  await page.locator('text=Create new calendar').click();
  await page.waitForTimeout(2000);

  // The Name input is the first non-search input with class Fgl6fe-fmcmS-wGMbrd
  const nameInput = page.locator('input.Fgl6fe-fmcmS-wGMbrd').first();
  await nameInput.click();
  await page.keyboard.type('Sakido Test', { delay: 50 });
  await page.waitForTimeout(500);

  // Click "Create calendar" button
  await page.locator('button:has-text("Create calendar")').click();
  await page.waitForTimeout(5000);
  console.log('Google Calendar "Sakido Test" creation attempted');

  await page.screenshot({ path: 'C:/Users/banta/Desktop/Personal tests/Sakido/test/after-create-click.png' });
  await browser.close();
}

main();
