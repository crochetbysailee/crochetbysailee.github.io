/**
 * build.js — Single build script for crochetbysailee
 * 
 * npm run build          → full build (images + fonts + patch HTML)
 * npm run images         → regenerate SVG placeholders only
 * npm run fonts          → re-download Google Fonts only
 *
 * What it does:
 *  1. Reads docs/data/products.json for product/theme config
 *  2. Creates docs/ folder structure
 *  3. Generates SVG placeholder images for every product
 *  4. Downloads Google Fonts (woff2) to docs/fonts/
 *  5. Generates docs/css/fonts.css with @font-face rules
 *  6. Patches HTML to use local fonts instead of Google CDN
 * 
 */

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const ROOT      = __dirname;
const DOCS      = path.join(ROOT, 'docs');
const FONTS_DIR = path.join(DOCS, 'fonts');
const FONTS_CSS = path.join(DOCS, 'css', 'fonts.css');
const DATA_FILE = path.join(DOCS, 'data', 'products.json');

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const args        = process.argv.slice(2);
const IMAGES_ONLY = args.includes('--images-only');
const FONTS_ONLY  = args.includes('--fonts-only');
const FULL        = !IMAGES_ONLY && !FONTS_ONLY;

//  Logging 
const ok   = msg => console.log('  ✓ ' + msg);
const info = msg => console.log('  → ' + msg);
const err  = msg => console.log('  ✗ ' + msg);
const head = msg => console.log('\n' + msg);

