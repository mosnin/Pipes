import { chromium } from '@playwright/test';

const PAGES = [
  ['home', '/'],
  ['pricing', '/pricing'],
  ['features-editor', '/features/editor'],
  ['docs', '/docs'],
  ['login', '/login'],
  ['signup', '/signup'],
  ['templates', '/templates'],
  ['protocol', '/protocol'],
];

const SS = process.env.SS_DIR;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });

for (const [name, path] of PAGES) {
  try {
    await page.goto(`http://localhost:3000${path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SS}/${name}-fold.png` });
    await page.screenshot({ path: `${SS}/${name}-full.png`, fullPage: true });
    console.log(`✓ ${name}`);
  } catch(e) {
    console.log(`✗ ${name}: ${e.message}`);
  }
}

await browser.close();
