import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const bg = resolve(root, 'public/festival/bg-hero.jpg');
const out = resolve(root, 'public/festival/og-festival.jpg');

const W = 1200;
const H = 630;

const overlay = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="darken" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#1a0808" stop-opacity="0.88"/>
      <stop offset="60%" stop-color="#3b0a0a" stop-opacity="0.65"/>
      <stop offset="100%" stop-color="#7a1a08" stop-opacity="0.3"/>
    </linearGradient>
    <style>
      .ch { font-family: "WenQuanYi Zen Hei", "Noto Sans CJK TC", sans-serif; }
    </style>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#darken)"/>

  <!-- 食在力量 logo chip (top-left) -->
  <g transform="translate(60, 60)">
    <rect width="88" height="88" rx="20" fill="#c41e22"/>
    <text class="ch" x="44" y="64" font-size="54" font-weight="900" fill="#fff" text-anchor="middle">食</text>
    <text class="ch" x="108" y="58" font-size="38" font-weight="900" fill="#fff">食在力量</text>
  </g>

  <!-- 燒肉祭 × 火鍋祭 (置中) -->
  <g transform="translate(${W/2}, ${H/2 + 50})">
    <text class="ch" text-anchor="middle" font-size="150" font-weight="900" fill="#fff"
      style="paint-order:stroke;stroke:rgba(0,0,0,0.45);stroke-width:3px">
      <tspan>燒肉祭</tspan>
      <tspan dx="30" fill="#fde047">×</tspan>
      <tspan dx="30">火鍋祭</tspan>
    </text>
  </g>
</svg>
`;

await sharp(bg)
  .resize(W, H, { fit: 'cover', position: 'center' })
  .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(out);

console.log('wrote', out);
