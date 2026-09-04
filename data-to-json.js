/**
 * data-to-json.js
 * -----------------------------------------------------------------------------
 * Converts products.csv -> docs/data/products.json
 *
 * Usage:  node data-to-json.js
 *         npm run data
 *
 * CSV rules:
 *  • Edit products.csv in Excel or Google Sheets
 *  • Use | to separate multiple values (colors, tags, images)
 *  • Leave a cell empty for optional fields (originalPrice, badge, etc.)
 *  • Columns starting with detail_ become the "details" table on the product page
 *  • featured / inStock: type  true  or  false
 * -----------------------------------------------------------------------------
 */

const fs   = require('fs');
const path = require('path');

const CSV_FILE  = path.join(__dirname, 'products.csv');
const JSON_FILE = path.join(__dirname, 'docs', 'data', 'products.json');

// -- CSV parser (handles quoted fields with commas inside) ------------------
function parseCSV(text) {
  const rows = [];
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;
    const row = [];
    let inQuote = false, cell = '';

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cell += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        row.push(cell.trim()); cell = '';
      } else {
        cell += ch;
      }
    }
    row.push(cell.trim());
    rows.push(row);
  }
  return rows;
}

// -- Helpers ----------------------------------------------------------------
const pipe  = v => v ? v.split('|').map(s => s.trim()).filter(Boolean) : [];
const num   = v => v ? Number(v) : null;
const bool  = v => v?.toLowerCase() === 'true';
const clean = v => v?.trim() || null;

// -- Main -------------------------------------------------------------------
(function main() {
  if (!fs.existsSync(CSV_FILE)) {
    console.error('✗  products.csv not found');
    process.exit(1);
  }

  const text    = fs.readFileSync(CSV_FILE, 'utf8');
  const rows    = parseCSV(text);
  const headers = rows[0];
  const dataRows = rows.slice(1).filter(r => r[0]?.trim());

  console.log(`\n  Reading ${dataRows.length} products from products.csv...\n`);

  const products = dataRows.map((row, idx) => {
    // Map header -> value
    const get = key => {
      const i = headers.indexOf(key);
      return i >= 0 ? row[i]?.trim() : '';
    };

    // Collect detail_ columns -> details object (skip empty values)
    const details = {};
    headers.forEach((h, i) => {
      if (h.startsWith('detail_') && row[i]?.trim()) {
        const label = h.replace('detail_', '');
        details[label] = row[i].trim();
      }
    });

    const product = {
      id:               get('id'),
      name:             get('name'),
      category:         get('category'),
      price:            Number(get('price')) || 0,
      originalPrice:    num(get('originalPrice')),
      badge:            clean(get('badge')),
      shortDescription: get('shortDescription'),
      description:      get('description'),
      details,
      colors:           pipe(get('colors')),
      thumbnail:        get('thumbnail'),
      images:           [get('image1'), get('image2'), get('image3'), get('image4')]
                          .filter(Boolean),
      tags:             pipe(get('tags')),
      featured:         bool(get('featured')),
      inStock:          get('inStock') === '' ? true : bool(get('inStock')),
      createdAt:        get('createdAt'),
    };

    console.log(`  ✓ [${idx + 1}] ${product.name} (${product.category})  -  ₹${product.price}`);
    return product;
  });

  // products.json contains ONLY the products array now
  fs.writeFileSync(JSON_FILE, JSON.stringify({ products }, null, 2) + '\n');

  console.log(`\n  Done - docs/data/products.json updated (${products.length} products)\n`);
  console.log('  Other config files (unchanged by this script):\n');
  console.log('    docs/data/site.json    <- brand, hero, theme, marquee');
  console.log('    docs/data/about.json   <- about text, stats, founders');
  console.log('    docs/data/contact.json <- email, instagram, whatsapp\n');
})();
