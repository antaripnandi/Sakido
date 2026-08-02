import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages()[0];

  // Navigate to the app to ensure localStorage/sessionStorage is loaded
  await page.goto('https://sakidoapp.vercel.app/dashboard/calendar');
  await page.waitForTimeout(2000);

  // Try to find the token and call API directly inside the browser context
  const calendars = await page.evaluate(async () => {
    const keys = Object.keys(localStorage);
    let token = null;
    for (const key of keys) {
      const val = localStorage.getItem(key);
      if (val && val.includes('access_token') && val.includes('google')) {
        try {
          const obj = JSON.parse(val);
          token = obj.access_token || obj.token;
        } catch(e) {}
      }
    }
    if (!token) {
      const sKeys = Object.keys(sessionStorage);
      for (const key of sKeys) {
        const val = sessionStorage.getItem(key);
        if (val && val.includes('access_token')) {
          try {
            const obj = JSON.parse(val);
            token = obj.access_token || obj.token;
          } catch(e) {}
        }
      }
    }
    if (!token) return { error: 'no token found' };

    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return await res.json();
  });

  console.log(JSON.stringify(calendars, null, 2));
  await browser.close();
}

main();
