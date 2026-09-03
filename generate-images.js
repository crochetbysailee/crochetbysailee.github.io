/**
 * Run once: node generate-images.js
 * Generates all SVG placeholder images for products.
 */
const fs   = require('fs');
const path = require('path');

const THUMB_DIR   = path.join(__dirname, 'images', 'thumbnails');
const PRODUCT_DIR = path.join(__dirname, 'images', 'products');

/* Teal-branded palette to match crochetbysailee logo */
const TEAL   = '#1B7878';
const TEAL_D = '#145F5F';
const TEAL_L = '#A8D5D5';
const GOLD   = '#E8C97A';

const PRODUCTS = [
  {
    id: 'ami-001', label: 'Amigurumi Bear',
    bg: [TEAL_L, '#C8E8E8'], accent: TEAL,
    icon: '🐻', views: ['main', 'side', 'detail', 'group']
  },
  {
    id: 'blk-002', label: 'Cloud Baby Blanket',
    bg: ['#D0E8E8', '#B8DEDE'], accent: TEAL_D,
    icon: '🌸', views: ['main', 'fold', 'detail', 'use']
  },
  {
    id: 'hat-003', label: 'Slouchy Ribbed Beanie',
    bg: ['#E8F4F4', '#D8ECEC'], accent: TEAL,
    icon: '🎩', views: ['main', 'side', 'stack', 'detail']
  },
  {
    id: 'bag-004', label: 'Sunflower Market Bag',
    bg: ['#FFF8E0', '#F5EEC0'], accent: GOLD,
    icon: '🌻', views: ['main', 'open', 'detail', 'use']
  },
  {
    id: 'cst-005', label: 'Boho Coaster Set',
    bg: ['#E0F0F0', '#CCE4E4'], accent: TEAL_D,
    icon: '☕', views: ['main', 'single', 'detail', 'style']
  },
  {
    id: 'scf-006', label: 'Chunky Infinity Scarf',
    bg: ['#D8ECEC', '#C4E0E0'], accent: TEAL,
    icon: '🧣', views: ['main', 'texture', 'worn', 'flat']
  },
  {
    id: 'hbd-007', label: 'Flower Headband',
    bg: ['#F0FAFA', '#DCF0F0'], accent: TEAL_L,
    icon: '💐', views: ['main', 'flat', 'detail', 'worn']
  },
  {
    id: 'bbt-008', label: 'Baby Booties',
    bg: ['#E4F5F5', '#CCE8E8'], accent: TEAL_D,
    icon: '👶', views: ['main', 'pair', 'detail', 'gift']
  }
];

function makeGrid(rows, cols, color, opacity = 0.12) {
  let lines = '';
  const gw = 400 / cols, gh = 400 / rows;
  for (let c = 1; c < cols; c++) lines += `<line x1="${c*gw}" y1="0" x2="${c*gw}" y2="400" stroke="${color}" stroke-width="1" opacity="${opacity}"/>`;
  for (let r = 1; r < rows; r++) lines += `<line x1="0" y1="${r*gh}" x2="400" y2="${r*gh}" stroke="${color}" stroke-width="1" opacity="${opacity}"/>`;
  return lines;
}

function makeWavePattern(color, y = 320, opacity = 0.15) {
  return `<path d="M0 ${y} Q50 ${y-20} 100 ${y} Q150 ${y+20} 200 ${y} Q250 ${y-20} 300 ${y} Q350 ${y+20} 400 ${y}" stroke="${color}" stroke-width="2" fill="none" opacity="${opacity}"/>`;
}

function makeCrochetDots(color, opacity = 0.1) {
  let dots = '';
  for (let x = 20; x < 400; x += 30) {
    for (let y = 20; y < 400; y += 30) {
      dots += `<circle cx="${x}" cy="${y}" r="3" fill="${color}" opacity="${opacity}"/>`;
    }
  }
  return dots;
}

