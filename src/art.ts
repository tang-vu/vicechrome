export type Direction = 'sunset' | 'midnight' | 'beach' | 'plain';

export const commissions: { id: Direction; title: string; brief: string; code: string }[] = [
  { id: 'sunset', title: 'Sunset Courier', brief: 'A last delivery under coral skies.', code: '01 / CORAL' },
  { id: 'midnight', title: 'Midnight Radio', brief: 'A signal drifting down the coast.', code: '02 / AFTER DARK' },
  { id: 'beach', title: 'Beach Circuit', brief: 'Salt air. Hot laps. No audience.', code: '03 / SEAFOAM' },
  { id: 'plain', title: 'Blank panel', brief: 'The boulevard is yours to mark.', code: '04 / OPEN' },
];

export function makeStarter(id: Direction): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1000; canvas.height = 420;
  const c = canvas.getContext('2d')!;
  const bg = id === 'midnight' ? '#121b25' : id === 'beach' ? '#b7d5bf' : id === 'plain' ? '#e8e1d3' : '#f0725d';
  c.fillStyle = bg; c.fillRect(0, 0, 1000, 420);
  if (id === 'plain') return canvas.toDataURL('image/png');
  c.save();
  c.translate(-100, 0); c.rotate(-0.27);
  const colors = id === 'midnight' ? ['#8eb2c5', '#e1d090', '#e6685b'] : id === 'beach' ? ['#f8f0da', '#e98568', '#284e57'] : ['#f9dbac', '#253f4a', '#f9dbac'];
  colors.forEach((color, i) => { c.fillStyle = color; c.fillRect(180 + i * 87, -160, 39, 800); });
  c.restore();
  c.fillStyle = id === 'midnight' ? '#eef2df' : '#17353d';
  c.font = '900 94px Impact, sans-serif';
  c.fillText(id === 'sunset' ? 'SUNSET' : id === 'midnight' ? 'NIGHT / FM' : 'CIRCUIT', 485, 210, 490);
  c.font = '700 25px Arial, sans-serif';
  c.letterSpacing = '8px';
  c.fillText(id === 'sunset' ? 'SOLERA COURIER • 06' : id === 'midnight' ? 'SOLERA BAY / 88.4' : 'COAST RUN / 1979', 492, 257, 460);
  c.strokeStyle = c.fillStyle; c.lineWidth = 4; c.strokeRect(485, 114, 475, 176);
  return canvas.toDataURL('image/png');
}

export async function decodeImage(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = 'async';
  image.src = src;
  await image.decode();
  return image;
}

export async function normalizeUpload(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Use a PNG, JPEG, or WebP image.');
  if (file.size > 8 * 1024 * 1024) throw new Error('Choose an image under 8 MB.');
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error('This image could not be decoded.'); }
  try {
    if (bitmap.width < 64 || bitmap.height < 64 || bitmap.width > 6000 || bitmap.height > 6000) throw new Error('Image dimensions must be between 64 and 6000 pixels.');
    const canvas = document.createElement('canvas'); canvas.width = 1000; canvas.height = 420;
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#e8e1d3'; c.fillRect(0, 0, 1000, 420);
    const scale = Math.min(1000 / bitmap.width, 420 / bitmap.height);
    const w = bitmap.width * scale, h = bitmap.height * scale;
    c.drawImage(bitmap, (1000 - w) / 2, (420 - h) / 2, w, h);
    return canvas.toDataURL('image/png');
  } finally { bitmap.close(); }
}
