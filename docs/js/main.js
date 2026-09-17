/* -- main.js  (GitHub Pages static version) ---------------------------- */

const URL_PRODUCTS = 'data/products.json';
const URL_SITE     = 'data/site.json';
const URL_ABOUT    = 'data/about.json';
const URL_CONTACT  = 'data/contact.json';

let allProducts = [];
let siteConfig  = {};
let currency    = '₹';

// -- Bootstrap -------------------------------------------------------------
(async function init() {
  setupNav();
  setupReveal();
  document.getElementById('year').textContent = new Date().getFullYear();

  const safeJSON = url => fetch(url, { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); })
    .catch(e => { console.warn('Could not load', e.message); return {}; });

  try {
    const [prods, site, about, contact] = await Promise.all([
      safeJSON(URL_PRODUCTS),
      safeJSON(URL_SITE),
      safeJSON(URL_ABOUT),
      safeJSON(URL_CONTACT),
    ]);

    siteConfig = site;
    currency   = site.currency || '₹';

    applySiteConfig(site || {}, contact);
    buildAbout(about || {});
    buildFounders((about || {}).founders);
    loadReviews();
    buildFilters(prods.products || []);
    buildFeatured(prods.products.filter(p => p.featured));
    buildGrid(prods.products);
  } catch (err) {
    console.error('Failed to load products.json:', err);
    document.getElementById('productGrid').innerHTML =
      '<p style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--clr-text-2)">Could not load products.</p>';
  }
})();

// -- Site config ------------------------------------------------------------
function applySiteConfig(site, contact = {}) {
  const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.textContent = val; };

  if (site.name)    document.title = `${site.name} - ${site.tagline || ''}`;
  set('heroHeadline',  site.hero?.headline);
  set('heroSub',       site.hero?.subheadline);
  set('heroCta',       site.hero?.cta);
  set('footerTagline', site.footer?.tagline);

  // Contact  -  from separate contact.json, with click actions
  const waNum = (contact.whatsapp || '').replace(/\D/g, '');
  const igHandle = (contact.instagram || '').replace(/^@/, '');

  document.getElementById('contactEmail').textContent = contact.email    || '';
  document.getElementById('contactIg').textContent    = contact.instagram || '';
  document.getElementById('contactWa').textContent    = contact.whatsapp  || '';

  document.getElementById('contactEmailCard').href = contact.email
    ? `mailto:${contact.email}` : '#';
  document.getElementById('contactIgCard').href = igHandle
    ? `https://instagram.com/${igHandle}` : '#';
  document.getElementById('contactWaCard').href = waNum
    ? `https://wa.me/${waNum}` : '#';

  // Hero image  -  set src if configured, else section stays CSS-only
  const heroImg  = document.getElementById('heroImage');
  const heroWrap = document.getElementById('heroImageWrap');
  if (site.hero?.image && heroImg && heroWrap) {
    heroImg.src = site.hero?.image;
    heroImg.alt = site.name || '';
    heroWrap.classList.add('has-image');
  }

  if (site.theme) applyTheme(site.theme);
}

