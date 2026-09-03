/*  main.js  (GitHub Pages static version)  */

const DATA_URL = 'data/products.json';
const currency = '₹';

let allProducts = [];
let siteConfig  = {};

//  Bootstrap 
(async function init() {
  setupNav();
  setupReveal();
  document.getElementById('year').textContent = new Date().getFullYear();

  try {
    const res  = await fetch(DATA_URL);
    const data = await res.json();
    siteConfig = data.site;

    applySiteConfig(siteConfig);
    buildFilters(data.products);
    buildFeatured(data.products.filter(p => p.featured));
    buildGrid(data.products);
  } catch (err) {
    console.error('Failed to load products.json:', err);
    document.getElementById('productGrid').innerHTML =
      '<p style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--clr-text-2)">Could not load products.</p>';
  }
})();

//  Site config 
function applySiteConfig(site) {
  document.title = `${site.name} — ${site.tagline}`;
  document.getElementById('heroHeadline').textContent  = site.hero.headline;
  document.getElementById('heroSub').textContent       = site.hero.subheadline;
  document.getElementById('heroCta').textContent       = site.hero.cta;
  document.getElementById('footerTagline').textContent = site.footer.tagline;
  document.getElementById('contactEmail').textContent  = site.contact.email;
  document.getElementById('contactIg').textContent     = site.contact.instagram;
  document.getElementById('contactWa').textContent     = site.contact.whatsapp;

  // Hero image — set src if configured, else section stays CSS-only
  const heroImg = document.getElementById('heroImage');
  const heroWrap = document.getElementById('heroImageWrap');
  if (site.hero?.image && heroImg && heroWrap) {
    heroImg.src = site.hero.image;
    heroImg.alt = site.name;
    heroWrap.classList.add('has-image');
  }

  if (site.theme) applyTheme(site.theme);
}

//  Theme — applies site.theme from config as CSS custom properties 
function applyTheme(theme) {
  const root = document.documentElement;
  const { colors, fonts, nav, marquee, about } = theme;

  // Colors → CSS variables
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

  // Fonts → CSS variables
  if (fonts) {
    if (fonts.serif)  root.style.setProperty('--ff-serif',  `'${fonts.serif}', Georgia, serif`);
    if (fonts.sans)   root.style.setProperty('--ff-sans',   `'${fonts.sans}', system-ui, sans-serif`);
    if (fonts.script) root.style.setProperty('--ff-script', `'${fonts.script}', cursive`);
  }

  // Nav height
  if (nav?.height) root.style.setProperty('--nav-h', nav.height);

  // Marquee text — split by | and duplicate for seamless scroll
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

// ── Nav 
function setupNav() {
  const nav   = document.getElementById('nav');
  const ham   = document.getElementById('hamburger');
  const links = document.getElementById('navLinks');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
  ham?.addEventListener('click', () => links?.classList.toggle('open'));
}

// ── Scroll reveal 
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

//  Featured 
function buildFeatured(products) {
  const grid = document.getElementById('featuredGrid');
  if (!products.length) { grid.closest('section').remove(); return; }
  grid.innerHTML = products.map(p => cardHTML(p)).join('');
}

//  Catalog 
function buildGrid(products) {
  allProducts = products;
  renderGrid(products);
  setupSort();
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
        <span class="btn btn--sm btn--outline">View →</span>
      </div>
    </div>
  </article>`;
}

// ── Filters 
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
    const cat = btn.dataset.category;
    renderGrid(cat === 'all' ? allProducts : allProducts.filter(p => p.category === cat));
    // reset sort
    document.getElementById('sortSelect').value = '';
  });
}

// ── Sort 
function setupSort() {
  document.getElementById('sortSelect').addEventListener('change', e => {
    const val    = e.target.value;
    const active = document.querySelector('.filter-btn.active')?.dataset.category || 'all';
    let list = active === 'all' ? [...allProducts] : allProducts.filter(p => p.category === active);
    if (val === 'price-asc')  list.sort((a, b) => a.price - b.price);
    if (val === 'price-desc') list.sort((a, b) => b.price - a.price);
    if (val === 'newest')     list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    renderGrid(list);
  });
}

// ── Navigation 
function openProduct(id) {
  window.location.href = `product.html?id=${id}`;
}

// ── Utils 
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function slug(s) { return s.toLowerCase().replace(/\s+/g, '-'); }
