/*  product.js  (GitHub Pages static version)  */

const DATA_URL = 'data/products.json';
const currency = '₹';

//  Bootstrap 
(async function init() {
  setupNav();
  document.getElementById('year').textContent = new Date().getFullYear();

  const id = new URLSearchParams(location.search).get('id');
  if (!id) { location.href = 'index.html'; return; }

  try {
    const res  = await fetch(DATA_URL);
    const data = await res.json();
    const product = data.products.find(p => p.id === id);
    if (!product) throw new Error('Not found');

    document.title = `${product.name} — ${data.site.name}`;
    if (data.site.theme) applyTheme(data.site.theme);
    renderProduct(product, data.site.contact);
    loadRelated(product, data.products);
  } catch {
    document.getElementById('pdp').innerHTML =
      '<p style="text-align:center;padding:4rem 0;color:var(--clr-text-2)">Product not found. <a href="index.html" style="color:var(--clr-primary)">Go back →</a></p>';
  }
})();

//  Nav 
function setupNav() {
  const nav   = document.getElementById('nav');
  const ham   = document.getElementById('hamburger');
  const links = nav?.querySelector('.nav__links');
  window.addEventListener('scroll', () => {
    nav?.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
  ham?.addEventListener('click', () => links?.classList.toggle('open'));
}

//  Render product 
function renderProduct(p, contact = {}) {
  document.getElementById('breadcrumbProduct').textContent = p.name;

  // Gallery
  const mainImg = document.getElementById('galleryMain');
  mainImg.src = p.images[0];
  mainImg.alt = p.name;

  const thumbsWrap = document.getElementById('galleryThumbs');
  thumbsWrap.innerHTML = p.images.map((src, i) => `
    <div class="gallery__thumb ${i === 0 ? 'active' : ''}" data-src="${src}">
      <img src="${src}" alt="${p.name} view ${i + 1}" loading="lazy"
           onerror="this.src='images/placeholder.svg'" />
    </div>`).join('');

  thumbsWrap.addEventListener('click', e => {
    const thumb = e.target.closest('.gallery__thumb');
    if (!thumb) return;
    switchImage(thumb.dataset.src, thumb);
  });

  // Zoom
  const zoomBtn   = document.getElementById('galleryZoomBtn');
  const zoomModal = document.getElementById('zoomModal');
  const zoomImg   = document.getElementById('zoomImg');
  const zoomClose = document.getElementById('zoomClose');

  zoomBtn.addEventListener('click', () => {
    zoomImg.src = mainImg.src;
    zoomModal.hidden = false;
    document.body.style.overflow = 'hidden';
  });
  const closeZoom = () => { zoomModal.hidden = true; document.body.style.overflow = ''; };
  zoomClose.addEventListener('click', closeZoom);
  zoomModal.addEventListener('click', e => { if (e.target === zoomModal) closeZoom(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeZoom(); });

  // Info
  document.getElementById('pdpCategory').textContent = capitalize(p.category);
  document.getElementById('pdpName').textContent      = p.name;
  document.getElementById('pdpDesc').textContent      = p.description;
  document.getElementById('pdpPrice').textContent     = `${currency}${p.price}`;

  const leadTime = (p.details['Made to order'] || '3–5 business days')
    .replace(/\s*business days?/i, '');
  document.getElementById('pdpLeadTime').textContent = leadTime;

  if (p.badge) {
    const bdg = document.getElementById('pdpBadge');
    bdg.textContent = p.badge;
    bdg.hidden = false;
  }

  if (p.originalPrice) {
    document.getElementById('pdpOriginal').hidden = false;
    document.getElementById('pdpOriginal').textContent = `${currency}${p.originalPrice}`;
    const pct  = Math.round((1 - p.price / p.originalPrice) * 100);
    const disc = document.getElementById('pdpDiscount');
    disc.hidden = false;
    disc.textContent = `${pct}% off`;
  }

  // Colour swatches
  const swatchWrap  = document.getElementById('colorSwatches');
  const selectedLbl = document.getElementById('selectedColor');
  if (p.colors?.length) {
    selectedLbl.textContent = p.colors[0];
    swatchWrap.innerHTML = p.colors.map((c, i) =>
      `<span class="color-swatch ${i === 0 ? 'active' : ''}" data-color="${c}">${c}</span>`
    ).join('');
    swatchWrap.addEventListener('click', e => {
      const sw = e.target.closest('.color-swatch');
      if (!sw) return;
      swatchWrap.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      sw.classList.add('active');
      selectedLbl.textContent = sw.dataset.color;
    });
  }

  // WhatsApp order — number from config (digits only)
  document.getElementById('orderBtn').addEventListener('click', () => {
    const color  = document.getElementById('selectedColor').textContent;
    const waNum  = (contact.whatsapp || '').replace(/\D/g, '');
    const text   = encodeURIComponent(
      `Hi! I'd like to order:\n\n*${p.name}*\nColour: ${color}\nPrice: ${currency}${p.price}\n\nPlease let me know the details!`
    );
    window.open(`https://wa.me/${waNum}?text=${text}`, '_blank');
  });

  // Wishlist toggle (cosmetic)
  const wishBtn = document.getElementById('wishlistBtn');
  wishBtn.addEventListener('click', () => {
    const saved = wishBtn.textContent.includes('♡');
    wishBtn.textContent = saved ? '♥ Saved' : '♡ Save';
    wishBtn.style.color = saved ? 'var(--clr-primary)' : '';
  });

  // Details table + accordions
  buildDetailsTable(p.details);
  buildAccordions();
}

function switchImage(src, thumbEl) {
  const mainImg = document.getElementById('galleryMain');
  mainImg.style.opacity = '0';
  setTimeout(() => { mainImg.src = src; mainImg.style.opacity = '1'; }, 150);
  document.querySelectorAll('.gallery__thumb').forEach(t => t.classList.remove('active'));
  thumbEl?.classList.add('active');
}

//  Details table 
function buildDetailsTable(details) {
  document.getElementById('detailsTable').innerHTML =
    Object.entries(details).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
}

//  Accordions 
function buildAccordions() {
  document.querySelectorAll('.accordion__head').forEach(head => {
    head.addEventListener('click', () => {
      const body   = head.nextElementSibling;
      const isOpen = body.classList.contains('open');
      head.classList.toggle('open', !isOpen);
      body.classList.toggle('open', !isOpen);
    });
  });
}

//  Related products 
function loadRelated(current, allProducts) {
  const related = allProducts
    .filter(p => p.id !== current.id && p.category === current.category)
    .slice(0, 4);

  if (!related.length) {
    document.getElementById('relatedSection').style.display = 'none';
    return;
  }

  document.getElementById('relatedGrid').innerHTML = related.map((p, i) => `
    <article class="product-card" role="button" tabindex="0"
      onclick="location.href='product.html?id=${p.id}'"
      onkeydown="if(event.key==='Enter')location.href='product.html?id=${p.id}'"
      style="animation-delay:${i * 0.06}s">
      <div class="product-card__img-wrap">
        <img class="product-card__img" src="${p.thumbnail}" alt="${p.name}"
             loading="lazy" onerror="this.src='images/placeholder.svg'" />
        ${p.badge ? `<span class="product-card__badge">${p.badge}</span>` : ''}
      </div>
      <div class="product-card__body">
        <p class="product-card__category">${capitalize(p.category)}</p>
        <h3 class="product-card__name">${p.name}</h3>
        <div class="product-card__footer">
          <span class="product-card__price">${currency}${p.price}</span>
          <span class="btn btn--sm btn--outline">View →</span>
        </div>
      </div>
    </article>`).join('');
}

//  Theme 
function applyTheme(theme) {
  const root = document.documentElement;
  const { colors, fonts, nav } = theme;
  if (colors) {
    const map = {
      primary:     '--clr-primary',    primaryDark: '--clr-primary-d',
      primaryLight:'--clr-primary-l',  primaryXL:   '--clr-primary-xl',
      accent:      '--clr-accent',     accentDark:  '--clr-accent-d',
      bg:          '--clr-bg',         bgTint:      '--clr-bg-tint',
      text:        '--clr-text',       textMuted:   '--clr-text-2',
      border:      '--clr-border',     success:     '--clr-success',
    };
    Object.entries(map).forEach(([k, v]) => { if (colors[k]) root.style.setProperty(v, colors[k]); });
  }
  if (fonts) {
    if (fonts.serif)  root.style.setProperty('--ff-serif',  `'${fonts.serif}', Georgia, serif`);
    if (fonts.sans)   root.style.setProperty('--ff-sans',   `'${fonts.sans}', system-ui, sans-serif`);
    if (fonts.script) root.style.setProperty('--ff-script', `'${fonts.script}', cursive`);
  }
  if (nav?.height) root.style.setProperty('--nav-h', nav.height);
}

//  Utils 
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }