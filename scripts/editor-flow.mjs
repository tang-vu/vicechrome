import { launchChrome } from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

await fs.mkdir('docs/evidence', { recursive: true });
const browser = await launchChrome();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(process.env.VICECHROME_URL || 'http://localhost:5173/', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'docs/evidence/welcome-desktop.png', fullPage: true });
await page.getByRole('button', { name: /enter the garage/i }).click();
await page.screenshot({ path: 'docs/evidence/garage-desktop.png', fullPage: true });
const originalStage = await page.locator('.garage-stage canvas').evaluate(el => el.toDataURL());
await page.getByRole('button', { name: /design your panel art/i }).click();
await page.getByText('Draw', { exact: true }).click();
await page.locator('[data-testid="native-draw-size"]').fill('35');
const canvas = await page.locator('canvas.upper-canvas').boundingBox();
const x = canvas.x, y = canvas.y;
await page.mouse.move(x + 650, y + 220);
await page.mouse.down();
await page.mouse.move(x + 790, y + 350, { steps: 24 });
await page.mouse.up();
await page.screenshot({ path: 'docs/evidence/editor-edited.png', fullPage: true });
await page.getByRole('button', { name: 'Save', exact: true }).click();
await page.getByText('ARTWORK APPLIED').waitFor({ timeout: 15000 });
await page.screenshot({ path: 'docs/evidence/applied-desktop.png', fullPage: true });
const editedStage = await page.locator('.garage-stage canvas').evaluate(el => el.toDataURL());
console.log('APPLIED:', await page.getByText('ARTWORK APPLIED').count());
await page.evaluate(() => {
  window.__revealFrames = [];
  let start = null;
  const capture = time => {
    const canvas = document.querySelector('.reveal-stage');
    if (!canvas) { requestAnimationFrame(capture); return; }
    if (start === null) start = time;
    const elapsed = time - start;
    const targets = [0, 220, 1550];
    if (window.__revealFrames.length < 3 && elapsed >= targets[window.__revealFrames.length]) {
      const c = canvas.getContext('2d');
      window.__revealFrames.push({ image: canvas.toDataURL(), door: [...c.getImageData(600, 400, 1, 1).data], roof: [...c.getImageData(600, 280, 1, 1).data] });
    }
    if (window.__revealFrames.length < 3) requestAnimationFrame(capture);
  };
  requestAnimationFrame(capture);
});
await page.getByRole('button', { name: /roll out/i }).click();
await page.waitForFunction(() => window.__revealFrames?.length === 3, { timeout: 5000 });
const frames = await page.evaluate(() => window.__revealFrames);
for (const [i, label] of ['closed', 'halfway', 'open'].entries()) await fs.writeFile(`docs/evidence/reveal-${label}.png`, Buffer.from(frames[i].image.split(',')[1], 'base64'));
assert.notDeepEqual(frames[0].door, frames[1].door, 'opening shutter must reveal the lower door in real UI frames');
assert.deepEqual(frames[0].roof, frames[1].roof, 'halfway frame must still conceal the roof');
assert.notDeepEqual(frames[1].roof, frames[2].roof, 'open frame must reveal the roof');
await page.getByRole('button', { name: /skip reveal/i }).click();
await page.screenshot({ path: 'docs/evidence/cover-preview-desktop.png', fullPage: true });
const coverDownload = page.waitForEvent('download');
await page.getByRole('button', { name: /save cover/i }).click();
const cover = await coverDownload;
await cover.saveAs('docs/evidence/sample-cover.png');
const artDownload = page.waitForEvent('download');
await page.getByRole('button', { name: /save flat art/i }).click();
const art = await artDownload;
await art.saveAs('docs/evidence/sample-panel-art.png');
const coverBytes = await fs.readFile('docs/evidence/sample-cover.png');
assert.equal(coverBytes.readUInt32BE(16), 1600);
assert.equal(coverBytes.readUInt32BE(20), 2000);
const artBytes = await fs.readFile('docs/evidence/sample-panel-art.png');
assert.ok(artBytes.length > 10000);
const matchedPixels = await page.evaluate(async ({ original, edited, encoded }) => {
  const load = async src => { const image = new Image(); image.src = src; await image.decode(); return image; };
  const [beforeImage, afterImage, coverImage] = await Promise.all([load(original), load(edited), load(`data:image/png;base64,${encoded}`)]);
  const pixels = (image, width, height) => { const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; const c = canvas.getContext('2d'); c.drawImage(image, 0, 0); return c.getImageData(0, 0, width, height).data; };
  const beforeData = pixels(beforeImage, 1200, 650), afterData = pixels(afterImage, 1200, 650), coverData = pixels(coverImage, 1600, 2000);
  let changed = 0, matched = 0;
  for (let y = 355; y < 457; y += 2) for (let x = 430; x < 748; x += 2) {
    const i = (y * 1200 + x) * 4, j = ((540 + Math.round(y * 867 / 650)) * 1600 + Math.round(x * 1600 / 1200)) * 4;
    const difference = Math.abs(beforeData[i] - afterData[i]) + Math.abs(beforeData[i + 1] - afterData[i + 1]) + Math.abs(beforeData[i + 2] - afterData[i + 2]);
    if (difference > 90) { changed++; if (Math.abs(afterData[i] - coverData[j]) + Math.abs(afterData[i + 1] - coverData[j + 1]) + Math.abs(afterData[i + 2] - coverData[j + 2]) < 90) matched++; }
  }
  return { changed, matched };
}, { original: originalStage, edited: editedStage, encoded: coverBytes.toString('base64') });
assert.ok(matchedPixels.changed > 40 && matchedPixels.matched > 20, `distinctive edit should survive on cover: ${JSON.stringify(matchedPixels)}`);
await page.reload({ waitUntil: 'networkidle' });
await page.getByRole('button', { name: /enter the garage/i }).click();
await page.getByText('ARTWORK APPLIED').waitFor({ timeout: 10000 });
const afterPixels = await page.locator('.garage-stage canvas').evaluate(el => el.toDataURL());
await page.getByRole('button', { name: /before \/ after/i }).click();
const beforePixels = await page.locator('.garage-stage canvas').evaluate(el => el.toDataURL());
assert.notEqual(afterPixels, beforePixels, 'before/after should visibly change the vehicle');
await page.getByRole('button', { name: /show after/i }).click();
await page.getByRole('button', { name: /edit applied art/i }).click();
await page.getByRole('button', { name: 'Save', exact: true }).waitFor();
await page.getByRole('button', { name: /back to garage/i }).click();
await page.getByText('ARTWORK APPLIED').waitFor();
console.log('DOWNLOADS:', cover.suggestedFilename(), art.suggestedFilename());
console.log('RESTORE / BEFORE-AFTER / CANCEL: passed');
console.log('ERRORS:', errors);
await browser.close();
