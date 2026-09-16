/**
 * build.js  -  Single build script for crochetbysailee
 * -----------------------------------------------------------------------------
 * npm run build          -> full build (images + fonts + patch HTML)
 * npm run images         -> regenerate SVG placeholders only
 * npm run fonts          -> re-download Google Fonts only
 *
 * What it does:
 *  1. Reads docs/data/products.json for product/theme config
 *  2. Creates docs/ folder structure
 *  3. Generates SVG placeholder images for every product
 *  4. Downloads Google Fonts (woff2) to docs/fonts/
 *  5. Generates docs/css/fonts.css with @font-face rules
 *  6. Patches HTML to use local fonts instead of Google CDN
 * -----------------------------------------------------------------------------
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
const SITE_FILE = path.join(DOCS, 'data', 'site.json');

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const args        = process.argv.slice(2);
const IMAGES_ONLY = args.includes('--images-only');
const FONTS_ONLY  = args.includes('--fonts-only');
const FULL        = !IMAGES_ONLY && !FONTS_ONLY;

// -- Logging ----------------------------------------------------------------
const ok   = msg => console.log('  ✓ ' + msg);
const info = msg => console.log('  -> ' + msg);
const err  = msg => console.log('  ✗ ' + msg);
const head = msg => console.log('\n' + msg);

// -- HTTP helper ------------------------------------------------------------
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

// -- Ensure dir -------------------------------------------------------------
function mkdirp(dir) { fs.mkdirSync(dir, { recursive: true }); }

// -------------------------------------------------------------------------
// STEP 2  -  Font Download
// -------------------------------------------------------------------------

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
    `${fonts.script}:wght@400`,
  ].map(f => 'family=' + encodeURIComponent(f)).join('&');

  const GFONTS_URL = `https://fonts.googleapis.com/css2?${families}&display=swap`;

  info('Fetching font CSS from Google...');
  let css;
  try {
    css = await getText(GFONTS_URL);
    ok('Font CSS received');
  } catch (e) {
    err('Cannot reach Google Fonts: ' + e.message);
    err('Skipping font download  -  existing fonts will be used');
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

  // Download each font file  -  use index to avoid name collisions across subsets
  info(`Downloading ${faces.length} font files...`);
  const saved = [];
  for (let i = 0; i < faces.length; i++) {
    const f    = faces[i];
    const file = `${f.family.toLowerCase().replace(/\s+/g,'-')}-${f.style}-${f.weight}-${i}.woff2`;
    const dest = path.join(FONTS_DIR, file);
    try {
      fs.writeFileSync(dest, await get(f.srcUrl));
      saved.push({ ...f, file });
    } catch (e) {
      err(`Failed: ${file}  -  ${e.message}`);
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

// -------------------------------------------------------------------------
// MAIN
// -------------------------------------------------------------------------

(async function main() {
  console.log('\n--------------------------------------------');
  console.log('  crochetbysailee  -  Build');
  if (IMAGES_ONLY) console.log('  Mode: images only');
  if (FONTS_ONLY)  console.log('  Mode: fonts only');
  console.log('--------------------------------------------');

  // Read products
  if (!fs.existsSync(DATA_FILE)) {
    err(`Not found: ${DATA_FILE}`);
    process.exit(1);
  }
  const products = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')).products;

  // Read site config (theme lives in site.json now)
  const siteRaw = fs.existsSync(SITE_FILE)
    ? JSON.parse(fs.readFileSync(SITE_FILE, 'utf8'))
    : {};
  const theme = siteRaw.theme;

  if (FULL || FONTS_ONLY)  await buildFonts(theme);

  console.log('\n--------------------------------------------');
  console.log('  Build complete  -  docs/ is ready to deploy');
  console.log('--------------------------------------------\n');

  if (FULL) {
    console.log('  Next steps:\n');
    console.log('    git add .');
    console.log('    git commit -m "Build"');
    console.log('    git push\n');
  }
})();