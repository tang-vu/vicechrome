import { launchChrome } from './browser.mjs';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

await fs.mkdir('docs/evidence', { recursive: true });
const browser = await launchChrome();
const page = await browser.newPage();
await page.goto('http://localhost:5173/');
const result = await page.evaluate(async () => {
  const { renderStage } = await import('/src/render.ts');
  const src = document.createElement('canvas'); src.width = 1000; src.height = 420;
  const s = src.getContext('2d');
  s.fillStyle = '#f01f23'; s.fillRect(0, 0, 500, 420);
  s.fillStyle = '#1857ef'; s.fillRect(500, 0, 500, 420);
  s.fillStyle = '#fff'; s.font = '900 100px Arial'; s.fillText('LEFT', 75, 215); s.fillText('RIGHT', 578, 215);
  s.font = '900 110px Arial'; s.fillText('→', 420, 350); s.fillText('◆', 630, 355);
  for (let row = 0; row < 2; row++) for (let col = 0; col < 10; col++) { s.fillStyle = (row + col) % 2 ? '#111' : '#fff'; s.fillRect(col * 100, row * 30, 100, 30); }
  const image = new Image(); image.src = src.toDataURL(); await image.decode();
  const target = document.createElement('canvas'); target.width = 1200; target.height = 650;
  const t = target.getContext('2d'); renderStage(t, { scene: 'garage', paint: 'ivory', art: image });
  return { source: src.toDataURL(), car: target.toDataURL(), left: [...t.getImageData(450, 400, 1, 1).data], right: [...t.getImageData(710, 400, 1, 1).data] };
});
await fs.writeFile('docs/evidence/calibration-panel.png', Buffer.from(result.source.split(',')[1], 'base64'));
await fs.writeFile('docs/evidence/calibration-car.png', Buffer.from(result.car.split(',')[1], 'base64'));
assert.ok(result.left[0] > result.left[2], 'LEFT red half must stay on the left');
assert.ok(result.right[2] > result.right[0], 'RIGHT blue half must stay on the right');
console.log('CALIBRATION:', result.left, result.right);
await browser.close();
