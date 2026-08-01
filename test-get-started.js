import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });

  // Capture network requests to Supabase
  const supabaseRequests = [];
  page.on('response', response => {
    if (response.url().includes('supabase')) {
      supabaseRequests.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
    }
  });

  try {
    console.log('Navigating to https://sakidoapp.vercel.app...');
    await page.goto('https://sakidoapp.vercel.app', { waitUntil: 'networkidle', timeout: 30000 });

    console.log('Page loaded. Looking for "Get Started" button...');

    // Wait a moment for any dynamic content to load
    await page.waitForTimeout(2000);

    // Take a screenshot before clicking
    await page.screenshot({ path: 'before-click.png' });

    // Try to find and click "Get Started" button
    const getStartedButton = await page.locator('text="Get Started"').first();
    const buttonExists = await getStartedButton.count() > 0;

    if (!buttonExists) {
      console.log('ERROR: "Get Started" button not found');
      console.log('Page title:', await page.title());
      console.log('Page content preview:', (await page.content()).substring(0, 500));
    } else {
      console.log('Found "Get Started" button, clicking...');
      await getStartedButton.click();

      // Wait for navigation or modal
      await page.waitForTimeout(2000);

      // Take screenshot after clicking
      await page.screenshot({ path: 'after-click.png' });

      // Check current URL
      const currentUrl = page.url();
      console.log('\n=== RESULTS ===');
      console.log('1. URL after clicking:', currentUrl);

      // Check for auth modal
      const modalVisible = await page.locator('[role="dialog"]').count() > 0 ||
                           await page.locator('.modal').count() > 0 ||
                           await page.locator('text=/sign in|login|auth/i').count() > 0;
      console.log('3. Auth modal appears:', modalVisible);

      // Check for console errors
      const errors = consoleLogs.filter(log => log.type === 'error');
      console.log('\n2. JavaScript console errors:');
      if (errors.length === 0) {
        console.log('   No errors');
      } else {
        errors.forEach(err => {
          console.log(`   - ${err.text}`);
          if (err.location) {
            console.log(`     at ${err.location.url}:${err.location.lineNumber}`);
          }
        });
      }

      // Check Supabase requests
      console.log('\n4. Network requests to Supabase:');
      const failedSupabaseRequests = supabaseRequests.filter(req => req.status === 401 || req.status === 403);
      if (supabaseRequests.length === 0) {
        console.log('   No Supabase requests detected');
      } else {
        console.log(`   Total Supabase requests: ${supabaseRequests.length}`);
        if (failedSupabaseRequests.length > 0) {
          console.log('   Failed requests (401/403):');
          failedSupabaseRequests.forEach(req => {
            console.log(`   - ${req.status} ${req.statusText}: ${req.url}`);
          });
        } else {
          console.log('   No 401/403 errors');
        }
      }

      // Log all Supabase requests for reference
      console.log('\n   All Supabase requests:');
      supabaseRequests.forEach(req => {
        console.log(`   - ${req.status} ${req.url.substring(0, 100)}...`);
      });
    }

  } catch (error) {
    console.error('Error during test:', error.message);
  } finally {
    await browser.close();
  }
})();
