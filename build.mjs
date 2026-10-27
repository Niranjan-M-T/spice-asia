// Static site generator for Spice of Asia.
// Reads data/*.json and src/*, writes a fully static site to dist/.
// Usage: SITE_URL=https://example.com/ node build.mjs
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import sharp from 'sharp';

const SITE = (process.env.SITE_URL || 'https://niranjan-m-t.github.io/spice-asia/').replace(/\/?$/, '/');
const OUT = 'dist';
const site = JSON.parse(readFileSync('data/site.json', 'utf8'));
const menu = JSON.parse(readFileSync('data/menu.json', 'utf8'));
const BUILD_DATE = new Date().toISOString().slice(0, 10);

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'assets'), { recursive: true });

// ---------- helpers ----------
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');
const hash = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 10);
const r1 = (n) => Math.round(n * 10) / 10;
function rng(seed) { // mulberry32, so the scenery is identical on every build
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function asset(name, buf) { // content-hashed file name so assets can be cached forever
  const dot = name.lastIndexOf('.');
  const file = `${name.slice(0, dot)}.${hash(buf)}${name.slice(dot)}`;
  writeFileSync(join(OUT, 'assets', file), buf);
  return 'assets/' + file;
}
const ldjson = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

// ---------- assets ----------
const FONT = asset('marcellus-latin.woff2', readFileSync('src/assets/fonts/marcellus-latin.woff2'));
const credits = JSON.parse(readFileSync('assets-src/photos/CREDITS.json', 'utf8'));
const photos = {};
for (const f of readdirSync('assets-src/photos').filter((f) => f.endsWith('.jpg'))) {
  const key = f.replace(/\.jpg$/, '');
  const src = readFileSync(join('assets-src/photos', f));
  const set = [];
  for (const w of [480, 720, 960]) {
    const img = sharp(src).resize({ width: w, height: Math.round((w * 3) / 4), fit: 'cover', position: 'attention' }).webp({ quality: 72, effort: 6 });
    set.push({ w, path: asset(`${key}-${w}.webp`, await img.toBuffer()) });
  }
  photos[key] = set;
}
const favicon = readFileSync('src/assets/favicon.svg');
const FAVICON = asset('favicon.svg', favicon);
const TOUCH = asset('apple-touch-icon.png', await sharp(readFileSync('src/assets/touch-icon.svg')).resize(180, 180).png().toBuffer());
const ICON512 = asset('icon-512.png', await sharp(readFileSync('src/assets/touch-icon.svg')).resize(512, 512).png().toBuffer());
const ICON192 = asset('icon-192.png', await sharp(readFileSync('src/assets/touch-icon.svg')).resize(192, 192).png().toBuffer());
const OG = existsSync('assets-src/og-image.png') ? asset('og-image.png', readFileSync('assets-src/og-image.png')) : null;

const css = (files, rel) => files.map((f) => readFileSync(`src/styles/${f}.css`, 'utf8')).join('\n').replace('__FONT__', rel + FONT).replace(/\n\s*/g, '\n').replace(/\/\*[^*]*\*+([^/*][^*]*\*+)*\//g, '');
const js = (f) => readFileSync(`src/scripts/${f}.js`, 'utf8');

// ---------- icons ----------
const I = {
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.5l2.6 3.1-1.6 2.3a12 12 0 0 0 7.5 7.5l2.3-1.6 3.1 2.6-1.4 3.1c-.3.6-.9 1-1.6.9C10.3 20.8 3.2 13.7 2.6 6.5c-.1-.7.3-1.3.9-1.6z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="9.5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

// ---------- SVG scenery ----------
// One hidden sprite per page holds the gradients and the lantern/cloud symbols.
const SPRITE = `<svg class="sprite" aria-hidden="true" focusable="false"><defs>
<radialGradient id="g-body" cx="50%" cy="44%" r="62%"><stop offset="0" stop-color="#ffd98a"/><stop offset=".33" stop-color="#ff8a3d"/><stop offset=".68" stop-color="#d8262e"/><stop offset="1" stop-color="#6f0916"/></radialGradient>
<radialGradient id="g-amber" cx="50%" cy="44%" r="62%"><stop offset="0" stop-color="#fff3c2"/><stop offset=".38" stop-color="#ffc54d"/><stop offset=".74" stop-color="#e0861d"/><stop offset="1" stop-color="#6e3006"/></radialGradient>
<linearGradient id="g-cap" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f8dc94"/><stop offset="1" stop-color="#a9761f"/></linearGradient>
<radialGradient id="g-halo"><stop offset="0" stop-color="#ffae4a" stop-opacity=".55"/><stop offset=".45" stop-color="#ff7a2e" stop-opacity=".16"/><stop offset="1" stop-color="#ff7a2e" stop-opacity="0"/></radialGradient>
<linearGradient id="g-kl" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffefb0"/><stop offset="1" stop-color="#ff8a2a"/></linearGradient>
<radialGradient id="g-pearl" cx="40%" cy="38%"><stop offset="0" stop-color="#fffdf2"/><stop offset=".5" stop-color="#ffe7a3"/><stop offset="1" stop-color="#e9b949"/></radialGradient>
<linearGradient id="g-gold" x1="0" x2="1"><stop offset="0" stop-color="#b8862a"/><stop offset=".5" stop-color="#f6d78a"/><stop offset="1" stop-color="#e9b949"/></linearGradient>
<symbol id="ln" viewBox="-50 0 100 116"><path d="M0 0v9" stroke="#c9a14a" stroke-width="2"/><rect x="-13" y="8" width="26" height="8" rx="2" fill="url(#g-cap)"/><ellipse cx="0" cy="48" rx="31" ry="33" fill="url(#g-body)"/><path d="M0 16v64M-15 19c-9 18-9 40 0 58M15 19c9 18 9 40 0 58M-26 30c-5 12-5 24 0 36M26 30c5 12 5 24 0 36" fill="none" stroke="#7d0b18" stroke-opacity=".45" stroke-width="1.4"/><ellipse cx="-9" cy="38" rx="9" ry="15" fill="#fff" opacity=".13"/><rect x="-13" y="79" width="26" height="8" rx="2" fill="url(#g-cap)"/><path d="M0 87v6M-4 93h8" stroke="#e3b04b" stroke-width="2"/><path d="M-3 95v18M-1 95v20M1 95v20M3 95v18" stroke="#e9b949" stroke-width="1.3"/></symbol>
<symbol id="la" viewBox="-50 0 100 116"><path d="M0 0v9" stroke="#c9a14a" stroke-width="2"/><rect x="-13" y="8" width="26" height="8" rx="2" fill="url(#g-cap)"/><ellipse cx="0" cy="48" rx="31" ry="33" fill="url(#g-amber)"/><path d="M0 16v64M-15 19c-9 18-9 40 0 58M15 19c9 18 9 40 0 58M-26 30c-5 12-5 24 0 36M26 30c5 12 5 24 0 36" fill="none" stroke="#6e3006" stroke-opacity=".4" stroke-width="1.4"/><ellipse cx="-9" cy="38" rx="9" ry="15" fill="#fff" opacity=".16"/><rect x="-13" y="79" width="26" height="8" rx="2" fill="url(#g-cap)"/><path d="M0 87v6M-4 93h8" stroke="#e3b04b" stroke-width="2"/><path d="M-3 95v18M-1 95v20M1 95v20M3 95v18" stroke="#d8262e" stroke-width="1.3"/></symbol>
<symbol id="kl" viewBox="-14 -6 28 40"><circle cy="14" r="13" fill="url(#g-halo)"/><path d="M-7 2h14l-3 22h-8z" fill="url(#g-kl)"/><path d="M-7 2h14" stroke="#ffe7a0" stroke-width="1.2"/><ellipse cy="22" rx="2" ry="2.6" fill="#fff6d0"/></symbol>
<symbol id="cl" viewBox="0 0 200 70"><path d="M20 58C4 58 4 34 22 34c0-16 22-22 32-10C60 8 88 6 96 22c10-12 34-10 36 8 18-6 38 4 32 18 16 0 22 8 14 12z" fill="#0b1240" fill-opacity=".35" stroke="currentColor" stroke-width="1.6"/><path d="M54 24c-8 6-4 18 6 16 7-2 6-11-1-11M96 22c-8 8-2 20 8 16 6-3 4-11-2-10M132 30c-6 8 0 17 8 13 5-3 3-9-2-8M178 60c10 0 16-8 10-14M22 34c-6 4-4 12 3 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></symbol>
</defs></svg>`;

// Lanterns hanging off a rope that sags as a quadratic curve.
function lanternString({ w = 1440, h = 360, ropes, seed = 1 }) {
  const rand = rng(seed);
  let out = '';
  for (const r of ropes) {
    const P = (t) => [(1 - t) ** 2 * -30 + 2 * (1 - t) * t * (w / 2) + t * t * (w + 30), (1 - t) ** 2 * r.y0 + 2 * (1 - t) * t * r.yc + t * t * r.y1];
    out += `<path d="M-30 ${r.y0}Q${w / 2} ${r.yc} ${w + 30} ${r.y1}" fill="none" stroke="#e9b949" stroke-opacity="${r.op ?? 0.35}" stroke-width="1.4"/>`;
    for (let i = 0; i < r.count; i++) {
      const t = (i + 0.5 + (rand() - 0.5) * 0.3) / r.count;
      const [x, y] = P(t);
      if (r.gap && Math.abs(x / w - 0.5) < r.gap) continue;
      const drop = 8 + rand() * (r.drop ?? 40);
      const lw = (r.size ?? 64) * (0.8 + rand() * 0.4);
      const lh = lw * 1.16;
      const sym = rand() < (r.amber ?? 0.22) ? 'la' : 'ln';
      const st = `--t:${r1(3.6 + rand() * 3)}s;--d:${r1(-rand() * 6)}s;--a:${r1(2 + rand() * 4)}deg`;
      out += `<g class="sway" style="${st}"><path d="M${r1(x)} ${r1(y)}v${r1(drop)}" stroke="#c9a14a" stroke-opacity=".7" stroke-width="1.2"/><circle cx="${r1(x)}" cy="${r1(y + drop + lh * 0.41)}" r="${r1(lw * 0.95)}" fill="url(#g-halo)"/><use href="#${sym}" x="${r1(x - lw / 2)}" y="${r1(y + drop)}" width="${r1(lw)}" height="${r1(lh)}"/></g>`;
    }
  }
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">${out}</svg>`;
}

// Night-market rooftops: shophouses, upturned eaves and a pagoda, with lit windows.
function skyline({ seed, w = 1440, h = 230, fill, windows = true, scale = 1, pagodas = [] }) {
  const rand = rng(seed);
  let d = '', wins = '';
  const roof = (x, yt, bw, lift) => `M${r1(x - 10)} ${r1(yt)}Q${r1(x + bw * 0.16)} ${r1(yt - 3)} ${r1(x + bw * 0.26)} ${r1(yt - lift)}H${r1(x + bw * 0.74)}Q${r1(x + bw * 0.84)} ${r1(yt - 3)} ${r1(x + bw + 10)} ${r1(yt)}Z`;
  const win = (x, y, ww, wh) => {
    const lit = rand() < 0.5;
    if (!lit || !windows) return;
    const fl = rand() < 0.14 ? ` class="win" style="--t:${r1(3 + rand() * 6)}s;--d:${r1(-rand() * 5)}s"` : '';
    wins += `<rect x="${r1(x)}" y="${r1(y)}" width="${ww}" height="${wh}" rx="1" fill="${rand() < 0.2 ? '#ff8a3d' : '#f6c768'}" fill-opacity="${r1(0.55 + rand() * 0.45)}"${fl}/>`;
  };
  let x = -10;
  while (x < w + 10) {
    const pg = pagodas.find((p) => Math.abs(p - x) < 70);
    if (pg !== undefined) { // three-tier pagoda
      const bw = 120 * scale, base = h;
      let y = base, tw = bw;
      for (let t = 0; t < 3; t++) {
        const th = (46 - t * 6) * scale;
        const tx = x + (bw - tw) / 2;
        d += `M${r1(tx + 8)} ${r1(y)}V${r1(y - th)}H${r1(tx + tw - 8)}V${r1(y)}Z` + roof(tx, y - th, tw, 18 * scale);
        if (windows) for (let k = 0; k < 3; k++) win(tx + tw * (0.3 + k * 0.17), y - th + 12 * scale, 6, 10);
        y -= th + 18 * scale; tw *= 0.74;
      }
      d += `M${r1(x + bw / 2 - 2)} ${r1(y)}V${r1(y - 34 * scale)}h4V${r1(y)}Z`;
      x += bw + 6;
      pagodas = pagodas.filter((p) => p !== pg);
      continue;
    }
    const bw = (44 + rand() * 90) * scale;
    const bh = (40 + rand() * 120) * scale;
    const yt = h - bh;
    const kind = rand();
    d += `M${r1(x)} ${h}V${r1(yt)}H${r1(x + bw)}V${h}Z`;
    if (kind < 0.45) d += roof(x, yt, bw, (10 + rand() * 12) * scale);
    else if (kind < 0.6) d += `M${r1(x + bw * 0.2)} ${r1(yt)}v${r1(-14 * scale)}h${r1(bw * 0.6)}v${r1(14 * scale)}Z`;
    if (windows) {
      const cols = Math.max(1, Math.floor(bw / (22 * scale))), rows = Math.max(1, Math.floor((bh - 16) / (26 * scale)));
      for (let c = 0; c < cols; c++) for (let rr = 0; rr < rows; rr++) win(x + 8 * scale + c * ((bw - 12 * scale) / cols), yt + 12 * scale + rr * 26 * scale, r1(8 * scale), r1(11 * scale));
    }
    x += bw + rand() * 8;
  }
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false"><path d="${d}" fill="${fill}"/>${wins}</svg>`;
}

function skyLanterns(n, seed) {
  const rand = rng(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const st = `left:${r1(4 + rand() * 92)}%;--s:${Math.round(12 + rand() * 16)}px;--t:${Math.round(22 + rand() * 22)}s;--d:${r1(-rand() * 40)}s;--x:${Math.round((rand() - 0.5) * 120)}px`;
    s += `<svg class="skyl" style="${st}" viewBox="-14 -6 28 40" aria-hidden="true" focusable="false"><use href="#kl"/></svg>`;
  }
  return `<div class="skylanterns" aria-hidden="true">${s}</div>`;
}

function clouds() {
  const c = [[5, 130, -20], [15, 170, -95], [76, 150, -50], [82, 190, -140]]; // kept clear of the title block
  return `<div class="clouds" aria-hidden="true">${c.map(([top, t, dl]) => `<svg class="cloud" style="top:${top}%;animation-duration:${t}s;animation-delay:${dl}s" viewBox="0 0 200 70"><use href="#cl"/></svg>`).join('')}</div>`;
}

const DRAGON_PATH = 'M-80 280C110 140 260 330 440 230S760 80 920 180S1112 300 1150 130';
const DRAGON = `<div class="dragon" aria-hidden="true"><svg viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid slice" focusable="false">
<defs><mask id="dmask" maskUnits="userSpaceOnUse" x="-120" y="-80" width="1440" height="600"><path id="dragon-draw" d="${DRAGON_PATH}" pathLength="1" fill="none" stroke="#fff" stroke-width="60" stroke-dasharray="1" stroke-dashoffset="1"/></mask></defs>
<g mask="url(#dmask)" fill="none" stroke-linecap="round">
<path d="${DRAGON_PATH}" stroke="#e9b949" stroke-opacity=".18" stroke-width="26" stroke-dasharray="1.5 11"/>
<path d="${DRAGON_PATH}" stroke="#d8262e" stroke-opacity=".6" stroke-width="11"/>
<path d="${DRAGON_PATH}" stroke="url(#g-gold)" stroke-width="11" stroke-dasharray="5 4" stroke-opacity=".85"/>
<path d="${DRAGON_PATH}" stroke="#f6d78a" stroke-width="2"/>
</g>
<g id="dragon-head" style="opacity:0;transition:opacity .7s" transform="translate(1150 130) rotate(-77) scale(.62)">
<path d="M-8-16 l-12-12 2 13-14-5 7 11-14 2 12 7" fill="#e9b949"/>
<path d="M-8-15C14-24 36-22 52-11l13-2-6 10c5 6 3 12-5 14l-22 3C16 18 0 17-8 15z" fill="#d8262e" stroke="#f6d78a" stroke-width="2"/>
<path d="M12-18C6-36-8-44-24-46M20-20c-2-18-12-30-24-36M56 10c14 20 8 44-12 52M55-11c20-16 38-8 42 8" stroke="#f6d78a" stroke-width="2" fill="none" stroke-linecap="round"/>
<circle cx="32" cy="-9" r="4" fill="#fff6dc"/><circle cx="33" cy="-9" r="2" fill="#080d2c"/>
</g>
<circle cx="1180" cy="48" r="44" fill="url(#g-halo)"/><circle class="pearl" cx="1180" cy="48" r="15" fill="url(#g-pearl)"/>
</svg></div>`;

function bobaGlass() {
  const rand = rng(7);
  let balls = '', fizz = '';
  for (let i = 0; i < 16; i++) balls += `<circle class="boba" style="--t:${r1(2 + rand() * 2)}s;--d:${r1(-rand() * 3)}s" cx="${Math.round(78 + rand() * 84)}" cy="${Math.round(272 + rand() * 34)}" r="${r1(8 + rand() * 3)}" fill="${['#3a1a10', '#4b2414', '#2c120b'][i % 3]}" stroke="#7a4128" stroke-width="1.5"/>`;
  for (let i = 0; i < 9; i++) fizz += `<circle class="fizz" style="--t:${r1(3 + rand() * 3)}s;--d:${r1(-rand() * 5)}s" cx="${Math.round(80 + rand() * 80)}" cy="270" r="${r1(1.5 + rand() * 2.5)}" fill="#fff" fill-opacity=".5"/>`;
  return `<svg viewBox="0 0 240 360" role="img" aria-label="Illustration of a glass of popping boba">
<defs><clipPath id="cup"><path d="M46 82h148l-20 236q-2 14-16 14H82q-14 0-16-14z"/></clipPath><linearGradient id="g-taro" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#f4a6c8"/><stop offset=".55" stop-color="#c76aa8"/><stop offset="1" stop-color="#7d3a86"/></linearGradient></defs>
<circle cx="120" cy="200" r="150" fill="url(#g-halo)" opacity=".6"/>
<rect x="128" y="0" width="14" height="250" rx="7" fill="#d8262e" transform="rotate(14 135 120)"/>
<rect x="131" y="0" width="4" height="250" rx="2" fill="#fff" fill-opacity=".35" transform="rotate(14 135 120)"/>
<g clip-path="url(#cup)"><rect x="0" y="126" width="240" height="240" fill="url(#g-taro)"/><path d="M0 126q30-10 60 0t60 0 60 0 60 0v10H0z" fill="#ffd1e4" fill-opacity=".6"/>${fizz}${balls}</g>
<path d="M46 82h148l-20 236q-2 14-16 14H82q-14 0-16-14z" fill="#fff" fill-opacity=".06" stroke="#f6d78a" stroke-width="2.5"/>
<path d="M58 96l14 214" stroke="#fff" stroke-opacity=".25" stroke-width="5" stroke-linecap="round"/>
<path d="M36 82q84-44 168 0z" fill="#fff" fill-opacity=".1" stroke="#f6d78a" stroke-width="2.5"/>
<rect x="34" y="78" width="172" height="10" rx="5" fill="#e9b949"/>
</svg>`;
}

const MAPART = (() => {
  const rand = rng(11);
  let s = '';
  for (let i = 0; i < 9; i++) s += `<path d="M${-20 + i * 70} -10 L${30 + i * 70 + rand() * 40} 420" stroke="#e9b949" stroke-opacity=".12" stroke-width="${1 + rand() * 2}"/>`;
  for (let i = 0; i < 7; i++) s += `<path d="M-10 ${20 + i * 60} L520 ${40 + i * 60 + rand() * 30}" stroke="#e9b949" stroke-opacity=".12" stroke-width="${1 + rand() * 2}"/>`;
  return `<svg class="mapart" viewBox="0 0 500 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${s}<path d="M-10 90 C 160 70 300 40 520 -10" stroke="#e9b949" stroke-opacity=".35" stroke-width="10"/><circle cx="250" cy="190" r="120" fill="url(#g-halo)"/></svg>`;
})();

// ---------- menu helpers ----------
const allItems = menu.sections.flatMap((s) => s.items.map((i) => ({ ...i, section: s })));
const byName = (name, sec) => allItems.find((i) => i.name === name && (!sec || i.section.id === sec));
const priceText = (it) => {
  const ps = it.variants.map((v) => v.price).filter((p) => p != null);
  if (!ps.length) return 'Ask for price';
  const lo = Math.min(...ps), hi = Math.max(...ps);
  return lo === hi ? inr(lo) : `${inr(lo)} – ${inr(hi)}`;
};
const counts = {
  dishes: menu.sections.filter((s) => s.kind === 'food').reduce((n, s) => n + s.items.length, 0),
  drinks: menu.sections.filter((s) => s.kind === 'drinks').reduce((n, s) => n + s.items.length, 0),
  desserts: menu.sections.filter((s) => s.kind === 'desserts').reduce((n, s) => n + s.items.length, 0),
  vegDishes: allItems.filter((i) => i.section.kind === 'food' && i.variants.some((v) => v.diet === 'veg')).length,
};

// ---------- page shell ----------
const A = site.address;
const addressLine = `${A.street}, ${A.locality}, ${A.city}, ${A.region} ${A.postalCode}`;
function page({ path, title, description, rel, styles, body, scripts = '', jsonld = [], noindex = false }) {
  const url = SITE + path;
  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="${noindex ? 'noindex' : 'index, follow, max-image-preview:large'}">
<meta name="theme-color" content="#080d2c">
<meta name="geo.region" content="IN-${A.regionCode}">
<meta name="geo.placename" content="${esc(A.neighbourhood)}, ${esc(A.city)}">
<meta name="geo.position" content="${site.geo.lat};${site.geo.lng}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:locale" content="en_IN">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
${OG ? `<meta property="og:image" content="${SITE}${OG}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Spice of Asia, a lantern-lit Pan-Asian restaurant in Kalyan Nagar, Bengaluru">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE}${OG}">` : '<meta name="twitter:card" content="summary">'}
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<link rel="icon" href="${rel}${FAVICON}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${rel}${TOUCH}">
<link rel="manifest" href="${rel}site.webmanifest">
<link rel="alternate" type="text/markdown" href="${rel}menu.md" title="Spice of Asia menu (Markdown)">
<link rel="preload" href="${rel}${FONT}" as="font" type="font/woff2" crossorigin>
<style>${css(styles, rel)}</style>
<script>document.documentElement.classList.remove('no-js')</script>
${jsonld.map(ldjson).join('\n')}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${SPRITE}
${body}
${scripts ? `<script>${scripts}</script>` : ''}
</body>
</html>`.replace('<html lang="en-IN">', '<html lang="en-IN" class="no-js">');
}

const header = (rel, current) => `<header class="hdr${current === 'menu' ? ' is-solid' : ''}">
<a class="brand" href="${rel || './'}"><svg viewBox="-50 0 100 116" aria-hidden="true"><use href="#ln" x="-50" width="100" height="116"/></svg><span><b>Spice of Asia</b><small>Pan-Asian Restaurant</small><span class="sr-only">, home</span></span></a>
<nav class="nav" aria-label="Main"><a href="${rel}menu/"${current === 'menu' ? ' aria-current="page"' : ''}>Menu</a><a href="${rel || './'}#kitchens">Kitchens</a><a href="${rel || './'}#visit">Visit</a></nav>
<a class="btn btn--gold btn--sm" href="tel:${site.phone}" aria-label="Call Spice of Asia on ${site.phoneDisplay}">${I.phone}<span>Call</span></a>
</header>`;

const footer = (rel) => `<footer class="ftr">
<div class="wrap">
<div class="ftr__grid">
<div><h2>Spice of Asia</h2><p>A Pan-Asian restaurant with seven kitchens under one lantern-lit roof.</p><p lang="zh" aria-hidden="true" style="color:#ff6b6b;letter-spacing:.3em">亞洲香料</p></div>
<div><h3>Find us</h3><address style="font-style:normal"><p>${esc(A.street)}<br>${esc(A.locality)}, ${esc(A.city)} ${esc(A.postalCode)}<br>${esc(A.region)}, India</p></address><p><a href="${esc(site.mapsUrl)}" rel="noopener" target="_blank">Get directions</a></p></div>
<div><h3>Hours &amp; reservations</h3><p>${esc(site.hours.days)}, ${esc(site.hours.display)}</p><p>Call to reserve: <a href="tel:${site.phone}">${esc(site.phoneDisplay)}</a></p></div>
<div><h3>Explore</h3><ul><li><a href="${rel}menu/">Full menu</a></li><li><a href="${rel}menu/#soups">Soups</a></li><li><a href="${rel}menu/#mojitos">Drinks &amp; boba</a></li><li><a href="${rel || './'}#faq">FAQ</a></li></ul></div>
</div>
<div class="ftr__base"><span>© ${new Date().getFullYear()} Spice of Asia, Bengaluru</span>
<details><summary>Photo credits</summary><ul>${credits.map((c) => `<li>“${esc(c.title)}”, ${esc(c.creator || 'rawpixel')}, <a href="${esc(c.source)}" rel="noopener" target="_blank">rawpixel</a> (CC0)</li>`).join('')}</ul></details></div>
</div>
</footer>
<div class="callbar"><a class="btn btn--gold" href="tel:${site.phone}">${I.phone}Call to reserve</a></div>`;

// ---------- structured data ----------
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const restaurantLD = {
  '@type': 'Restaurant',
  '@id': SITE + '#restaurant',
  name: site.name,
  description: site.description,
  url: SITE,
  telephone: site.phone,
  ...(OG && { image: [SITE + OG] }),
  servesCuisine: ['Pan-Asian', ...site.cuisines],
  priceRange: site.priceRange,
  currenciesAccepted: 'INR',
  acceptsReservations: true,
  hasMenu: SITE + 'menu/',
  address: { '@type': 'PostalAddress', streetAddress: A.street, addressLocality: `${A.locality}, ${A.city}`, addressRegion: A.region, postalCode: A.postalCode, addressCountry: A.country },
  geo: { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lng },
  hasMap: site.mapsUrl,
  areaServed: ['Kalyan Nagar', 'HRBR Layout', 'Banaswadi', 'Kammanahalli', 'Bengaluru'],
  openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: DAYS, opens: site.hours.opens, closes: site.hours.closes }],
};

// ---------- home page ----------
const kitchens = [
  { name: 'Korean', glyph: '한식', lang: 'ko', line: 'Gochujang heat, sticky glazes and serious crunch.', dishes: [['Korean Fried Chicken'], ['Tteokbokki'], ['Kimbap'], ['Kimchi Ramen']] },
  { name: 'Chinese', glyph: '中餐', lang: 'zh', line: 'Wok smoke, Schezwan fire and dumplings by the basket.', dishes: [['Hot & Sour Soup'], ['Dragon Chicken'], ['Hakka Noodles'], ['Chicken Juicy Dim Sums']] },
  { name: 'Thai', glyph: 'ไทย', lang: 'th', line: 'Basil, lemongrass and coconut: sour, sweet, salty and hot.', dishes: [['Tom Yum Soup'], ['Thai Curry with Jasmine Rice'], ['Thai Basil Crispy Chicken'], ['Mango Sticky Rice']] },
  { name: 'Singaporean', glyph: '狮城', lang: 'zh', line: 'Curry-scented noodles in the hawker-centre style.', dishes: [['Singapore Noodles']] },
  { name: 'Malaysian', glyph: 'Melayu', lang: 'ms', line: 'Nasi goreng, flat noodles and Malaysian chilli.', dishes: [['Nasi Goreng Fried Rice'], ['Malaysian Flat Noodles'], ['Malaysian Chilli Seafood']] },
  { name: 'Burmese', glyph: 'မြန်မာ', lang: 'my', line: 'Khao suey, the coconut curry noodle soup of Myanmar.', dishes: [['Burmese Khao Suey']] },
  { name: 'Tibetan', glyph: 'བོད', lang: 'bo', line: 'Steaming thukpa and momos from the mountains.', dishes: [['Tibetan Thukpa'], ['Veg Momos'], ['Chicken Jhol Momos']] },
];
for (const k of kitchens) for (const d of k.dishes) if (!byName(d[0])) throw new Error('Kitchen dish not on menu: ' + d[0]);

const stalls = [
  ['dim-sum-table', 'Dim sum & momos', 'Steamed baskets with three sauces, veg and non-veg.', 'dumplings'],
  ['chilli-noodles', 'Noodles', 'Hakka, Singapore, Malaysian flat noodles and more.', 'noodles'],
  ['tom-yum', 'Soups', 'Tom yum, tom kha, thukpa, manchow and our house clear soup.', 'soups'],
  ['red-curry', 'Curries', 'Thai green, red or yellow curry and Masaman with jasmine rice.', 'curries'],
  ['wings', 'Chicken starters', 'Korean fried, Dragon, Devil’s and Wings on Fire.', 'chicken-starters'],
  ['prawn-rice', 'Fried rice', 'Nasi goreng, kimchi, burnt garlic and Thai basil.', 'fried-rice'],
  ['siu-mai', 'Seafood', 'Fish, octopus, prawns and squid, in eight styles.', 'seafood-starters'],
  ['wok-noodles', 'Wok mains', 'Pick a sauce, then veg, chicken or seafood.', 'wok-mains'],
];
const img = (key, alt, sizes) => {
  const [a, m, b] = photos[key];
  return `<img src="${b.path}" srcset="${a.path} 480w, ${m.path} 720w, ${b.path} 960w" sizes="${sizes}" width="960" height="720" alt="${esc(alt)}" loading="lazy" decoding="async">`;
};

const specials = [
  ['Spice of Asia Clear Soup', 'soups', 'House soup', 'Our own clear broth, with veg, chicken or seafood.'],
  ['Spice of Asia Special Drums', 'chicken-starters', 'House starter', 'Chicken drumsticks, done the Spice of Asia way.'],
  ['Burmese Khao Suey', 'curries', 'Burmese', 'Coconut curry noodle soup with veg, chicken or seafood.'],
  ['Korean Fried Chicken', 'chicken-starters', 'Korean', 'Crisp, glossy and made for sharing.'],
  ['Spice of Asia Special', 'signature-mocktails', 'House mocktail', 'The bar’s own signature cooler.'],
  ['Mango Sticky Rice', 'desserts', 'Thai dessert', 'Sweet coconut sticky rice with mango.'],
];
const seals = ['湯', '雞', '麵', '炸', '飲', '甜'];

const faqs = [
  ['Where is Spice of Asia?', `Spice of Asia is at ${addressLine}, in the HRBR Layout and Kalyan Nagar area of North-East Bengaluru.`],
  ['What are the opening hours?', `We are open ${site.hours.days.toLowerCase()}, from ${site.hours.display}.`],
  ['What cuisines does Spice of Asia serve?', `We are a Pan-Asian restaurant with seven kitchens: ${site.cuisines.join(', ').replace(/, ([^,]*)$/, ' and $1')}. You will also find Japanese-style ramen, gyoza and tempura, and Vietnamese rice paper rolls.`],
  ['Are there vegetarian options?', `Yes. ${counts.vegDishes} of our ${counts.dishes} dishes come in a vegetarian version, and every dish on the online menu is marked veg or non-veg. Use the Veg filter on the menu page to see only vegetarian food.`],
  ['How do I reserve a table?', `Call us on ${site.phoneDisplay} to reserve a table.`],
  ['How much does a meal cost?', `A meal for two costs about ${inr(site.costForTwo)}, depending on what you order. Soups start at ${inr(200)} and most mains are between ${inr(355)} and ${inr(510)}.`],
  ['Do you serve seafood?', 'Yes. Seafood starters come with your choice of fish, octopus, prawns or squid, and most soups, rice, noodles and mains have a seafood version made with fish, prawns and squid.'],
  ['What drinks do you have?', `Our bar has ${counts.drinks} drinks: mojitos, classic and signature mocktails, milkshakes, frappuccinos, iced teas, Asian lattes like matcha and Thai milk tea, popping boba and soft drinks.`],
];

const homeBody = `${header('', 'home')}
<main id="main">
<section class="hero" aria-labelledby="hero-title">
<div class="stars" aria-hidden="true"></div>
<div class="moon" aria-hidden="true"></div>
${clouds()}
<div class="strings strings--back" aria-hidden="true">${lanternString({ seed: 4, ropes: [{ y0: 30, yc: 120, y1: 24, count: 12, size: 40, drop: 22, op: 0.22, amber: 0.35, gap: 0.16 }] })}</div>
<div class="strings strings--front" aria-hidden="true">${lanternString({ seed: 9, ropes: [{ y0: -10, yc: 120, y1: 10, count: 10, size: 72, drop: 40, gap: 0.24 }] })}</div>
<div class="strings strings--mobile" aria-hidden="true">${lanternString({ seed: 31, w: 420, h: 220, ropes: [{ y0: 4, yc: 90, y1: 0, count: 6, size: 40, drop: 30, op: 0.4 }] })}</div>
${skyLanterns(11, 3)}
<div class="skyline skyline--far" aria-hidden="true">${skyline({ seed: 21, fill: '#2a0f3d', windows: false, scale: 0.8, h: 200, pagodas: [1100] })}</div>
<div class="skyline" aria-hidden="true">${skyline({ seed: 5, fill: '#05061a', scale: 1, pagodas: [290] })}</div>
<div class="hero__inner">
<p class="eyebrow">HRBR Layout · Kalyan Nagar · Bengaluru</p>
<h1 id="hero-title">Spice of Asia<span class="h1-sub">Pan-Asian restaurant in Kalyan Nagar</span></h1>
<p class="hanzi" lang="zh" aria-hidden="true"><span>亞</span><span>洲</span><span>香</span><span>料</span></p>
<p class="hero__lede">Seven kitchens under one lantern-lit sky: Korean, Chinese, Thai, Singaporean, Malaysian, Burmese and Tibetan food, with a bar full of mocktails and popping boba.</p>
<div class="cta"><a class="btn btn--gold" href="tel:${site.phone}">${I.phone}Call to reserve</a><a class="btn btn--ghost" href="menu/">View the menu${I.arrow}</a></div>
<p class="hero__meta"><span>Open daily, ${esc(site.hours.display)}</span><span>About ${inr(site.costForTwo)} for two</span><span>${counts.dishes + counts.drinks + counts.desserts}+ dishes &amp; drinks</span></p>
</div>
<span class="scrollcue" aria-hidden="true"></span>
</section>

<section class="sec kitchens" id="kitchens" aria-labelledby="k-title">
${DRAGON}
<div class="wrap">
<div class="sec__head reveal"><p class="kicker">The night market</p><h2 id="k-title">Seven kitchens, one table</h2><p>Follow the dragon across Asia. Each lantern is a kitchen, and each dish links straight to its place on the menu.</p></div>
<div class="rope" aria-hidden="true"><svg viewBox="0 0 1200 40" preserveAspectRatio="none"><path d="M0 4Q600 60 1200 4" fill="none" stroke="#e9b949" stroke-opacity=".45" stroke-width="1.5"/></svg></div>
<ul class="klist">
${kitchens.map((k) => `<li class="kitchen"><div class="kitchen__lantern"><svg viewBox="-60 -10 120 136" aria-hidden="true" focusable="false"><circle class="halo" cx="0" cy="48" r="60" fill="url(#g-halo)"/><use href="#ln" x="-50" y="0" width="100" height="116"/></svg><span class="kitchen__glyph" lang="${k.lang}" aria-hidden="true">${k.glyph}</span></div>
<h3>${k.name}</h3><p>${k.line}</p><ul>${k.dishes.map(([n]) => `<li><a href="menu/#${byName(n).id}">${esc(n)}</a></li>`).join('')}</ul></li>`).join('\n')}
</ul>
</div>
</section>

<section class="sec stalls" id="stalls" aria-labelledby="s-title">
<div class="wrap">
<div class="sec__head reveal"><p class="kicker">Walk the stalls</p><h2 id="s-title">What’s cooking tonight</h2><p>${counts.dishes} dishes across soups, starters, dumplings, wok mains, curries, rice, noodles and ramen.</p></div>
<div class="stalls__row">
${stalls.map(([k, t, p, sec]) => `<a class="stall" href="menu/#${sec}"><div class="awning" aria-hidden="true"></div><span class="stall__glow" aria-hidden="true"></span>${img(k, t, '(max-width:600px) 78vw, 330px')}<div class="stall__body"><h3>${esc(t)}</h3><p>${esc(p)}</p><span class="stall__go">See on the menu →</span></div></a>`).join('\n')}
</div>
<p class="fineprint">Photos are for illustration only and are not of our dishes.</p>
</div>
</section>

<section class="sec specials" id="specials" aria-labelledby="sp-title">
<div class="wrap">
<div class="sec__head reveal"><p class="kicker">From our house</p><h2 id="sp-title">Lantern specials</h2><p>Dishes with our name on them, and a few the whole table should share.</p></div>
<ul class="tickets">
${specials.map(([n, sec, tag, line], i) => { const it = byName(n, sec); return `<li class="ticket reveal"><span class="ticket__seal" lang="zh" aria-hidden="true">${seals[i]}</span><small>${esc(tag)}</small><h3>${esc(n)}</h3><p>${esc(line)}</p><span class="ticket__price">${priceText(it)}</span><a href="menu/#${it.id}" aria-label="${esc(n)} on the menu"></a></li>`; }).join('\n')}
</ul>
</div>
</section>

<section class="sec bar" id="bar" aria-labelledby="b-title">
<div class="wrap bar__grid">
<div class="bar__art reveal">${bobaGlass()}</div>
<div class="reveal">
<p class="kicker">The boba &amp; mocktail bar</p>
<h2 id="b-title">Coolers for a warm night</h2>
<p class="bar__count">${counts.drinks}</p>
<p>drinks, from a virgin mojito to Thai milk tea, a Dragon Blood Punch or a glass of popping boba.</p>
<ul class="chips">
${menu.sections.filter((s) => s.kind === 'drinks').map((s) => `<li><a href="menu/#${s.id}">${esc(s.title)} <b>${s.items.length}</b></a></li>`).join('')}
</ul>
<a class="btn btn--ghost" href="menu/#mojitos">See all drinks${I.arrow}</a>
</div>
</div>
</section>

<section class="sec visit" id="visit" aria-labelledby="v-title">
<div class="visit__bg" aria-hidden="true"><img src="${photos['lanterns-colour'][1].path}" srcset="${photos['lanterns-colour'][0].path} 480w, ${photos['lanterns-colour'][2].path} 960w" sizes="100vw" width="960" height="720" alt="" loading="lazy" decoding="async"></div>
<div class="wrap">
<div class="vcard reveal">
<div class="vcard__main">
<p class="kicker">Visit</p>
<h2 id="v-title">Find the lanterns in HRBR Layout</h2>
<dl class="vlist">
<div><dt>Address</dt><dd>${esc(A.street)},<br>${esc(A.locality)}, ${esc(A.city)}, ${esc(A.region)} ${esc(A.postalCode)}</dd></div>
<div><dt>Hours</dt><dd>${esc(site.hours.days)}, ${esc(site.hours.display)}</dd></div>
<div><dt>Reservations</dt><dd><a href="tel:${site.phone}">${esc(site.phoneDisplay)}</a></dd></div>
</dl>
<div class="cta" style="justify-content:flex-start"><a class="btn btn--gold" href="tel:${site.phone}">${I.phone}Call to reserve</a><a class="btn btn--ghost" href="${esc(site.mapsUrl)}" rel="noopener" target="_blank">${I.pin}Directions</a></div>
</div>
<a class="vcard__map" href="${esc(site.mapsUrl)}" rel="noopener" target="_blank" aria-label="Open Spice of Asia in Google Maps">${MAPART}<span class="vcard__pin"><svg viewBox="-50 0 100 116" aria-hidden="true"><use href="#ln" x="-50" width="100" height="116"/></svg>Open in Google Maps</span></a>
</div>
</div>
</section>

<section class="sec faq" id="faq" aria-labelledby="f-title">
<div class="wrap">
<div class="sec__head reveal"><p class="kicker">Good to know</p><h2 id="f-title">Questions, answered</h2></div>
<div class="faq__list">
${faqs.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n')}
</div>
</div>
</section>
</main>
${footer('')}`;

writeFileSync(join(OUT, 'index.html'), page({
  path: '',
  rel: '',
  title: 'Spice of Asia | Pan-Asian Restaurant in Kalyan Nagar, HRBR Layout, Bengaluru',
  description: `Lantern-lit Pan-Asian restaurant in HRBR Layout, Kalyan Nagar, Bengaluru. Korean, Chinese, Thai, Singaporean, Malaysian, Burmese and Tibetan food, plus mocktails and boba. Open daily ${site.hours.display}.`,
  styles: ['base', 'home'],
  body: homeBody,
  scripts: js('home'),
  jsonld: [{ '@context': 'https://schema.org', '@graph': [
    restaurantLD,
    { '@type': 'WebSite', '@id': SITE + '#website', url: SITE, name: site.name, inLanguage: 'en-IN', publisher: { '@id': SITE + '#restaurant' } },
    { '@type': 'FAQPage', '@id': SITE + '#faq', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ] }],
}));

// ---------- menu page ----------
const mark = (d) => (d === 'veg' ? '<span class="mark mark--veg" role="img" aria-label="Vegetarian"></span>' : d === 'nonveg' ? '<span class="mark mark--nonveg" role="img" aria-label="Non-vegetarian"></span>' : '<span class="mark" style="visibility:hidden" aria-hidden="true"></span>');
const groups = { food: 'From the kitchen', drinks: 'From the bar', desserts: 'Something sweet' };
function itemHTML(it, s) {
  const single = it.variants.length === 1;
  const v0 = it.variants[0];
  const search = [it.name, it.cuisine, s.title, it.note, ...it.variants.map((v) => v.label)].filter(Boolean).join(' ');
  const left = single || it.diet !== 'mixed' ? mark(it.diet) : mark(null);
  const meta = [it.cuisine && `<span class="tag">${esc(it.cuisine)}</span>`, it.spicy && '<span class="spicy">🌶 Spicy</span>'].filter(Boolean).join('');
  const vars = single ? '' : `<ul class="vars">${it.variants.map((v) => `<li data-diet="${v.diet}">${mark(v.diet)}${esc(v.label)} <b>${inr(v.price)}</b></li>`).join('')}</ul>`;
  const notes = [it.note].filter(Boolean);
  return `<li class="item" id="${it.id}" data-diet="${it.diet || ''}" data-search="${esc(search)}">${left}<div class="item__main"><div class="item__top"><h3>${esc(it.name)}</h3>${single ? `<span class="dots" aria-hidden="true"></span>${v0.price == null ? '<span class="price price--ask">Ask for price</span>' : `<span class="price">${inr(v0.price)}</span>`}` : ''}</div>${meta ? `<div class="meta">${meta}</div>` : ''}${vars}${notes.length ? `<p class="note">${esc(notes.join(' · '))}</p>` : ''}</div></li>`;
}
let lastKind = null;
const sectionsHTML = menu.sections.map((s) => {
  const g = s.kind !== lastKind ? `<h2 class="group-title" id="group-${s.kind}">${groups[s.kind]}</h2>` : '';
  lastKind = s.kind;
  return `${g}<section class="msec" id="${s.id}" aria-labelledby="h-${s.id}"><div class="msec__head"><svg viewBox="-50 0 100 116" aria-hidden="true" focusable="false"><use href="#${s.kind === 'food' ? 'ln' : 'la'}" x="-50" width="100" height="116"/></svg><div><h2 id="h-${s.id}">${esc(s.title)}</h2><p>${esc(s.subtitle)}${s.items.some((i) => i.seafood_note) ? '. Seafood means fish, prawns and squid.' : ''}</p></div></div><ul class="items">${s.items.map((it) => itemHTML(it, s)).join('')}</ul></section>`;
}).join('\n');
let lastK2 = null;
const chips = menu.sections.map((s) => { const sep = lastK2 && s.kind !== lastK2 ? '<span class="sep" aria-hidden="true"></span>' : ''; lastK2 = s.kind; return `${sep}<a href="#${s.id}">${esc(s.title)}</a>`; }).join('');

const menuLD = {
  '@type': 'Menu',
  '@id': SITE + 'menu/#menu',
  name: 'Spice of Asia menu',
  url: SITE + 'menu/',
  inLanguage: 'en-IN',
  hasMenuSection: menu.sections.map((s) => ({
    '@type': 'MenuSection',
    name: s.title,
    description: s.subtitle,
    url: SITE + 'menu/#' + s.id,
    hasMenuItem: s.items.map((it) => ({
      '@type': 'MenuItem',
      name: it.name,
      url: SITE + 'menu/#' + it.id,
      ...(it.note && { description: it.note }),
      ...(it.diet === 'veg' && { suitableForDiet: 'https://schema.org/VegetarianDiet' }),
      ...(it.variants.some((v) => v.price != null) && {
        offers: it.variants.filter((v) => v.price != null).map((v) => ({ '@type': 'Offer', ...(v.label && { name: v.label }), price: String(v.price), priceCurrency: 'INR' })),
      }),
    })),
  })),
};

const menuBody = `${header('../', 'menu')}
<main id="main">
<div class="mhero">
<div class="strings" aria-hidden="true">${lanternString({ seed: 12, h: 220, ropes: [{ y0: -6, yc: 80, y1: 0, count: 11, size: 44, drop: 26, op: 0.3 }] })}</div>
<div class="wrap">
<p class="crumbs"><a href="../">Home</a> / Menu</p>
<h1>The Menu</h1>
<p>${counts.dishes} dishes, ${counts.drinks} drinks and ${counts.desserts} desserts from seven Asian kitchens. Search for a favourite, jump to a category, or switch to veg only.</p>
<p class="legend"><span><span class="mark mark--veg" aria-hidden="true"></span>Vegetarian</span><span><span class="mark mark--nonveg" aria-hidden="true"></span>Non-vegetarian</span><span>🌶 Spicy</span><span>Prices in ₹</span></p>
</div>
</div>
<div class="tools">
<div class="wrap tools__row">
<label class="search"><span class="sr-only">Search the menu</span>${I.search}<input id="q" type="search" placeholder="Search dishes, e.g. momos, tom yum, boba" autocomplete="off" enterkeyhint="search"></label>
<div class="diet" role="group" aria-label="Filter by diet"><button type="button" data-diet="all" aria-pressed="true" aria-label="All dishes"><span class="lbl">All</span></button><button type="button" data-diet="veg" aria-pressed="false" aria-label="Veg only"><span class="mark mark--veg" aria-hidden="true"></span><span class="lbl">Veg</span></button><button type="button" data-diet="nonveg" aria-pressed="false" aria-label="Non-veg only"><span class="mark mark--nonveg" aria-hidden="true"></span><span class="lbl">Non-veg</span></button></div>
</div>
<nav class="cats" aria-label="Menu categories">${chips}</nav>
</div>
<div class="wrap menu">
${sectionsHTML}
<p class="empty" id="empty" hidden>Nothing matches that search. Try another word, or switch the filter back to All.</p>
<div class="menu__foot"><p>Desserts are not marked veg or non-veg; please ask our team if you avoid egg. Prices can change, so please check with us when you order.</p><p>To reserve a table, call <a href="tel:${site.phone}">${esc(site.phoneDisplay)}</a>.</p></div>
</div>
</main>
<a class="totop" href="#main" aria-label="Back to top">${I.up}</a>
${footer('../')}`;

mkdirSync(join(OUT, 'menu'), { recursive: true });
writeFileSync(join(OUT, 'menu', 'index.html'), page({
  path: 'menu/',
  rel: '../',
  title: 'Menu | Spice of Asia, Pan-Asian Restaurant in Kalyan Nagar, Bengaluru',
  description: `Full menu with prices: ${counts.dishes} Pan-Asian dishes (soups, momos, dim sum, Korean fried chicken, Thai curries, khao suey, ramen, noodles), ${counts.drinks} mocktails, shakes and boba, and desserts. Veg and non-veg marked.`,
  styles: ['base', 'menu'],
  body: menuBody,
  scripts: js('menu'),
  jsonld: [{ '@context': 'https://schema.org', '@graph': [
    { ...restaurantLD, hasMenu: { '@id': SITE + 'menu/#menu' } },
    menuLD,
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE }, { '@type': 'ListItem', position: 2, name: 'Menu', item: SITE + 'menu/' }] },
  ] }],
}));

// ---------- 404 ----------
const base404 = new URL(SITE).pathname; // absolute paths, because a 404 can be served at any depth
writeFileSync(join(OUT, '404.html'), page({
  path: '404.html',
  rel: base404,
  title: 'Page not found | Spice of Asia',
  description: 'This page does not exist. Head back to the Spice of Asia home page or menu.',
  styles: ['base', 'home'],
  noindex: true,
  body: `${header(base404, '')}<main id="main"><section class="hero" aria-labelledby="nf"><div class="stars" aria-hidden="true"></div><div class="strings strings--front" aria-hidden="true">${lanternString({ seed: 2, ropes: [{ y0: -10, yc: 140, y1: 10, count: 5, size: 70, drop: 50 }] })}</div><div class="skyline" aria-hidden="true">${skyline({ seed: 5, fill: '#05061a', pagodas: [290] })}</div><div class="hero__inner"><p class="eyebrow">404</p><h1 id="nf" style="font-size:clamp(2.6rem,8vw,5rem)">This lantern has gone out</h1><p class="hero__lede">We couldn’t find that page. The menu is always lit, though.</p><div class="cta"><a class="btn btn--gold" href="${base404}menu/">View the menu</a><a class="btn btn--ghost" href="${base404}">Home</a></div></div></section></main>${footer(base404)}`,
  scripts: "document.querySelector('.hdr').classList.add('is-solid')",
}));

// ---------- crawler & AI files ----------
writeFileSync(join(OUT, 'robots.txt'), `# Spice of Asia — all crawlers, including AI assistants, are welcome.
User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: ${SITE}sitemap.xml
`);

writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${SITE}</loc><lastmod>${BUILD_DATE}</lastmod><changefreq>monthly</changefreq><priority>1.0</priority></url>
<url><loc>${SITE}menu/</loc><lastmod>${BUILD_DATE}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>
</urlset>
`);

const mdPrice = (v) => (v.price == null ? 'ask for price' : inr(v.price));
const mdDiet = (d) => (d === 'veg' ? ' (veg)' : d === 'nonveg' ? ' (non-veg)' : '');
const menuMd = `# Spice of Asia — Menu

Pan-Asian restaurant, ${addressLine}. Phone ${site.phoneDisplay}. Open ${site.hours.days.toLowerCase()}, ${site.hours.display}.
All prices in Indian Rupees (INR). Web page: ${SITE}menu/

${menu.sections.map((s) => `## ${s.title}\n\n${s.subtitle}.\n\n${s.items.map((it) => {
  if (it.variants.length === 1) return `- ${it.name}${mdDiet(it.diet)}: ${mdPrice(it.variants[0])}${it.cuisine ? ` — ${it.cuisine}` : ''}${it.spicy ? ', spicy' : ''}${it.note ? `. ${it.note}` : ''}`;
  return `- ${it.name}${it.cuisine ? ` — ${it.cuisine}` : ''}${it.spicy ? ', spicy' : ''}: ${it.variants.map((v) => `${v.label}${mdDiet(v.diet)} ${mdPrice(v)}`).join('; ')}${it.note ? `. ${it.note}` : ''}${it.seafood_note ? '. Seafood is fish, prawns and squid' : ''}`;
}).join('\n')}`).join('\n\n')}
`;
writeFileSync(join(OUT, 'menu.md'), menuMd);

writeFileSync(join(OUT, 'llms.txt'), `# Spice of Asia

> ${site.description}

- Address: ${addressLine}, India
- Phone and reservations: ${site.phoneDisplay} (reservations by phone call)
- Hours: ${site.hours.days}, ${site.hours.display}
- Average cost: about ${inr(site.costForTwo)} for two
- Cuisines: ${site.cuisines.join(', ')} (plus Japanese-style ramen, gyoza and tempura, and Vietnamese rice paper rolls)
- Menu size: ${counts.dishes} dishes (${counts.vegDishes} available vegetarian), ${counts.drinks} drinks, ${counts.desserts} desserts
- Map: ${site.mapsUrl}

## Pages

- [Home](${SITE}): about the restaurant, the seven kitchens, house specials, location and FAQ
- [Menu](${SITE}menu/): the full menu with prices, veg/non-veg marks and categories
- [Menu in Markdown](${SITE}menu.md): the same menu as plain text, for AI assistants and tools

## Frequently asked questions

${faqs.map(([q, a]) => `### ${q}\n\n${a}`).join('\n\n')}
`);

writeFileSync(join(OUT, 'site.webmanifest'), JSON.stringify({
  name: 'Spice of Asia', short_name: 'Spice of Asia', description: site.description, start_url: './', scope: './', display: 'standalone',
  background_color: '#080d2c', theme_color: '#080d2c', icons: [{ src: ICON192, sizes: '192x192', type: 'image/png' }, { src: ICON512, sizes: '512x512', type: 'image/png' }, { src: FAVICON, sizes: 'any', type: 'image/svg+xml' }],
}, null, 1));

// Cloudflare Pages reads _headers; GitHub Pages ignores it.
writeFileSync(join(OUT, '_headers'), `/assets/*
  Cache-Control: public, max-age=31536000, immutable
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
/menu.md
  Content-Type: text/markdown; charset=utf-8
`);
writeFileSync(join(OUT, '.nojekyll'), '');

console.log(`Built ${SITE} → ${OUT}/ (${counts.dishes} dishes, ${counts.drinks} drinks, ${counts.desserts} desserts, ${Object.keys(photos).length} photos)`);
