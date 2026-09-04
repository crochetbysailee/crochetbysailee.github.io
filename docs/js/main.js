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

  try {
    const [prods, site, about, contact] = await Promise.all([
      fetch(URL_PRODUCTS, { cache: 'no-cache' }).then(r => r.json()),
      fetch(URL_SITE,     { cache: 'no-cache' }).then(r => r.json()),
      fetch(URL_ABOUT,    { cache: 'no-cache' }).then(r => r.json()),
      fetch(URL_CONTACT,  { cache: 'no-cache' }).then(r => r.json()),
    ]);

    siteConfig = site;
    currency   = site.currency || '₹';

    applySiteConfig(site, contact);
    buildAbout(about);
    buildFounders(about.founders);
    buildFilters(prods.products);
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
  document.title = `${site.name}  -  ${site.tagline}`;
  document.getElementById('heroHeadline').textContent  = site.hero.headline;
  document.getElementById('heroSub').textContent       = site.hero.subheadline;
  document.getElementById('heroCta').textContent       = site.hero.cta;
  document.getElementById('footerTagline').textContent = site.footer.tagline;

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
    heroImg.src = site.hero.image;
    heroImg.alt = site.name;
    heroWrap.classList.add('has-image');
  }

  if (site.theme) applyTheme(site.theme);
}

// -- Theme  -  applies site.theme from config as CSS custom properties --------
function applyTheme(theme) {
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
    const cat = btn.dataset.category;
    renderGrid(cat === 'all' ? allProducts : allProducts.filter(p => p.category === cat));
    // reset sort
    document.getElementById('sortSelect').value = '';
  });
}

// -- Sort -------------------------------------------------------------------
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

// -- Navigation -------------------------------------------------------------
function openProduct(id) {
  window.location.href = `product.html?id=${id}`;
}

// -- Utils ------------------------------------------------------------------
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function slug(s) { return s.toLowerCase().replace(/\s+/g, '-'); }