//  HTTP helper 
function get(reqUrl) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(reqUrl);
    const lib    = parsed.protocol === 'https:' ? https : http;
    lib.get({ hostname: parsed.hostname, path: parsed.pathname + parsed.search,
              headers: { 'User-Agent': CHROME_UA } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(get(res.headers.location)); return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end',  () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}
const getText = url => get(url).then(b => b.toString('utf8'));

// ── Ensure dir 
function mkdirp(dir) { fs.mkdirSync(dir, { recursive: true }); }

// STEP 1 — SVG Image Generation

function buildImages(products) {
  head('[ Step 1 ] Generating SVG placeholder images');

  mkdirp(path.join(DOCS, 'images', 'thumbnails'));
  mkdirp(path.join(DOCS, 'images', 'products'));

  // Derive icon + colors from config theme or fall back to teal defaults
  const TEAL   = '#1B7878';
  const TEAL_D = '#145F5F';
  const TEAL_L = '#A8D5D5';
  const GOLD   = '#E8C97A';

  // Icon map by category
  const ICONS = {
    amigurumi:   '🐻', blankets: '🌸', accessories: '🎩',
    bags:        '🌻', home:     '☕', baby:         '👶',
    default:     '🧶'
  };

  // Color map by category
  const COLORS = {
    amigurumi:   { bg: [TEAL_L, '#C8E8E8'], accent: TEAL   },
    blankets:    { bg: ['#D0E8E8', '#B8DEDE'], accent: TEAL_D },
    accessories: { bg: ['#E8F4F4', '#D8ECEC'], accent: TEAL  },
    bags:        { bg: ['#FFF8E0', '#F5EEC0'], accent: GOLD  },
    home:        { bg: ['#E0F0F0', '#CCE4E4'], accent: TEAL_D },
    baby:        { bg: ['#E4F5F5', '#CCE8E8'], accent: TEAL_D },
    default:     { bg: [TEAL_L,   '#C8E8E8'], accent: TEAL   },
  };

  const viewLabels = {
    main: 'Main View', side: 'Side View', detail: 'Detail', group: 'Collection',
    fold: 'Folded', use: 'In Use', stack: 'Stacked', open: 'Open',
    single: 'Single', style: 'Styled', texture: 'Texture Close-up',
    worn: 'Worn', flat: 'Flat Lay', pair: 'Pair', gift: 'Gift Wrapped',
  };

  function makeCrochetDots(color, opacity = 0.08) {
    let d = '';
    for (let x = 20; x < 400; x += 30)
      for (let y = 20; y < 400; y += 30)
        d += `<circle cx="${x}" cy="${y}" r="3" fill="${color}" opacity="${opacity}"/>`;
    return d;
  }

  function makeWave(color, y, opacity = 0.15) {
    return `<path d="M0 ${y} Q50 ${y-20} 100 ${y} Q150 ${y+20} 200 ${y} Q250 ${y-20} 300 ${y} Q350 ${y+20} 400 ${y}" stroke="${color}" stroke-width="2" fill="none" opacity="${opacity}"/>`;
  }

  function thumbnail(label, icon, bg, accent) {
    const [c1, c2] = bg;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${c1}"/>
      <stop offset="100%" style="stop-color:${c2}"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#bg)"/>
  ${makeCrochetDots(accent)}
  ${makeWave(accent, 300)}${makeWave(accent, 340)}
  <circle cx="200" cy="185" r="100" fill="${accent}" opacity="0.12"/>
  <circle cx="200" cy="185" r="80"  fill="${accent}" opacity="0.1"/>
  <text x="200" y="210" font-family="sans-serif" font-size="80" text-anchor="middle">${icon}</text>
  <rect x="0" y="320" width="400" height="80" fill="${accent}" opacity="0.85"/>
  <text x="200" y="365" font-family="Georgia,serif" font-size="20" font-weight="700"
        fill="white" text-anchor="middle">${label}</text>
</svg>`;
  }

  function productView(label, icon, bg, accent, view) {
    const [c1, c2] = bg;
    const vl = viewLabels[view] || view;
    const id = view + Math.random().toString(36).slice(2,6);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
  <defs>
    <linearGradient id="bg${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${c1}"/>
      <stop offset="100%" style="stop-color:${c2}"/>
    </linearGradient>
    <radialGradient id="sp${id}" cx="50%" cy="45%" r="55%">
      <stop offset="0%" style="stop-color:white;stop-opacity:0.35"/>
      <stop offset="100%" style="stop-color:transparent"/>
    </radialGradient>
  </defs>
  <rect width="800" height="800" fill="url(#bg${id})"/>
  <rect width="800" height="800" fill="url(#sp${id})"/>
  <circle cx="400" cy="370" r="210" fill="${accent}" opacity="0.1"/>
  <circle cx="400" cy="370" r="130" fill="white"     opacity="0.35"/>
  <text x="400" y="415" font-family="sans-serif" font-size="130" text-anchor="middle">${icon}</text>
  <rect x="270" y="580" width="260" height="44" rx="22" fill="${accent}" opacity="0.9"/>
  <text x="400" y="608" font-family="sans-serif" font-size="18" font-weight="600"
        fill="white" text-anchor="middle">${vl}</text>
  <text x="400" y="680" font-family="Georgia,serif" font-size="26" font-weight="700"
        fill="${accent}" text-anchor="middle" opacity="0.85">${label}</text>
</svg>`;
  }

  let count = 0;

  for (const p of products) {
    const cat    = p.category || 'default';
    const clr    = COLORS[cat] || COLORS.default;
    const icon   = ICONS[cat]  || ICONS.default;
    const { bg, accent } = clr;

    // Extract view names from image paths in config
    const views = (p.images || []).map(imgPath => {
      const name = path.basename(imgPath, '.svg');
      return name.replace(p.id + '-', '');
    });

    // Thumbnail
    const thumbFile = path.join(DOCS, p.thumbnail);
    mkdirp(path.dirname(thumbFile));
    fs.writeFileSync(thumbFile, thumbnail(p.name, icon, bg, accent));
    count++;

    // Detail views
    for (const view of views) {
      const imgFile = path.join(DOCS, `images/products/${p.id}-${view}.svg`);
      mkdirp(path.dirname(imgFile));
      fs.writeFileSync(imgFile, productView(p.name, icon, bg, accent, view));
      count++;
    }
  }

  ok(`Generated ${count} SVG files`);
}

// STEP 2 — Font Download

async function buildFonts(theme) {
  head('[ Step 2 ] Downloading Google Fonts locally');
  mkdirp(FONTS_DIR);

  // Build Google Fonts URL from theme config
  const fonts = theme?.fonts || {
    serif: 'Playfair Display', sans: 'Inter', script: 'Dancing Script'
  };

  const families = [
    `${fonts.serif}:ital,wght@0,400;0,600;0,700;1,400`,
    `${fonts.sans}:wght@300;400;500;600`,
    `${fonts.script}:wght@600;700`,
  ].map(f => 'family=' + encodeURIComponent(f)).join('&');

  const GFONTS_URL = `https://fonts.googleapis.com/css2?${families}&display=swap`;

  info('Fetching font CSS from Google…');
  let css;
  try {
    css = await getText(GFONTS_URL);
    ok('Font CSS received');
  } catch (e) {
    err('Cannot reach Google Fonts: ' + e.message);
    err('Skipping font download — existing fonts will be used');
    return;
  }

  // Parse @font-face blocks
  const faceRx  = /@font-face\s*\{([^}]+)\}/g;
  const faces   = [];
  let m;
  while ((m = faceRx.exec(css)) !== null) {
    const b   = m[1];
    const src = b.match(/src:\s*url\(([^)]+)\)\s*format\('woff2'\)/);
    const fam = b.match(/font-family:\s*'([^']+)'/);
    const sty = b.match(/font-style:\s*(\w+)/);
    const wgt = b.match(/font-weight:\s*(\d+)/);
    const uni = b.match(/unicode-range:\s*([^;]+)/);
    if (src && fam && wgt) {
      faces.push({
        family: fam[1], style: sty?.[1] || 'normal',
        weight: wgt[1], srcUrl: src[1],
        unicode: uni?.[1]?.trim() || null,
      });
    }
  }
  ok(`Parsed ${faces.length} font variants`);

  // Download each font file — use index to avoid name collisions across subsets
  info(`Downloading ${faces.length} font files…`);
  const saved = [];
  for (let i = 0; i < faces.length; i++) {
    const f    = faces[i];
    const file = `${f.family.toLowerCase().replace(/\s+/g,'-')}-${f.style}-${f.weight}-${i}.woff2`;
    const dest = path.join(FONTS_DIR, file);
    try {
      fs.writeFileSync(dest, await get(f.srcUrl));
      saved.push({ ...f, file });
    } catch (e) {
      err(`Failed: ${file} — ${e.message}`);
    }
  }
  ok(`${saved.length} font files saved to docs/fonts/`);

  // Write fonts.css
  const cssOut = saved.map(f => {
    const uni = f.unicode ? `\n  unicode-range: ${f.unicode};` : '';
    return `@font-face {\n  font-family: '${f.family}';\n  font-style: ${f.style};\n  font-weight: ${f.weight};\n  font-display: swap;\n  src: url('../fonts/${f.file}') format('woff2');${uni}\n}`;
  }).join('\n\n');
  fs.writeFileSync(FONTS_CSS, cssOut + '\n');
  ok('docs/css/fonts.css written');

  // Patch HTML files
  const htmlFiles = ['index.html', 'product.html'].map(f => path.join(DOCS, f));
  for (const htmlFile of htmlFiles) {
    if (!fs.existsSync(htmlFile)) continue;
    let html = fs.readFileSync(htmlFile, 'utf8');
    html = html.replace(/<link[^>]+rel="preconnect"[^>]+googleapis[^>]*>\s*/g, '');
    html = html.replace(/<link[^>]+rel="preconnect"[^>]+gstatic[^>]*>\s*/g, '');
    html = html.replace(
      /<link[^>]+fonts\.googleapis\.com\/css2[^>]*>/g,
      '<link rel="stylesheet" href="css/fonts.css" />'
    );
    fs.writeFileSync(htmlFile, html);
    ok('Patched ' + path.basename(htmlFile));
  }
}

// MAIN

(async function main() {
  console.log('\n----------');
  console.log('  crochetbysailee — Build');
  if (IMAGES_ONLY) console.log('  Mode: images only');
  if (FONTS_ONLY)  console.log('  Mode: fonts only');
  console.log('----------');

  // Read config
  if (!fs.existsSync(DATA_FILE)) {
    err(`Config not found: ${DATA_FILE}`);
    err('Make sure docs/data/products.json exists before running the build.');
    process.exit(1);
  }
  const config   = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const products = config.products;
  const theme    = config.site?.theme;

  if (FULL || IMAGES_ONLY) buildImages(products);
  if (FULL || FONTS_ONLY)  await buildFonts(theme);

  console.log('\n----------');
  console.log('  Build complete — docs/ is ready to deploy');
  console.log('----------\n');

  if (FULL) {
    console.log('  Next steps:\n');
    console.log('    git add .');
    console.log('    git commit -m "Build"');
    console.log('    git push\n');
  }
})();