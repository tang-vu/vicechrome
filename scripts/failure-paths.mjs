import { launchChrome } from './browser.mjs';
import assert from 'node:assert/strict';

const browser = await launchChrome();
const page = await browser.newPage({ acceptDownloads: true });
await page.addInitScript(() => {
  indexedDB.open = () => { throw new Error('simulated storage failure'); };
});
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /enter the garage/i }).click();
await page.getByText('Browser storage is unavailable').waitFor();
await page.locator('input[type=file]').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not a png') });
await page.getByText('This image could not be decoded.').waitFor();
await page.getByRole('button', { name: /design your panel art/i }).click();
await page.getByRole('button', { name: 'Save', exact: true }).click();
await page.getByText('ARTWORK APPLIED').waitFor();
await page.getByRole('button', { name: /roll out/i }).click();
await page.getByRole('button', { name: /skip reveal/i }).click();
const pending = page.waitForEvent('download');
await page.getByRole('button', { name: /save cover/i }).click();
const download = await pending;
assert.ok(download.suggestedFilename().endsWith('.png'));
console.log('STORAGE FAILURE / CORRUPT UPLOAD / EXPORT: passed');
await browser.close();
