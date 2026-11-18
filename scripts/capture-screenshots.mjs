import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.APP_URL || 'http://127.0.0.1:4173/ab-test-peeking-simulator/';
const OUT = path.resolve('docs/screenshots');

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    colorScheme: 'light',
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[browser error]', msg.text());
  });
  page.on('pageerror', (err) => console.log('[pageerror]', err.message));

  console.log('Opening', BASE);
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('[data-testid="pvalue-chart"]');

  // Ensure A/A preset so a peek marker is likely / visible story
  await page.getByRole('button', { name: 'No real difference (A/A)' }).click();
  await page.waitForTimeout(400);

  // If no peek on default seed, nudge seed until peek appears (bounded)
  for (let i = 0; i < 12; i++) {
    const hasPeek = await page.locator('text=Peeker stops here').count();
    if (hasPeek > 0) break;
    await page.getByRole('button', { name: 'Resimulate with new seed' }).click();
    await page.waitForTimeout(250);
  }

  const pchart = page.locator('[data-testid="pvalue-chart"]');
  await pchart.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await pchart.screenshot({ path: path.join(OUT, 'pvalue-chart.png') });
  console.log('Saved docs/screenshots/pvalue-chart.png');

  await page.screenshot({
    path: path.join(OUT, 'main-view.png'),
    fullPage: true,
  });
  console.log('Saved docs/screenshots/main-view.png');

  // Run peeking trap
  const trap = page.locator('[data-testid="peeking-trap"]');
  await trap.scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Run A/A peeking experiment' }).click();
  await page.waitForSelector('[data-testid="peeking-trap-results"]', { timeout: 120000 });
  await page.waitForTimeout(600);
  await trap.screenshot({ path: path.join(OUT, 'peeking-trap.png') });
  console.log('Saved docs/screenshots/peeking-trap.png');

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
