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
      <stop offset="0%" stop-color="#1a0808" stop-opacity="0.92"/>
      <stop offset="55%" stop-color="#3b0a0a" stop-opacity="0.72"/>
      <stop offset="100%" stop-color="#7a1a08" stop-opacity="0.35"/>
    </linearGradient>
    <linearGradient id="bottomFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.55"/>
    </linearGradient>
    <style>
      .ch { font-family: "WenQuanYi Zen Hei", "Noto Sans CJK TC", sans-serif; }
    </style>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#darken)"/>
  <rect width="${W}" height="${H}" fill="url(#bottomFade)"/>

  <!-- top-left brand chip -->
  <g transform="translate(60, 56)">
    <rect width="72" height="72" rx="18" fill="#c41e22"/>
    <text class="ch" x="36" y="52" font-size="42" font-weight="900" fill="#fff" text-anchor="middle">食</text>
    <text class="ch" x="92" y="36" font-size="26" font-weight="800" fill="#fff">食在力量</text>
    <text x="92" y="62" font-size="14" font-weight="700" fill="#fbbf24" letter-spacing="2">FOOD POWER TEAM</text>
  </g>

  <!-- main title -->
  <g transform="translate(60, 240)">
    <text class="ch" font-size="120" font-weight="900" fill="#fff" style="paint-order:stroke;stroke:rgba(0,0,0,0.35);stroke-width:2px">
      <tspan>燒肉祭</tspan>
      <tspan dx="20" fill="#fde047">×</tspan>
      <tspan dx="20">火鍋祭</tspan>
    </text>
    <text class="ch" y="70" font-size="32" font-weight="700" fill="#fff">
      全台餐飲業者 <tspan fill="#fde047">獨家整合行銷祭典</tspan>
    </text>
  </g>

  <!-- bottom stats row -->
  <g transform="translate(60, 510)">
    <g>
      <rect width="200" height="68" rx="16" fill="rgba(0,0,0,0.45)" stroke="rgba(255,255,255,0.25)"/>
      <text class="ch" x="20" y="28" font-size="14" font-weight="700" fill="#fde047">上架費</text>
      <text x="20" y="56" font-size="22" font-weight="900" fill="#fff">NT$3,000</text>
    </g>
    <g transform="translate(220,0)">
      <rect width="240" height="68" rx="16" fill="rgba(0,0,0,0.45)" stroke="rgba(255,255,255,0.25)"/>
      <text class="ch" x="20" y="28" font-size="14" font-weight="700" fill="#fde047">優惠券價值</text>
      <text x="20" y="56" font-size="22" font-weight="900" fill="#fff">NT$20,000</text>
    </g>
    <g transform="translate(480,0)">
      <rect width="280" height="68" rx="16" fill="rgba(0,0,0,0.45)" stroke="rgba(255,255,255,0.25)"/>
      <text class="ch" x="20" y="28" font-size="14" font-weight="700" fill="#fde047">行銷總價值</text>
      <text x="20" y="56" font-size="22" font-weight="900" fill="#fff">NT$100,000+</text>
    </g>
  </g>

  <!-- bottom-right url -->
  <text x="${W - 60}" y="${H - 38}" text-anchor="end" font-size="20" font-weight="700" fill="#fff" opacity="0.85">
    foodpowerteam.com/#/festival
  </text>
</svg>
`;

await sharp(bg)
  .resize(W, H, { fit: 'cover', position: 'center' })
  .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(out);

console.log('wrote', out);
