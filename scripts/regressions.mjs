import assert from 'node:assert/strict';
import { launchChrome } from './browser.mjs';

const browser = await launchChrome();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(process.env.VICECHROME_URL || 'http://localhost:5173/');
const result = await page.evaluate(async () => {
  const { normalizeUpload, PANEL_WIDTH, PANEL_HEIGHT } = await import('/src/art.ts');
  const { renderStage, renderCover } = await import('/src/render.ts');
  const source = document.createElement('canvas'); source.width = 200; source.height = 200;
  const sc = source.getContext('2d'); sc.fillStyle = '#fa1717'; sc.fillRect(0, 0, 200, 200);
  const sourceBlob = await new Promise(resolve => source.toBlob(resolve, 'image/png'));
  const normalized = await normalizeUpload(new File([sourceBlob], 'opaque.png', { type: 'image/png' }));
  const image = new Image(); image.src = normalized; await image.decode();
  const sample = document.createElement('canvas'); sample.width = image.width; sample.height = image.height;
  const ic = sample.getContext('2d'); ic.drawImage(image, 0, 0);
  const pixel = (x, y) => [...ic.getImageData(x, y, 1, 1).data];
  const stage = document.createElement('canvas'); stage.width = 1200; stage.height = 650;
  const ctx = stage.getContext('2d');
  const frames = [];
  for (const shutter of [0, .5, 1]) {
    renderStage(ctx, { scene: 'garage', paint: 'graphite', art: image, shutter });
    frames.push({ door: [...ctx.getImageData(600, 400, 1, 1).data], roof: [...ctx.getImageData(600, 280, 1, 1).data], data: stage.toDataURL() });
  }
  const covers = [];
  for (const name of ['', '  ', 'SAMPLE NAME', 'ABCDEFGHIJKLMNOPQRSTUVWXYZAB']) {
    const cover = document.createElement('canvas'); renderCover(cover.getContext('2d'), { scene: 'boulevard', paint: 'graphite', art: image }, name);
    covers.push(cover.toDataURL());
  }
  return { dimensions: [image.width, image.height], constants: [PANEL_WIDTH, PANEL_HEIGHT], lastRow: pixel(500, 334), left: pixel(100, 167), center: pixel(500, 167), right: pixel(900, 167), frames, covers, source: source.toDataURL() };
});
assert.deepEqual(result.dimensions, [1000, 335]);
assert.deepEqual(result.constants, [1000, 335]);
assert.equal(result.lastRow[3], 255);
assert.deepEqual(result.left.slice(0, 3), result.right.slice(0, 3));
assert.equal(result.center[0], 250);
assert.notDeepEqual(result.center.slice(0, 3), result.left.slice(0, 3));
assert.notDeepEqual(result.frames[0].door, result.frames[1].door, 'halfway must reveal uncovered door area');
assert.deepEqual(result.frames[0].roof, result.frames[1].roof, 'halfway must still conceal roof area');
assert.notDeepEqual(result.frames[1].roof, result.frames[2].roof, 'fully open must reveal roof');
assert.equal(result.covers[0], result.covers[1], 'empty and whitespace titles must render alike');
assert.notEqual(result.covers[1], result.covers[2]);
await page.getByRole('button', { name: /enter the garage/i }).click();
await page.locator('input[type=file]').setInputFiles({ name: 'opaque.png', mimeType: 'image/png', buffer: Buffer.from(result.source.split(',')[1], 'base64') });
await page.getByRole('button', { name: 'Save', exact: true }).waitFor({ timeout: 30000 });
assert.equal(await page.locator('canvas.upper-canvas').count(), 1);
await page.getByText('Text', { exact: true }).click();
await page.getByText('Heading', { exact: true }).click();
const editorLayout = await page.evaluate(() => ({ viewportHeight: innerHeight, frame: document.querySelector('.editor-frame').getBoundingClientRect().toJSON(), canvas: document.querySelector('canvas.upper-canvas').getBoundingClientRect().toJSON(), actions: [...document.querySelectorAll('button')].filter(el => ['Save', 'Cancel'].includes(el.textContent.trim())).map(el => el.getBoundingClientRect().toJSON()) }));
assert.ok(editorLayout.canvas.width > 650);
assert.ok(editorLayout.frame.height <= 720);
assert.ok(editorLayout.actions.every(rect => rect.top >= 0 && rect.bottom <= editorLayout.viewportHeight));
await page.screenshot({ path: 'docs/evidence/editor-text-expanded.png' });
await page.getByRole('button', { name: 'Save', exact: true }).click();
await page.getByText('ARTWORK APPLIED').waitFor();
for (const [input, expected] of [['', 'UNTITLED BUILD'], ['   ', 'UNTITLED BUILD'], ['NIGHT RUN', 'NIGHT RUN'], ['ABCDEFGHIJKLMNOPQRSTUVWXYZAB', 'ABCDEFGHIJKLMNOPQRSTUVWXYZAB']]) {
  await page.locator('#buildName').fill(input);
  await page.getByRole('button', { name: /roll out/i }).click();
  await page.getByRole('button', { name: /skip reveal/i }).click();
  assert.equal(await page.locator('.cover-preview strong').textContent(), expected);
  const fits = await page.locator('.cover-preview strong').evaluate(el => el.scrollWidth <= el.parentElement.clientWidth);
  assert.ok(fits, `preview title should fit: ${expected}`);
  if (!input) {
    await page.waitForFunction(() => !document.querySelector('.cover-actions .primary')?.hasAttribute('disabled'));
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: /save cover/i }).click();
    assert.equal((await download).suggestedFilename(), 'vicechrome-untitled-build-cover.png');
  }
  await page.getByRole('button', { name: /return to garage/i }).click();
}
console.log('Normalization, shutter occlusion, real upload, and four build-name cases passed.');
await browser.close();
