import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages()[0];

  // Navigate to the app to ensure localStorage/sessionStorage is loaded
  await page.goto('https://sakidoapp.vercel.app/dashboard/calendar');
  await page.waitForTimeout(2000);

  const token = await page.evaluate(() => {
    // Try common patterns for Google tokens in localStorage
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.includes('google') && key.includes('token')) {
        return JSON.parse(localStorage.getItem(key));
      }
    }
    // Try sessionStorage
    const sKeys = Object.keys(sessionStorage);
    for (const key of sKeys) {
      if (key.includes('google') && key.includes('token')) {
        return JSON.parse(sessionStorage.getItem(key));
      }
    }
    return null;
  });

  console.log('Token found:', token ? 'Yes' : 'No');
  if (token) {
    console.log(JSON.stringify(token));
  }

  await browser.close();
}

main();
