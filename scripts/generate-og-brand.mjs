import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const logoSrc = resolve(root, 'public/festival/logo-foodpower.jpg');
const out = resolve(root, 'public/og-brand.jpg');

const W = 1200;
const H = 630;
// 從原 logo (2048x2048) 緊裁出文字帶 (text 大約在 y=640~1420)
const cropLogo = await sharp(logoSrc)
  .extract({ left: 220, top: 640, width: 1608, height: 780 })
  .resize({ width: 880 })
  .toBuffer();

const meta = await sharp(cropLogo).metadata();
const logoW = meta.width ?? 880;
const logoH = meta.height ?? 427;
const logoLeft = Math.round((W - logoW) / 2);
const logoTop = 80;

// 底層：純紅底
const base = await sharp({
  create: { width: W, height: H, channels: 3, background: { r: 192, g: 25, b: 32 } },
}).png().toBuffer();

// 上層：slogan + tag
const overlay = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <style>
      .ch { font-family: "WenQuanYi Zen Hei", "Noto Sans CJK TC", sans-serif; }
    </style>
  </defs>
  <text class="ch" x="${W/2}" y="${H - 78}" text-anchor="middle" font-size="32" font-weight="700" fill="#fff" letter-spacing="4">
    連結產業 · 創造共好
  </text>
  <text x="${W/2}" y="${H - 38}" text-anchor="middle" font-size="14" font-weight="700" fill="#fde047" letter-spacing="6">
    FOOD POWER TEAM
  </text>
</svg>
`;

await sharp(base)
  .composite([
    { input: cropLogo, top: logoTop, left: logoLeft },
    { input: Buffer.from(overlay), top: 0, left: 0 },
  ])
  .jpeg({ quality: 90, mozjpeg: true })
  .toFile(out);

console.log('wrote', out, `(logo ${logoW}x${logoH} at ${logoLeft},${logoTop})`);
