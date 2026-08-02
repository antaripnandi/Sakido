import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages()[0];

  await page.goto('https://calendar.google.com/calendar/r/settings');
  await page.waitForTimeout(3000);

  // Expand "Add calendar" and click "Create new calendar"
  const addCalBtn = page.locator('text=Add calendar');
  await addCalBtn.click();
  await page.waitForTimeout(1000);
  const createNewCalBtn = page.locator('text=Create new calendar');
  await createNewCalBtn.click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'C:/Users/banta/Desktop/Personal tests/Sakido/test/inspect-form.png' });

  // Get all inputs on the page
  const inputs = page.locator('input');
  const count = await inputs.count();
  console.log('Inputs count:', count);
  for (let i = 0; i < count; i++) {
    const attrs = await inputs.nth(i).evaluate(el => ({
      tag: el.tagName,
      type: el.type,
      ariaLabel: el.getAttribute('aria-label'),
      placeholder: el.placeholder,
      id: el.id,
      name: el.name,
      className: el.className.substring(0, 80)
    }));
    console.log(`Input ${i}:`, JSON.stringify(attrs));
  }

  await browser.close();
}

main();
