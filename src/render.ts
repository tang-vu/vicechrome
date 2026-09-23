export type Scene = 'garage' | 'boulevard';
export type Paint = 'graphite' | 'ivory' | 'coral';

export interface RenderOptions { scene: Scene; paint: Paint; art?: HTMLImageElement | null; lights?: boolean; shutter?: number; lightSweep?: number }

const bodyColors: Record<Paint, [string, string, string]> = {
  graphite: ['#657176', '#273339', '#101b20'],
  ivory: ['#f7efdc', '#d1d0bf', '#798b89'],
  coral: ['#ffb39a', '#d6665f', '#833c45'],
};

function line(c: CanvasRenderingContext2D, pts: number[], color: string, width = 2) {
  c.beginPath(); c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.strokeStyle = color; c.lineWidth = width; c.stroke();
}

function palm(c: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  c.save(); c.translate(x, y); c.scale(scale, scale);
  c.strokeStyle = '#223c43'; c.lineWidth = 9; c.beginPath(); c.moveTo(0, 210); c.quadraticCurveTo(18, 85, 0, 0); c.stroke();
  for (let i = 0; i < 7; i++) {
    const a = -2.8 + i * .63; const ex = Math.cos(a) * 95, ey = Math.sin(a) * 67;
    c.fillStyle = i % 2 ? '#274950' : '#31565a'; c.beginPath(); c.moveTo(0, 0);
    c.quadraticCurveTo(ex * .5, ey - 16, ex, ey); c.quadraticCurveTo(ex * .47, ey + 21, 0, 0); c.fill();
  }
  c.restore();
}

