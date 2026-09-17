/**
 * reviews-to-json.js
 * Converts reviews.csv -> docs/data/reviews.json
 * Usage: node reviews-to-json.js   or   npm run reviews
 *
 * CSV columns:
 *   product_id, reviewer, rating, title, review, date, verified
 */

const fs   = require('fs');
const path = require('path');

const CSV_FILE  = path.join(__dirname, 'reviews.csv');
const JSON_FILE = path.join(__dirname, 'docs', 'data', 'reviews.json');

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

(function main() {
  if (!fs.existsSync(CSV_FILE)) {
    console.error('reviews.csv not found');
    process.exit(1);
  }

  const rows    = parseCSV(fs.readFileSync(CSV_FILE, 'utf8'));
  const headers = rows[0];
  const data    = rows.slice(1).filter(r => r[0]?.trim());

  const get = (row, key) => {
    const i = headers.indexOf(key);
    return i >= 0 ? row[i]?.trim() : '';
  };

  // Group reviews by product_id
  const byProduct = {};
  data.forEach((row, idx) => {
    const pid = get(row, 'product_id');
    if (!pid) return;

    const review = {
      reviewer: get(row, 'reviewer'),
      rating:   Number(get(row, 'rating')) || 5,
      title:    get(row, 'title'),
      review:   get(row, 'review'),
      date:     get(row, 'date'),
    };

    if (!byProduct[pid]) byProduct[pid] = [];
    byProduct[pid].push(review);

    console.log(`  [${idx + 1}] ${pid} - ${review.reviewer} (${review.rating} stars)`);
  });

  fs.writeFileSync(JSON_FILE, JSON.stringify(byProduct, null, 2) + '\n');

  const totalReviews  = data.length;
  const totalProducts = Object.keys(byProduct).length;
  console.log(`\n  Done - ${totalReviews} reviews for ${totalProducts} products -> docs/data/reviews.json\n`);
})();
