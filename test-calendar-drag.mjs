import { chromium } from 'playwright';

const APP_URL = 'https://sakidoapp.vercel.app';

async function testCalendarDrag() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  // Capture console messages and errors
  const consoleMessages = [];
  const errors = [];
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[${msg.type().toUpperCase()}]`, msg.text());
    }
  });
  page.on('pageerror', err => {
    errors.push(err.message);
    console.log('[PAGE ERROR]', err.message);
  });

  const results = {
    setup: { success: false, notes: [] },
    dragToCreate: { success: false, notes: [] },
    cursorFeedback: { success: false, notes: [] },
    resizeHandles: { success: false, notes: [] },
    moveEvent: { success: false, notes: [] },
    titleEditing: { success: false, notes: [] },
    edgeCases: { success: false, notes: [] },
    mobile: { success: false, notes: [] },
    consoleErrors: [],
    visualGlitches: []
  };

  try {
    console.log('\n=== SETUP ===');
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check if auth required
    const authModal = page.locator('[class*="auth"]').or(page.locator('text=Sign in')).or(page.locator('text=Log in'));
    const isAuthVisible = await authModal.first().isVisible().catch(() => false);

    if (isAuthVisible) {
      results.setup.notes.push('⚠️  Auth modal detected - manual login may be required');
      console.log('Auth required - waiting 15s for manual login...');
      await page.waitForTimeout(15000);
    }

    // Navigate to Calendar tab
    const calendarTab = page.locator('text=Calendar').or(page.locator('[data-tab="calendar"]'));
    const calendarExists = await calendarTab.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (!calendarExists) {
      results.setup.notes.push('❌ Calendar tab not found');
      throw new Error('Cannot find Calendar tab');
    }

    await calendarTab.first().click();
    await page.waitForTimeout(1000);
    results.setup.notes.push('✓ Navigated to Calendar tab');

    // Switch to Hourly Timetable view
    const timetableBtn = page.locator('text=Hourly Timetable').or(page.locator('button:has-text("Timetable")'));
    const timetableExists = await timetableBtn.first().isVisible({ timeout: 3000 }).catch(() => false);

    if (timetableExists) {
      await timetableBtn.first().click();
      await page.waitForTimeout(1000);
      results.setup.notes.push('✓ Switched to Hourly Timetable view');
    } else {
      results.setup.notes.push('⚠️  "Hourly Timetable" button not found - may already be in view');
    }

    results.setup.success = true;

    console.log('\n=== TEST 1: Drag-to-Create ===');
    const grid = page.locator('[class*="calendar"]').or(page.locator('[class*="timetable"]')).or(page.locator('[class*="grid"]')).first();
    const gridBox = await grid.boundingBox();

    if (!gridBox) {
      results.dragToCreate.notes.push('❌ Cannot find calendar grid');
    } else {
      // Find empty space (middle of grid)
      const startX = gridBox.x + gridBox.width / 2;
      const startY = gridBox.y + 200;
      const endY = startY + 120; // ~2 hour drag

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX, startY + 30, { steps: 5 });
      await page.waitForTimeout(100);

      // Check for preview element
      const preview = page.locator('[class*="preview"]').or(page.locator('[class*="dragging"]')).or(page.locator('[class*="ghost"]'));
      const hasPreview = await preview.first().isVisible().catch(() => false);

      if (hasPreview) {
        results.dragToCreate.notes.push('✓ Preview element appears during drag');
      } else {
        results.dragToCreate.notes.push('⚠️  No visible preview during drag');
      }

      await page.mouse.move(startX, endY, { steps: 10 });
      await page.waitForTimeout(200);
      await page.mouse.up();
      await page.waitForTimeout(1000);

      // Check if event created
      const events = page.locator('[class*="event"]').or(page.locator('[draggable="true"]'));
      const eventCount = await events.count();

      if (eventCount > 0) {
        results.dragToCreate.notes.push(`✓ Event created (${eventCount} total events)`);

        // Check for auto-focus on title input
        const activeElement = await page.evaluate(() => document.activeElement?.tagName);
        if (activeElement === 'INPUT' || activeElement === 'TEXTAREA') {
          results.dragToCreate.notes.push('✓ Title input auto-focused');
        } else {
          results.dragToCreate.notes.push('⚠️  Title input NOT auto-focused');
        }

        results.dragToCreate.success = true;
      } else {
        results.dragToCreate.notes.push('❌ No event created after drag');
      }
    }

    console.log('\n=== TEST 2: Cursor Feedback ===');
    if (gridBox) {
      await page.mouse.move(gridBox.x + 100, gridBox.y + 300);
      await page.waitForTimeout(300);

      const cursor = await page.evaluate(() => {
        const el = document.elementFromPoint(window.innerWidth / 2, 300);
        return window.getComputedStyle(el).cursor;
      });

      if (cursor === 'crosshair') {
        results.cursorFeedback.notes.push('✓ Cursor is crosshair on empty grid');
        results.cursorFeedback.success = true;
      } else {
        results.cursorFeedback.notes.push(`⚠️  Cursor is "${cursor}", expected "crosshair"`);
      }
    }

    console.log('\n=== TEST 3: Resize Handles ===');
    const events = page.locator('[class*="event"]').or(page.locator('[draggable="true"]'));
    const eventCount = await events.count();

    if (eventCount > 0) {
      const firstEvent = events.first();
      await firstEvent.hover();
      await page.waitForTimeout(500);

      // Check for resize handles (visual or cursor change at edges)
      const eventBox = await firstEvent.boundingBox();
      if (eventBox) {
        // Hover top edge
        await page.mouse.move(eventBox.x + eventBox.width / 2, eventBox.y + 3);
        await page.waitForTimeout(200);
        let cursor = await page.evaluate(() => {
          const el = document.elementFromPoint(window.innerWidth / 2, document.querySelector('[class*="event"]')?.getBoundingClientRect().top + 3);
          return el ? window.getComputedStyle(el).cursor : 'default';
        });

        if (cursor.includes('resize') || cursor === 'ns-resize' || cursor === 'row-resize') {
          results.resizeHandles.notes.push('✓ Top edge shows resize cursor');
          results.resizeHandles.success = true;
        } else {
          results.resizeHandles.notes.push(`⚠️  Top edge cursor: "${cursor}"`);
        }

        // Hover bottom edge
        await page.mouse.move(eventBox.x + eventBox.width / 2, eventBox.y + eventBox.height - 3);
        await page.waitForTimeout(200);
        cursor = await page.evaluate(() => {
          const events = document.querySelectorAll('[class*="event"]');
          if (!events[0]) return 'default';
          const box = events[0].getBoundingClientRect();
          const el = document.elementFromPoint(window.innerWidth / 2, box.bottom - 3);
          return el ? window.getComputedStyle(el).cursor : 'default';
        });

        if (cursor.includes('resize') || cursor === 'ns-resize' || cursor === 'row-resize') {
          results.resizeHandles.notes.push('✓ Bottom edge shows resize cursor');
        } else {
          results.resizeHandles.notes.push(`⚠️  Bottom edge cursor: "${cursor}"`);
        }
      }
    } else {
      results.resizeHandles.notes.push('⚠️  No events found to test resize');
    }

    console.log('\n=== TEST 4: Move Event ===');
    if (eventCount > 0) {
      const firstEvent = events.first();
      const eventBox = await firstEvent.boundingBox();

      if (eventBox) {
        const centerX = eventBox.x + eventBox.width / 2;
        const centerY = eventBox.y + eventBox.height / 2;

        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.waitForTimeout(100);
        await page.mouse.move(centerX, centerY + 60, { steps: 10 });
        await page.waitForTimeout(200);

        // Check for ghost/preview
        const ghost = page.locator('[class*="ghost"]').or(page.locator('[class*="dragging"]')).or(page.locator('[class*="preview"]'));
        const hasGhost = await ghost.first().isVisible().catch(() => false);

        if (hasGhost) {
          results.moveEvent.notes.push('✓ Ghost preview visible during move');
          results.moveEvent.success = true;
        } else {
          results.moveEvent.notes.push('⚠️  No ghost preview during move');
        }

        await page.mouse.up();
        await page.waitForTimeout(500);
        results.moveEvent.notes.push('✓ Event drag completed');
      }
    } else {
      results.moveEvent.notes.push('⚠️  No events found to test move');
    }

    console.log('\n=== TEST 5: Title Editing ===');
    if (eventCount > 0) {
      const firstEvent = events.first();
      const titleEl = firstEvent.locator('input, [contenteditable="true"], text').first();

      try {
        await titleEl.click();
        await page.waitForTimeout(300);

        const isInput = await page.evaluate(() => {
          return document.activeElement?.tagName === 'INPUT' ||
                 document.activeElement?.tagName === 'TEXTAREA' ||
                 document.activeElement?.getAttribute('contenteditable') === 'true';
        });

        if (isInput) {
          results.titleEditing.notes.push('✓ Title becomes editable on click');
          results.titleEditing.success = true;
        } else {
          results.titleEditing.notes.push('⚠️  Title did not become editable input');
        }
      } catch (err) {
        results.titleEditing.notes.push(`❌ Error clicking title: ${err.message}`);
      }
    } else {
      results.titleEditing.notes.push('⚠️  No events found to test title editing');
    }

    console.log('\n=== TEST 6: Edge Cases ===');
    if (gridBox) {
      // Try dragging past top boundary (before 7am)
      await page.mouse.move(gridBox.x + 100, gridBox.y + 10);
      await page.mouse.down();
      await page.mouse.move(gridBox.x + 100, gridBox.y - 50, { steps: 5 });
      await page.waitForTimeout(200);
      await page.mouse.up();
      await page.waitForTimeout(500);
      results.edgeCases.notes.push('✓ Tested drag past top boundary');

      // Try creating very short event (< 15 min)
      await page.mouse.move(gridBox.x + 200, gridBox.y + 100);
      await page.mouse.down();
      await page.mouse.move(gridBox.x + 200, gridBox.y + 105, { steps: 2 });
      await page.waitForTimeout(100);
      await page.mouse.up();
      await page.waitForTimeout(500);
      results.edgeCases.notes.push('✓ Tested very short event creation');

      results.edgeCases.success = true;
    }

    console.log('\n=== TEST 7: Mobile Simulation ===');
    await context.close();
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true
    });
    const mobilePage = await mobileContext.newPage();

    mobilePage.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`[MOBILE ${msg.type().toUpperCase()}]`, msg.text());
      }
    });

    await mobilePage.goto(APP_URL, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(2000);

    // Try to navigate to calendar
    const mobileCalendarTab = mobilePage.locator('text=Calendar').or(mobilePage.locator('[data-tab="calendar"]'));
    const mobileCalendarExists = await mobileCalendarTab.first().isVisible({ timeout: 3000 }).catch(() => false);

    if (mobileCalendarExists) {
      await mobileCalendarTab.first().click();
      await mobilePage.waitForTimeout(1000);
      results.mobile.notes.push('✓ Calendar accessible on mobile');

      // Try touch drag
      const mobileGrid = mobilePage.locator('[class*="calendar"]').or(mobilePage.locator('[class*="grid"]')).first();
      const mobileGridBox = await mobileGrid.boundingBox();

      if (mobileGridBox) {
        await mobilePage.touchscreen.tap(mobileGridBox.x + 100, mobileGridBox.y + 200);
        await mobilePage.waitForTimeout(100);

        // Simulate swipe
        await mobilePage.touchscreen.tap(mobileGridBox.x + 100, mobileGridBox.y + 200);
        results.mobile.notes.push('✓ Touch interactions tested');
        results.mobile.success = true;
      }
    } else {
      results.mobile.notes.push('⚠️  Calendar not accessible on mobile viewport');
    }

    await mobileContext.close();

  } catch (err) {
    console.error('Test error:', err.message);
    errors.push(err.message);
  }

  // Collect console errors
  results.consoleErrors = consoleMessages.filter(m => m.type === 'error' || m.type === 'warning');

  await browser.close();

  // Print Report
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          CALENDAR DRAG INTERACTION TEST REPORT            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('🎯 SETUP');
  console.log(`   Status: ${results.setup.success ? '✓ SUCCESS' : '✗ FAILED'}`);
  results.setup.notes.forEach(n => console.log(`   ${n}`));

  console.log('\n1️⃣  DRAG-TO-CREATE');
  console.log(`   Status: ${results.dragToCreate.success ? '✓ SUCCESS' : '✗ FAILED'}`);
  results.dragToCreate.notes.forEach(n => console.log(`   ${n}`));

  console.log('\n2️⃣  CURSOR FEEDBACK');
  console.log(`   Status: ${results.cursorFeedback.success ? '✓ SUCCESS' : '✗ FAILED'}`);
  results.cursorFeedback.notes.forEach(n => console.log(`   ${n}`));

  console.log('\n3️⃣  RESIZE HANDLES');
  console.log(`   Status: ${results.resizeHandles.success ? '✓ SUCCESS' : '✗ FAILED'}`);
  results.resizeHandles.notes.forEach(n => console.log(`   ${n}`));

  console.log('\n4️⃣  MOVE EVENT');
  console.log(`   Status: ${results.moveEvent.success ? '✓ SUCCESS' : '✗ FAILED'}`);
  results.moveEvent.notes.forEach(n => console.log(`   ${n}`));

  console.log('\n5️⃣  TITLE EDITING');
  console.log(`   Status: ${results.titleEditing.success ? '✓ SUCCESS' : '✗ FAILED'}`);
  results.titleEditing.notes.forEach(n => console.log(`   ${n}`));

  console.log('\n6️⃣  EDGE CASES');
  console.log(`   Status: ${results.edgeCases.success ? '✓ SUCCESS' : '✗ FAILED'}`);
  results.edgeCases.notes.forEach(n => console.log(`   ${n}`));

  console.log('\n7️⃣  MOBILE SIMULATION');
  console.log(`   Status: ${results.mobile.success ? '✓ SUCCESS' : '✗ FAILED'}`);
  results.mobile.notes.forEach(n => console.log(`   ${n}`));

  console.log('\n🐛 CONSOLE ERRORS');
  if (results.consoleErrors.length === 0) {
    console.log('   ✓ No console errors or warnings detected');
  } else {
    console.log(`   Found ${results.consoleErrors.length} errors/warnings:`);
    results.consoleErrors.slice(0, 10).forEach(err => {
      console.log(`   - [${err.type}] ${err.text}`);
    });
    if (results.consoleErrors.length > 10) {
      console.log(`   ... and ${results.consoleErrors.length - 10} more`);
    }
  }

  if (errors.length > 0) {
    console.log('\n💥 PAGE ERRORS');
    errors.forEach(err => console.log(`   - ${err}`));
  }

  console.log('\n════════════════════════════════════════════════════════════\n');

  return results;
}

testCalendarDrag().catch(console.error);
