import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages()[0];

  await page.goto('https://calendar.google.com');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'C:/Users/banta/Desktop/Personal tests/Sakido/test/gcal-screen.png' });

  await browser.close();
}

main();
