import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const page = browser.contexts()[0].pages()[0];

  await page.goto('https://sakidoapp.vercel.app/dashboard/calendar');
  await page.waitForTimeout(3000);

  // Take screenshot before clicking
  await page.screenshot({ path: 'C:/Users/banta/Desktop/Personal tests/Sakido/test/before-add.png' });

  const addBtn = page.locator('button:has-text("Add calendar")');
  console.log('Add calendar button visible:', await addBtn.isVisible());
  if (await addBtn.isVisible()) {
    await addBtn.click();
    await page.waitForTimeout(1500);
    // Take screenshot after clicking
    await page.screenshot({ path: 'C:/Users/banta/Desktop/Personal tests/Sakido/test/after-add.png' });

    // List all visible buttons
    const buttons = page.locator('button');
    const count = await buttons.count();
    console.log('Total buttons visible:', count);
    for (let i = 0; i < count; i++) {
      const text = await buttons.nth(i).textContent();
      if (text && text.trim()) console.log(`Button ${i}: "${text.trim()}"`);
    }

    // List all visible inputs
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    console.log('Total inputs visible:', inputCount);
    for (let i = 0; i < inputCount; i++) {
      const placeholder = await inputs.nth(i).getAttribute('placeholder');
      console.log(`Input ${i}: placeholder="${placeholder}"`);
    }
  }

  await browser.close();
}

main();
