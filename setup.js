/**
 * setup.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Run once: node setup.js
 *
 * What it does:
 *  1. Downloads Google Fonts (Playfair Display, Inter, Dancing Script) locally
 *  2. Saves font files to docs/fonts/
 *  3. Generates docs/css/fonts.css with @font-face rules
 *  4. Patches both HTML files to use local fonts instead of Google CDN
 *  5. Creates .gitignore
 *  6. Prints the git commands to push to GitHub Pages
 * ─────────────────────────────────────────────────────────────────────────────
 */

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

const ROOT      = __dirname;
const FONTS_DIR = path.join(ROOT, 'docs', 'fonts');
const FONTS_CSS = path.join(ROOT, 'docs', 'css', 'fonts.css');

// Chrome UA → Google returns woff2 (best format)
const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const GFONTS_URL =
  'https://fonts.googleapis.com/css2?' +
  'family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400' +
  '&family=Inter:wght@300;400;500;600' +
  '&family=Dancing+Script:wght@600;700' +
  '&display=swap';

// ── Helpers ───────────────────────────────────────────────────────────────────

function get(reqUrl, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsed  = url.parse(reqUrl);
    const lib     = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      path:     parsed.path,
      headers:  { 'User-Agent': CHROME_UA, ...extraHeaders },
    };
    lib.get(options, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(get(res.headers.location, extraHeaders));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end',  () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function getText(reqUrl) {
  return get(reqUrl).then(buf => buf.toString('utf8'));
}

function slug(family, style, weight) {
  return `${family.toLowerCase().replace(/\s+/g, '-')}-${style}-${weight}.woff2`;
}

function log(msg) { process.stdout.write(msg + '\n'); }
function ok(msg)  { log('  ✓ ' + msg); }
function info(msg){ log('  → ' + msg); }

// ── Main ──────────────────────────────────────────────────────────────────────

(async function main() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('  crochetbysailee — Asset Setup');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Create dirs
  fs.mkdirSync(FONTS_DIR, { recursive: true });
  ok('docs/fonts/ directory ready');

  // 2. Fetch Google Fonts CSS
  info('Fetching Google Fonts CSS…');
  let gfontsCSS;
  try {
    gfontsCSS = await getText(GFONTS_URL);
    ok('Google Fonts CSS fetched');
  } catch (e) {
    log('\n  ✗ Could not reach Google Fonts: ' + e.message);
    log('  Make sure you have internet access, then re-run: node setup.js\n');
    process.exit(1);
  }

  // 3. Parse all @font-face blocks
  const faceRegex = /@font-face\s*\{([^}]+)\}/g;
  const urlRegex  = /src:\s*url\(([^)]+)\)\s*format\('woff2'\)/;
  const famRegex  = /font-family:\s*'([^']+)'/;
  const styRegex  = /font-style:\s*(\w+)/;
  const wgtRegex  = /font-weight:\s*(\d+)/;
  const uniRegex  = /unicode-range:\s*([^;]+)/;

  const faces = [];
  let match;
  while ((match = faceRegex.exec(gfontsCSS)) !== null) {
    const block   = match[1];
    const srcM    = block.match(urlRegex);
    const famM    = block.match(famRegex);
    const styM    = block.match(styRegex);
    const wgtM    = block.match(wgtRegex);
    const uniM    = block.match(uniRegex);
    if (srcM && famM && wgtM) {
      faces.push({
        family:  famM[1],
        style:   styM ? styM[1] : 'normal',
        weight:  wgtM[1],
        srcUrl:  srcM[1],
        unicode: uniM ? uniM[1].trim() : null,
      });
    }
  }
  ok(`Parsed ${faces.length} font variants`);

  // 4. Download each font file
  info(`Downloading ${faces.length} font files…`);
  const localFaces = [];

  for (const face of faces) {
    const filename = slug(face.family, face.style, face.weight) +
      // add index if multiple unicode subsets share same family/style/weight
      (localFaces.filter(f =>
        f.family === face.family && f.style === face.style && f.weight === face.weight
      ).length > 0 ? `-${localFaces.length}` : '');

    const destPath = path.join(FONTS_DIR, filename + '.woff2').replace('.woff2.woff2', '.woff2');
    const localSlug = slug(face.family, face.style, face.weight);
    const finalFile = localFaces.filter(f => f.file === localSlug + '.woff2').length > 0
      ? localSlug + `-${localFaces.length}.woff2`
      : localSlug + '.woff2';
    const finalPath = path.join(FONTS_DIR, finalFile);

    try {
      const buf = await get(face.srcUrl);
      fs.writeFileSync(finalPath, buf);
      localFaces.push({ ...face, file: finalFile });
      process.stdout.write('    ↓ ' + finalFile + '\n');
    } catch (e) {
      log('    ✗ Failed: ' + finalFile + ' — ' + e.message);
    }
  }
  ok(`${localFaces.length} font files saved to docs/fonts/`);

  // 5. Generate docs/css/fonts.css
  info('Generating docs/css/fonts.css…');
  const cssBlocks = localFaces.map(f => {
    const uniLine = f.unicode ? `\n  unicode-range: ${f.unicode};` : '';
    return `@font-face {
  font-family: '${f.family}';
  font-style: ${f.style};
  font-weight: ${f.weight};
  font-display: swap;
  src: url('../fonts/${f.file}') format('woff2');${uniLine}
}`;
  });
  fs.writeFileSync(FONTS_CSS, cssBlocks.join('\n\n') + '\n');
  ok('docs/css/fonts.css written (' + localFaces.length + ' @font-face rules)');

  // 6. Patch HTML files — replace Google Fonts <link> with local
  const HTML_FILES = [
    path.join(ROOT, 'docs', 'index.html'),
    path.join(ROOT, 'docs', 'product.html'),
  ];
  const gfontsLinkRegex =
    /<link[^>]+fonts\.googleapis\.com[^>]+>\s*(<link[^>]+fonts\.gstatic\.com[^>]+>)?/g;
  const localLink = '<link rel="stylesheet" href="css/fonts.css" />';

  for (const htmlFile of HTML_FILES) {
    if (!fs.existsSync(htmlFile)) continue;
    let html = fs.readFileSync(htmlFile, 'utf8');

    // Remove preconnect hints for Google Fonts
    html = html.replace(/<link[^>]+rel="preconnect"[^>]+googleapis[^>]*>\s*/g, '');
    html = html.replace(/<link[^>]+rel="preconnect"[^>]+gstatic[^>]*>\s*/g, '');

    // Replace the Google Fonts stylesheet link
    html = html.replace(/<link[^>]+fonts\.googleapis\.com\/css2[^>]*>/g, localLink);

    fs.writeFileSync(htmlFile, html, 'utf8');
    ok('Patched ' + path.basename(htmlFile));
  }

  // 7. Create .gitignore
  const gitignorePath = path.join(ROOT, '.gitignore');
  const gitignoreContent = `node_modules/
.DS_Store
Thumbs.db
*.log
`;
  fs.writeFileSync(gitignorePath, gitignoreContent);
  ok('.gitignore created');

  // 8. Summary
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('  Setup complete! Site is fully self-contained.');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  log('  Now push to GitHub Pages:\n');
  log('  git init');
  log('  git add .');
  log('  git commit -m "Initial commit"');
  log('  git branch -M main');
  log('  git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git');
  log('  git push -u origin main\n');
  log('  Then: GitHub repo → Settings → Pages → Branch: main / Folder: /docs\n');
})();
