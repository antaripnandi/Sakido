import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages()[0];

  // Navigate to Sakido dashboard calendar
  await page.goto('https://sakidoapp.vercel.app/dashboard/calendar');
  await page.waitForTimeout(3000);

  // Take screenshot to verify Google Calendar "Sakido Test" appears
  await page.screenshot({ path: 'C:/Users/banta/Desktop/Personal tests/Sakido/test/sakido-synced.png' });

  // Check what's visible in the sidebar under "Google Calendars"
  const pageText = await page.textContent('body');
  const hasSakidoTest = pageText.includes('Sakido Test');
  console.log('Sakido Test visible on page:', hasSakidoTest);

  await browser.close();
}

main();