function thumbnail(p) {
  const [c1, c2] = p.bg;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${c1}"/>
      <stop offset="100%" style="stop-color:${c2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="50%">
      <stop offset="0%" style="stop-color:${p.accent};stop-opacity:0.15"/>
      <stop offset="100%" style="stop-color:transparent"/>
    </radialGradient>
  </defs>
  <rect width="400" height="400" fill="url(#bg)"/>
  <rect width="400" height="400" fill="url(#glow)"/>
  ${makeCrochetDots(p.accent, 0.08)}
  ${makeWavePattern(p.accent, 300)}
  ${makeWavePattern(p.accent, 340)}

  <!-- Main icon circle -->
  <circle cx="200" cy="185" r="100" fill="${p.accent}" opacity="0.12"/>
  <circle cx="200" cy="185" r="80" fill="${p.accent}" opacity="0.1"/>
  <text x="200" y="210" font-family="sans-serif" font-size="80" text-anchor="middle">${p.icon}</text>

  <!-- Bottom label band -->
  <rect x="0" y="320" width="400" height="80" fill="${p.accent}" opacity="0.85"/>
  <text x="200" y="365" font-family="Georgia,serif" font-size="20" font-weight="700"
        fill="white" text-anchor="middle">${p.label}</text>
</svg>`;
}

function productView(p, view) {
  const [c1, c2] = p.bg;
  const viewLabels = {
    main: 'Main View', side: 'Side View', detail: 'Detail', group: 'Collection',
    fold: 'Folded', use: 'In Use', stack: 'Stacked', open: 'Open',
    single: 'Single', style: 'Styled', texture: 'Texture Close-up',
    worn: 'Worn', flat: 'Flat Lay', pair: 'Pair', gift: 'Gift Wrapped'
  };
  const viewLabel = viewLabels[view] || view;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
  <defs>
    <linearGradient id="bg${view}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${c1}"/>
      <stop offset="100%" style="stop-color:${c2}"/>
    </linearGradient>
    <radialGradient id="spot${view}" cx="50%" cy="45%" r="55%">
      <stop offset="0%" style="stop-color:white;stop-opacity:0.4"/>
      <stop offset="100%" style="stop-color:transparent"/>
    </radialGradient>
    <filter id="shadow${view}">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="${p.accent}" flood-opacity="0.2"/>
    </filter>
  </defs>

  <rect width="800" height="800" fill="url(#bg${view})"/>
  <rect width="800" height="800" fill="url(#spot${view})"/>
  ${makeGrid(16, 16, p.accent, 0.06)}
  ${[200,350,500].map(y => makeWavePattern(p.accent, y) + makeWavePattern(p.accent, y + 20)).join('')}

  <!-- Central feature circle -->
  <circle cx="400" cy="370" r="210" fill="${p.accent}" opacity="0.1" filter="url(#shadow${view})"/>
  <circle cx="400" cy="370" r="170" fill="${p.accent}" opacity="0.08"/>
  <circle cx="400" cy="370" r="130" fill="white" opacity="0.35"/>

  <!-- Icon -->
  <text x="400" y="415" font-family="sans-serif" font-size="130" text-anchor="middle">${p.icon}</text>

  <!-- View label pill -->
  <rect x="270" y="580" width="260" height="44" rx="22" fill="${p.accent}" opacity="0.9"/>
  <text x="400" y="608" font-family="sans-serif" font-size="18" font-weight="600"
        fill="white" text-anchor="middle">${viewLabel}</text>

  <!-- Product name -->
  <text x="400" y="680" font-family="Georgia,serif" font-size="26" font-weight="700"
        fill="${p.accent}" text-anchor="middle" opacity="0.85">${p.label}</text>

  <!-- Corner decorations -->
  <circle cx="60" cy="60" r="30" fill="${p.accent}" opacity="0.12"/>
  <circle cx="60" cy="60" r="16" fill="${p.accent}" opacity="0.15"/>
  <circle cx="740" cy="60" r="30" fill="${p.accent}" opacity="0.12"/>
  <circle cx="740" cy="60" r="16" fill="${p.accent}" opacity="0.15"/>
  <circle cx="60" cy="740" r="30" fill="${p.accent}" opacity="0.12"/>
  <circle cx="740" cy="740" r="30" fill="${p.accent}" opacity="0.12"/>
</svg>`;
}

let count = 0;

for (const p of PRODUCTS) {
  // Thumbnail
  const thumbPath = path.join(THUMB_DIR, `${p.id}-thumb.svg`);
  fs.writeFileSync(thumbPath, thumbnail(p));
  count++;

  // Product detail views
  for (const view of p.views) {
    const imgPath = path.join(PRODUCT_DIR, `${p.id}-${view}.svg`);
    fs.writeFileSync(imgPath, productView(p, view));
    count++;
  }
}

console.log(`✓ Generated ${count} SVG images.`);
