import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const out = resolve(root, 'public/og-brand.jpg');

const W = 1200;
const H = 630;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#9b1313"/>
      <stop offset="55%" stop-color="#c41e22"/>
      <stop offset="100%" stop-color="#e85a20"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.75" cy="0.3" r="0.6">
      <stop offset="0%" stop-color="#fde047" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#fde047" stop-opacity="0"/>
    </radialGradient>
    <style>
      .ch { font-family: "WenQuanYi Zen Hei", "Noto Sans CJK TC", sans-serif; }
    </style>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- 裝飾圓 -->
  <circle cx="100" cy="120" r="180" fill="#fff" opacity="0.05"/>
  <circle cx="1100" cy="560" r="220" fill="#fff" opacity="0.06"/>

  <!-- 中央 logo 區 -->
  <g transform="translate(600, 220)">
    <rect x="-110" y="-110" width="220" height="220" rx="44" fill="#fff"/>
    <text class="ch" x="0" y="48" font-size="170" font-weight="900" fill="#c41e22" text-anchor="middle">食</text>
  </g>

  <!-- 站名 -->
  <text class="ch" x="600" y="420" text-anchor="middle" font-size="76" font-weight="900" fill="#fff" letter-spacing="6">
    食在力量
  </text>
  <text x="600" y="458" text-anchor="middle" font-size="20" font-weight="700" fill="#fde047" letter-spacing="6">
    FOOD POWER TEAM
  </text>

  <!-- slogan -->
  <text class="ch" x="600" y="528" text-anchor="middle" font-size="34" font-weight="700" fill="#fff">
    連結產業 · 創造共好
  </text>

  <!-- 底部一行小字 -->
  <text class="ch" x="600" y="582" text-anchor="middle" font-size="18" font-weight="500" fill="#fff" opacity="0.85">
    講座論壇 ・ 企業參訪 ・ 專業課程 ・ 會員管理
  </text>
</svg>
`;

await sharp(Buffer.from(svg))
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(out);

console.log('wrote', out);
