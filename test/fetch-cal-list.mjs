import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages()[0];

  await page.goto('https://sakidoapp.vercel.app/dashboard/calendar');
  await page.waitForTimeout(3000);

  const result = await page.evaluate(async () => {
    // Token is stored in sessionStorage under 'sakido_gat_googleCalendar'
    const raw = sessionStorage.getItem('sakido_gat_googleCalendar');
    if (!raw) return { error: 'no token in sessionStorage' };
    const { token } = JSON.parse(raw);
    if (!token) return { error: 'token field missing' };

    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const data = await res.json();
    return (data.items || []).map(c => ({ id: c.id, summary: c.summary, primary: c.primary }));
  });

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}

main();
