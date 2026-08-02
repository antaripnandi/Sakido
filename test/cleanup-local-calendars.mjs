import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages()[0];

  await page.goto('https://sakidoapp.vercel.app/dashboard/calendar');
  await page.waitForTimeout(2000);

  // Remove local-only "Sakido Test" calendars from localStorage
  // Keep only Google-sourced calendars and non-Sakido-Test calendars
  await page.evaluate(() => {
    const key = 'sakido_calendars';
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const calendars = JSON.parse(raw);
    // Filter out local-only "Sakido Test" entries (source === 'sakido' AND name === 'Sakido Test')
    const cleaned = calendars.filter(c => !(c.source === 'sakido' && c.name === 'Sakido Test'));
    localStorage.setItem(key, JSON.stringify(cleaned));
  });

  // Reload to apply
  await page.reload();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'C:/Users/banta/Desktop/Personal tests/Sakido/test/after-cleanup.png' });

  console.log('Local-only Sakido Test calendars cleaned up');
  await browser.close();
}

main();