// -- Theme  -  applies site.theme from config as CSS custom properties --------
function applyTheme(theme) {
  if (!theme) return;
  const root = document.documentElement;
  const { colors, fonts, nav, marquee, about } = theme;

  // Colors -> CSS variables
  if (colors) {
    const map = {
      primary:     '--clr-primary',
      primaryDark: '--clr-primary-d',
      primaryLight:'--clr-primary-l',
      primaryXL:   '--clr-primary-xl',
      accent:      '--clr-accent',
      accentDark:  '--clr-accent-d',
      bg:          '--clr-bg',
      bgTint:      '--clr-bg-tint',
      text:        '--clr-text',
      textMuted:   '--clr-text-2',
      border:      '--clr-border',
      success:     '--clr-success',
    };
    Object.entries(map).forEach(([key, cssVar]) => {
      if (colors[key]) root.style.setProperty(cssVar, colors[key]);
    });
  }

  // Fonts -> CSS variables
  if (fonts) {
    if (fonts.serif)  root.style.setProperty('--ff-serif',  `'${fonts.serif}', Georgia, serif`);
    if (fonts.sans)   root.style.setProperty('--ff-sans',   `'${fonts.sans}', system-ui, sans-serif`);
    if (fonts.script) root.style.setProperty('--ff-script', `'${fonts.script}', cursive`);
  }

  // Nav height
  if (nav?.height) root.style.setProperty('--nav-h', nav.height);

  // Marquee text  -  split by | and duplicate for seamless scroll
  if (marquee?.text) {
    const items = marquee.text.split('|').map(t => `<span>${t.trim()}</span>`).join('');
    const track = document.querySelector('.marquee-track');
    if (track) track.innerHTML = items + items;   // duplicate for seamless loop
  }

  // About section
  if (about) {
    const headline = document.querySelector('.about__text .section__title');
    if (headline && about.headline) headline.innerHTML = about.headline;

    const paras = document.querySelectorAll('.about__text > p');
    if (about.body?.length) {
      about.body.forEach((text, i) => {
        if (paras[i]) paras[i].textContent = text;
      });
    }

    const stats = document.querySelectorAll('.about__stat');
    if (about.stats?.length) {
      about.stats.forEach((s, i) => {
        if (stats[i]) {
          stats[i].querySelector('.about__stat-num').textContent = s.value;
          stats[i].querySelector('span:last-child').textContent  = s.label;
        }
      });
    }
  }
}

// -- About section from config -------------------------------------------
function buildAbout(about) {
  if (!about) return;
  const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.innerHTML = val; };
  set('aboutEyebrow',  about.eyebrow);
  set('aboutHeadline', about.headline);
  if (about.paragraphs?.length >= 1) set('aboutPara1', about.paragraphs[0]);
  if (about.paragraphs?.length >= 2) set('aboutPara2', about.paragraphs[1]);

  const statsWrap = document.getElementById('aboutStats');
  if (statsWrap && about.stats?.length) {
    statsWrap.innerHTML = about.stats.map(s =>
      `<div class="about__stat">
        <span class="about__stat-num">${s.value}</span>
        <span>${s.label}</span>
      </div>`
    ).join('');
  }
}

// -- Founders grid from config -------------------------------------------
function buildFounders(founders) {
  const grid = document.getElementById('foundersGrid');
  const section = document.getElementById('founders');
  if (!grid || !founders?.length) { section?.remove(); return; }

  grid.innerHTML = founders.map(f => {
    const igHandle  = (f.instagram || '').replace(/^@/, '');
    const igLink    = igHandle ? `https://instagram.com/${igHandle}` : '#';
    const initials  = f.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const imgContent = f.image
      ? `<img class="founder-card__img" src="${f.image}" alt="${f.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><div class="founder-card__placeholder" style="display:none">${initials}</div>`
      : `<div class="founder-card__placeholder">${initials}</div>`;

    const bioLines = (f.bio || []).map(line => `<p>${line}</p>`).join('');

    return `
    <div class="founder-card">
      <div class="founder-card__img-wrap">${imgContent}</div>
      <h3 class="founder-card__name">${f.name}</h3>
      <p class="founder-card__role">${f.role || ''}</p>
      <div class="founder-card__bio">${bioLines}</div>
      ${f.instagram ? `<a class="founder-card__ig" href="${igLink}" target="_blank" rel="noopener">${f.instagram}</a>` : ''}
    </div>`;
  }).join('');
}

// -- Reviews carousel (home page, max 5 reviews) -------------------------
const REVIEWS_SHOW = 5;