function background(c: CanvasRenderingContext2D, scene: Scene) {
  const g = c.createLinearGradient(0, 0, 0, 650);
  if (scene === 'boulevard') {
    g.addColorStop(0, '#e87268'); g.addColorStop(.48, '#d79980'); g.addColorStop(.7, '#537c81'); g.addColorStop(1, '#182b35');
    c.fillStyle = g; c.fillRect(0, 0, 1200, 650);
    c.fillStyle = '#ffe7bb'; c.beginPath(); c.arc(865, 194, 78, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#46646a'; c.fillRect(0, 391, 1200, 55);
    c.fillStyle = '#284750'; c.beginPath(); c.moveTo(0, 380); c.lineTo(240, 369); c.lineTo(456, 384); c.lineTo(632, 369); c.lineTo(1200, 386); c.lineTo(1200, 445); c.lineTo(0, 445); c.fill();
    palm(c, 88, 366, 1.3); palm(c, 1112, 377, 1.15);
    c.fillStyle = '#172831'; c.fillRect(0, 501, 1200, 149);
    line(c, [0, 531, 1200, 531], '#cead88', 3);
    line(c, [0, 593, 1200, 593], '#5d6e69', 2);
    c.fillStyle = '#9f73705c'; c.fillRect(0, 445, 1200, 8);
    for (let x = 120; x < 1200; x += 190) { c.fillStyle = '#f7d7ad35'; c.fillRect(x, 409, 82, 5); }
  } else {
    g.addColorStop(0, '#31393b'); g.addColorStop(.7, '#1b272b'); g.addColorStop(1, '#111c20');
    c.fillStyle = g; c.fillRect(0, 0, 1200, 650);
    c.fillStyle = '#343d3e'; c.fillRect(45, 48, 1110, 441);
    c.fillStyle = '#253034'; c.fillRect(99, 92, 1002, 398);
    const glow = c.createRadialGradient(600, 207, 30, 600, 340, 570);
    glow.addColorStop(0, '#d3a58164'); glow.addColorStop(1, '#d3a58100');
    c.fillStyle = glow; c.fillRect(0, 0, 1200, 600);
    for (let x = 106; x < 1100; x += 92) line(c, [x, 94, x, 487], '#64707248', 2);
    line(c, [0, 489, 1200, 489], '#a69c8755', 3);
    c.fillStyle = '#243034'; c.fillRect(0, 490, 1200, 160);
    for (let x = -200; x < 1400; x += 230) line(c, [x, 650, x + 145, 490], '#c8b49924', 2);
    c.fillStyle = '#e1a578'; c.fillRect(167, 117, 135, 5); c.fillRect(898, 117, 135, 5);
  }
}

function foregroundShutter(c: CanvasRenderingContext2D, progress: number) {
  if (progress >= 1) return;
  const bottom = 520 - 445 * Math.max(0, progress);
  c.save();
  c.fillStyle = '#111b1f'; c.fillRect(96, 75, 1008, bottom - 75);
  for (let y = 85; y < bottom; y += 21) {
    c.fillStyle = y % 42 < 21 ? '#354348' : '#29373b'; c.fillRect(98, y, 1004, 19);
    line(c, [99, y + 19, 1101, y + 19], '#82908b87', 2);
  }
  c.fillStyle = '#c69670'; c.fillRect(94, bottom - 8, 1012, 8);
  c.fillStyle = '#19272a'; c.fillRect(80, 75, 16, Math.max(0, bottom - 75)); c.fillRect(1104, 75, 16, Math.max(0, bottom - 75));
  c.restore();
}

function bodyPath(c: CanvasRenderingContext2D) {
  c.beginPath(); c.moveTo(139, 425); c.quadraticCurveTo(154, 375, 206, 359);
  c.lineTo(277, 337); c.lineTo(368, 270); c.quadraticCurveTo(402, 246, 472, 240);
  c.lineTo(729, 238); c.quadraticCurveTo(789, 242, 829, 273);
  c.lineTo(907, 337); c.lineTo(1011, 356); c.quadraticCurveTo(1060, 367, 1075, 404);
  c.lineTo(1080, 458); c.quadraticCurveTo(1074, 480, 1045, 483);
  c.lineTo(189, 483); c.quadraticCurveTo(140, 480, 139, 450); c.closePath();
}

function wheel(c: CanvasRenderingContext2D, x: number) {
  c.fillStyle = '#0d1519'; c.beginPath(); c.arc(x, 476, 80, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#415052'; c.lineWidth = 12; c.beginPath(); c.arc(x, 476, 70, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#aebbbb'; c.beginPath(); c.arc(x, 476, 49, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#26363b'; c.beginPath(); c.arc(x, 476, 38, 0, Math.PI * 2); c.fill();
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3; c.save(); c.translate(x, 476); c.rotate(a);
    c.fillStyle = '#abb7b5'; c.beginPath(); c.moveTo(-9, -10); c.lineTo(-7, -45); c.lineTo(7, -45); c.lineTo(9, -10); c.fill(); c.restore();
  }
  c.fillStyle = '#e4d1a7'; c.beginPath(); c.arc(x, 476, 10, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#e7ded0a0'; c.lineWidth = 2; c.beginPath(); c.arc(x, 476, 55, 0, Math.PI * 2); c.stroke();
  c.fillStyle = '#718387';
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.beginPath(); c.arc(x + Math.cos(a) * 30, 476 + Math.sin(a) * 30, 3, 0, Math.PI * 2); c.fill(); }
}

function car(c: CanvasRenderingContext2D, options: RenderOptions) {
  const [light, mid, dark] = bodyColors[options.paint];
  const shadow = c.createRadialGradient(600, 510, 60, 600, 520, 495);
  shadow.addColorStop(0, '#071113d9'); shadow.addColorStop(1, '#07111300');
  c.fillStyle = shadow; c.fillRect(70, 445, 1060, 160);
  c.fillStyle = '#101a1e'; c.beginPath(); c.ellipse(608, 514, 510, 42, 0, 0, Math.PI * 2); c.fill();
  bodyPath(c);
  const metal = c.createLinearGradient(0, 242, 0, 490);
  metal.addColorStop(0, light); metal.addColorStop(.35, mid); metal.addColorStop(.63, light); metal.addColorStop(.83, mid); metal.addColorStop(1, dark);
  c.fillStyle = metal; c.fill(); c.lineWidth = 3; c.strokeStyle = '#d7d5bd77'; c.stroke();
  line(c, [175, 392, 286, 349, 365, 279], '#f7eee077', 3);
  c.save(); bodyPath(c); c.clip();
  // The editable bitmap is fitted to a single, fixed door panel under the car's reflections.
  c.beginPath(); c.moveTo(426, 351); c.lineTo(752, 349); c.lineTo(756, 461); c.lineTo(415, 461); c.closePath(); c.clip();
  if (options.art) {
    const scale = Math.min(346 / options.art.naturalWidth, 116 / options.art.naturalHeight);
    const w = options.art.naturalWidth * scale, h = options.art.naturalHeight * scale;
    c.drawImage(options.art, 414 + (346 - w) / 2, 347 + (116 - h) / 2, w, h);
  }
  c.restore();
  // Panel seams and reflected lighting remain in front of the artwork.
  line(c, [410, 352, 405, 457], '#081a2099', 3);
  line(c, [759, 348, 766, 463], '#081a2099', 3);
  line(c, [416, 463, 756, 463], '#111c2199', 3);
  line(c, [770, 352, 820, 449], '#14242a9c', 2);
  line(c, [249, 357, 205, 425], '#e4dfcb70', 2);
  const reflection = c.createLinearGradient(390, 322, 800, 458);
  reflection.addColorStop(0, '#ffffff00'); reflection.addColorStop(.37, '#ffffff36'); reflection.addColorStop(.53, '#ffffff08'); reflection.addColorStop(1, '#ffffff00');
  c.fillStyle = reflection; c.beginPath(); c.moveTo(405, 345); c.lineTo(785, 344); c.lineTo(762, 464); c.lineTo(405, 464); c.fill();
  c.fillStyle = '#14252c'; c.beginPath(); c.moveTo(374, 321); c.lineTo(428, 266); c.quadraticCurveTo(444, 252, 484, 250);
  c.lineTo(711, 249); c.quadraticCurveTo(753, 250, 781, 278); c.lineTo(837, 326); c.closePath(); c.fill();
  c.fillStyle = '#6c9398aa'; c.beginPath(); c.moveTo(391, 314); c.lineTo(436, 268); c.lineTo(528, 258); c.lineTo(521, 316); c.closePath(); c.fill();
  c.fillStyle = '#88afb299'; c.beginPath(); c.moveTo(542, 256); c.lineTo(713, 255); c.quadraticCurveTo(749, 257, 775, 282); c.lineTo(817, 318); c.lineTo(536, 317); c.closePath(); c.fill();
  line(c, [399, 307, 444, 267, 511, 260], '#d6ece491', 3);
  line(c, [554, 264, 709, 263, 765, 292], '#d6ece47d', 3);
  line(c, [529, 252, 525, 322], '#d4d9cd', 5);
  line(c, [377, 325, 838, 329], '#d0d0bfaa', 4);
  line(c, [466, 342, 714, 342], '#d6d5c280', 2);
  c.fillStyle = '#ccd1c3'; c.fillRect(682, 351, 48, 6);
  c.fillStyle = dark; c.beginPath(); c.moveTo(337, 330); c.lineTo(380, 336); c.lineTo(389, 353); c.lineTo(357, 350); c.closePath(); c.fill();
  c.fillStyle = '#e8d1a2'; c.beginPath(); c.moveTo(1008, 367); c.lineTo(1062, 384); c.lineTo(1065, 400); c.lineTo(1008, 392); c.closePath(); c.fill();
  c.fillStyle = '#e36e63'; c.fillRect(152, 402, 31, 17);
  line(c, [156, 449, 1048, 449], '#dae0cf66', 3);
  c.fillStyle = '#101c21'; c.fillRect(160, 476, 869, 13);
  for (const x of [322, 886]) {
    c.strokeStyle = '#142126'; c.lineWidth = 8; c.beginPath(); c.arc(x, 476, 84, Math.PI * 1.04, Math.PI * 1.96); c.stroke();
    c.strokeStyle = '#e6e0cb80'; c.lineWidth = 2; c.beginPath(); c.arc(x, 476, 88, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
  }
  wheel(c, 322); wheel(c, 886);
  if (options.lights) {
    const beam = c.createRadialGradient(1050, 386, 3, 1040, 401, 145);
    beam.addColorStop(0, '#fff0c8be'); beam.addColorStop(.42, '#ffeac658'); beam.addColorStop(1, '#ffeac600');
    c.fillStyle = beam; c.fillRect(850, 200, 350, 405);
  }
  if (options.lightSweep !== undefined && options.lightSweep > 0 && options.lightSweep < 1) {
    const x = 220 + options.lightSweep * 820;
    const sweep = c.createLinearGradient(x - 100, 0, x + 100, 0);
    sweep.addColorStop(0, '#fff4df00'); sweep.addColorStop(.5, '#fff4df52'); sweep.addColorStop(1, '#fff4df00');
    c.save(); bodyPath(c); c.clip(); c.fillStyle = sweep; c.fillRect(x - 100, 238, 200, 250); c.restore();
  }
}

export function renderStage(c: CanvasRenderingContext2D, options: RenderOptions) {
  c.save(); c.clearRect(0, 0, 1200, 650); background(c, options.scene); car(c, options);
  if (options.scene === 'garage') foregroundShutter(c, options.shutter ?? 1);
  c.restore();
}

function fitText(c: CanvasRenderingContext2D, text: string, maxWidth: number, base: number): number {
  let size = base;
  while (size > 55) { c.font = `900 ${size}px 'Barlow Condensed', Impact, sans-serif`; if (c.measureText(text).width <= maxWidth) break; size -= 4; }
  return size;
}

export function renderCover(c: CanvasRenderingContext2D, options: RenderOptions, name: string) {
  const w = 1600, h = 2000;
  c.canvas.width = w; c.canvas.height = h;
  const bg = c.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#19272d'); bg.addColorStop(.48, '#bd6965'); bg.addColorStop(1, '#101c22');
  c.fillStyle = bg; c.fillRect(0, 0, w, h);
  c.fillStyle = '#f5e9d3'; c.font = '700 28px "DM Sans", Arial, sans-serif'; c.fillText('V / C     V I C E C H R O M E', 102, 113);
  c.textAlign = 'right'; c.fillText('SOLERA BAY  /  001', 1500, 113); c.textAlign = 'left';
  c.fillStyle = '#f5e9d3';
  const title = (name.trim() || 'UNTITLED BUILD').toUpperCase();
  c.font = `900 ${fitText(c, title, 1395, 170)}px 'Barlow Condensed', Impact, sans-serif`;
  c.fillText(title, 102, 365, 1395);
  c.fillStyle = '#e9b9a2'; c.font = '700 29px "DM Sans", Arial, sans-serif'; c.fillText('DESIGN YOUR MARK. OWN THE BOULEVARD.', 105, 430);
  const stage = document.createElement('canvas'); stage.width = 1200; stage.height = 650;
  renderStage(stage.getContext('2d')!, { ...options, scene: 'boulevard', lights: true, shutter: 1 });
  c.drawImage(stage, 0, 540, 1600, 867);
  c.fillStyle = '#13232a'; c.fillRect(0, 1407, 1600, 593);
  c.fillStyle = '#edb18e'; c.fillRect(102, 1490, 1396, 3);
  c.fillStyle = '#f2e4cf'; c.font = '900 79px "Barlow Condensed", Impact, sans-serif'; c.fillText('ONE OF ONE.', 102, 1640);
  c.fillStyle = '#b8c9bf'; c.font = '26px "DM Sans", Arial, sans-serif'; c.fillText('PANEL ART / CUSTOM COUPE / SOLERA BAY', 107, 1699);
  c.textAlign = 'right'; c.font = '700 30px "DM Sans", Arial, sans-serif'; c.fillText('BUILT TO BE SEEN', 1490, 1912); c.textAlign = 'left';
  c.fillStyle = '#e78672'; c.fillRect(102, 1878, 180, 12);
}