async function loadReviews() {
  const section = document.getElementById('reviewsSection');
  const track   = document.getElementById('reviewsTrack');
  const dotsWrap = document.getElementById('reviewsDots');
  if (!track) return;

  try {
    const byProduct = await fetch('data/reviews.json', { cache: 'no-cache' }).then(r => r.json());
    const all  = Object.values(byProduct).flat();
    if (!all.length) { section.style.display = 'none'; return; }

    // Pick top 5 by rating, then by date
    const picked = [...all]
      .sort((a, b) => b.rating - a.rating || new Date(b.date) - new Date(a.date))
      .slice(0, REVIEWS_SHOW);

    // Summary (across all, not just top 5)
    const avg = all.reduce((s, r) => s + r.rating, 0) / all.length;
    document.getElementById('reviewsAvg').textContent  = avg.toFixed(1);
    document.getElementById('reviewsStars').innerHTML  = stars(avg);
    document.getElementById('reviewsCount').textContent =
      `${all.length} review${all.length !== 1 ? 's' : ''}`;
    document.getElementById('reviewsSummary').hidden = false;

    // Render cards into track
    track.innerHTML = picked.map(r => `
      <div class="review-card">
        <div class="review-card__top">
          <div class="review-card__stars">${stars(r.rating)}</div>
        </div>
        ${r.title ? `<p class="review-card__title">${r.title}</p>` : ''}
        <p class="review-card__text">${r.review}</p>
        <div class="review-card__footer">
          <span class="review-card__reviewer">${r.reviewer}</span>
          <span class="review-card__date">${formatDate(r.date)}</span>
        </div>
      </div>`).join('');

    // Init carousel
    initCarousel(track, dotsWrap, picked.length);

  } catch { section.style.display = 'none'; }
}

function initCarousel(track, dotsWrap, total) {
  const prev = document.getElementById('reviewsPrev');
  const next = document.getElementById('reviewsNext');
  let idx = 0;

  // Build dots
  dotsWrap.innerHTML = Array.from({ length: total }, (_, i) =>
    `<button class="carousel-dot${i === 0 ? ' active' : ''}" data-i="${i}"></button>`
  ).join('');

  function visibleCount() {
    return window.innerWidth <= 680 ? 1 : window.innerWidth <= 960 ? 2 : 3;
  }

  function go(to) {
    const vis  = visibleCount();
    const max  = Math.max(0, total - vis);
    idx = Math.min(Math.max(to, 0), max);

    const cardW = track.children[0]?.offsetWidth || 280;
    const gap   = 20;
    track.style.transform = `translateX(-${idx * (cardW + gap)}px)`;

    prev.disabled = idx === 0;
    next.disabled = idx >= max;

    dotsWrap.querySelectorAll('.carousel-dot').forEach((d, i) =>
      d.classList.toggle('active', i === idx)
    );
  }

  prev?.addEventListener('click', () => go(idx - 1));
  next?.addEventListener('click', () => go(idx + 1));
  dotsWrap?.addEventListener('click', e => {
    const dot = e.target.closest('.carousel-dot');
    if (dot) go(Number(dot.dataset.i));
  });
  window.addEventListener('resize', () => go(idx));

  // Touch swipe support
  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) go(diff > 0 ? idx + 1 : idx - 1);
  }, { passive: true });

  go(0);
}

function stars(rating) {
  const full = Math.round(rating);
  return Array.from({ length: 5 }, (_, i) =>
    `<span class="star${i < full ? ' filled' : ''}">&#9733;</span>`
  ).join('');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

// -- Nav --------------------------------------------------------------------
function setupNav() {
  const nav   = document.getElementById('nav');
  const ham   = document.getElementById('hamburger');
  const links = document.getElementById('navLinks');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
  const overlay = document.getElementById('mobileOverlay');

  function toggleMenu() {
    const isOpen = overlay?.classList.toggle('open');
    ham.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
    overlay?.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  }

  ham?.addEventListener('click', toggleMenu);

  // Close when any overlay link is clicked
  overlay?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      overlay.classList.remove('open');
      ham.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

// -- Scroll reveal ----------------------------------------------------------
function setupReveal() {
  const io = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    }),
    { threshold: 0.15 }
  );
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  requestAnimationFrame(() => {
    document.querySelectorAll('.hero .reveal').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 130);
    });
  });
}

// -- Featured ---------------------------------------------------------------
function buildFeatured(products) {
  const grid = document.getElementById('featuredGrid');
  if (!products.length) { grid.closest('section').remove(); return; }
  grid.innerHTML = products.map(p => cardHTML(p)).join('');
}

// -- Catalog ----------------------------------------------------------------
function buildGrid(products) {
  allProducts = products;
  renderGrid(products);
  setupSort();
  setupSearch();
}

// -- Shared filter helper (category + search + sort) -----
function getActiveCategory() {
  return document.querySelector('.filter-btn.active')?.dataset.category || 'all';
}
function getSearchQuery() {
  return (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
}
function getActiveSort() {
  return document.getElementById('sortSelect')?.value || '';
}

function applyFilters() {
  const cat   = getActiveCategory();
  const query = getSearchQuery();
  const sort  = getActiveSort();

  let list = [...allProducts];

  if (cat !== 'all')  list = list.filter(p => p.category === cat);

  if (query) {
    list = list.filter(p =>
      p.name.toLowerCase().includes(query) ||
      (p.shortDescription || '').toLowerCase().includes(query) ||
      (p.description || '').toLowerCase().includes(query) ||
      (p.category || '').toLowerCase().includes(query) ||
      (p.tags || []).some(t => t.toLowerCase().includes(query))
    );
  }

  if (sort === 'price-asc')  list.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
  if (sort === 'newest')     list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  renderGrid(list);
}

function renderGrid(products) {
  const grid  = document.getElementById('productGrid');
  const count = document.getElementById('catalogCount');

  if (!products.length) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--clr-text-2);padding:3rem 0">No products in this category.</p>';
    count.textContent = '0 products';
    return;
  }

  grid.innerHTML = products.map((p, i) => cardHTML(p, i)).join('');
  count.textContent = `${products.length} product${products.length !== 1 ? 's' : ''}`;
}

function cardHTML(p, idx = 0) {
  const discount = p.originalPrice
    ? `<span class="product-card__original">${currency}${p.originalPrice}</span>` : '';
  const badge = p.badge
    ? `<span class="product-card__badge product-card__badge--${slug(p.badge)}">${p.badge}</span>` : '';

  return `
  <article class="product-card" role="button" tabindex="0"
    data-id="${p.id}"
    style="animation-delay:${idx * 0.06}s"
    onclick="openProduct('${p.id}')"
    onkeydown="if(event.key==='Enter')openProduct('${p.id}')">
    <div class="product-card__img-wrap">
      <img class="product-card__img" src="${p.thumbnail}" alt="${p.name}"
           loading="lazy" onerror="this.src='images/placeholder.svg'" />
      ${badge}
    </div>
    <div class="product-card__body">
      <p class="product-card__category">${capitalize(p.category)}</p>
      <h3 class="product-card__name">${p.name}</h3>
      <p class="product-card__desc">${p.shortDescription}</p>
      <div class="product-card__footer">
        <div>
          <span class="product-card__price">${currency}${p.price}</span>
          ${discount}
        </div>
        <span class="btn btn--sm btn--outline">View -></span>
      </div>
    </div>
  </article>`;
}

// -- Filters ----------------------------------------------------------------
function buildFilters(products) {
  const wrap = document.getElementById('filters');
  const cats = [...new Set(products.map(p => p.category))];
  wrap.insertAdjacentHTML('beforeend',
    cats.map(c => `<button class="filter-btn" data-category="${c}">${capitalize(c)}</button>`).join('')
  );

  wrap.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    wrap.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilters();   // respects active search query + sort too
  });
}

// -- Sort -------------------------------------------------------------------
function setupSort() {
  document.getElementById('sortSelect')?.addEventListener('change', applyFilters);
}

// -- Search -----------------------------------------------------
function setupSearch() {
  const input = document.getElementById('searchInput');
  const clear = document.getElementById('searchClear');
  if (!input) return;

  input.addEventListener('input', () => {
    clear.hidden = !input.value;
    applyFilters();
  });

  clear.addEventListener('click', () => {
    input.value = '';
    clear.hidden = true;
    input.focus();
    applyFilters();
  });
}

// -- Navigation -------------------------------------------------------------
function openProduct(id) {
  window.location.href = `product.html?id=${id}`;
}

// -- Utils ------------------------------------------------------------------
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function slug(s) { return s.toLowerCase().replace(/\s+/g, '-'); }
