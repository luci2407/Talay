// Talay — interacciones básicas del sitio

document.addEventListener('DOMContentLoaded', function () {
  // -------- Carrito de compras (persistido en localStorage) --------
  function loadCart() {
    try {
      var raw = localStorage.getItem('talayCart');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
  function saveCart(cartData) {
    try {
      localStorage.setItem('talayCart', JSON.stringify(cartData));
    } catch (e) {
      // localStorage no disponible; el carrito seguirá funcionando solo en esta página
    }
  }

  var cart = loadCart(); // { name, price, qty }
  var cartCountEl = document.getElementById('cart-count');
  var cartPanel = document.getElementById('cart-panel');
  var btnCart = document.getElementById('btn-cart');

  function renderCart(itemsListEl, emptyEl, totalRowEl, totalEl) {
    if (!itemsListEl) return;
    itemsListEl.innerHTML = '';
    if (cart.length === 0) {
      if (emptyEl) emptyEl.style.display = 'block';
      if (totalRowEl) totalRowEl.style.display = 'none';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    if (totalRowEl) totalRowEl.style.display = 'flex';

    var total = 0;
    cart.forEach(function (item) {
      total += item.price * item.qty;
      var li = document.createElement('li');
      li.innerHTML =
        '<span>' + item.name + ' <span class="qty">×' + item.qty + '</span></span>' +
        '<span>$' + (item.price * item.qty).toLocaleString('es-MX') + ' MXN</span>';
      itemsListEl.appendChild(li);
    });
    if (totalEl) totalEl.textContent = '$' + total.toLocaleString('es-MX') + ' MXN';
  }

  function renderAllCarts() {
    var count = cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
    if (cartCountEl) cartCountEl.textContent = count;

    renderCart(
      document.getElementById('cart-items'),
      document.getElementById('cart-empty'),
      document.getElementById('cart-total-row'),
      document.getElementById('cart-total')
    );
  }

  function toggleCartPanel(forceOpen) {
    if (!cartPanel) return;
    var willOpen = typeof forceOpen === 'boolean' ? forceOpen : !cartPanel.classList.contains('open');
    cartPanel.classList.toggle('open', willOpen);
    if (btnCart) btnCart.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
  }

  if (btnCart) {
    btnCart.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleCartPanel();
    });
  }

  document.addEventListener('click', function (e) {
    if (!cartPanel) return;
    if (cartPanel.classList.contains('open') &&
        !cartPanel.contains(e.target) &&
        !e.target.closest('#btn-cart, #mobile-cart')) {
      toggleCartPanel(false);
    }
  });

  var btnPagar = document.getElementById('btn-pagar');
  if (btnPagar) {
    btnPagar.addEventListener('click', function () {
      toggleCartPanel(false);
      window.location.href = 'pago.html';
    });
  }

  renderAllCarts();

  // Buscador del nav → lleva a la página de resultados de búsqueda
  var navSearchForm = document.getElementById('nav-search-form');
  if (navSearchForm) {
    navSearchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var query = navSearchForm.querySelector('input[name="q"]').value.trim();
      if (!query) return;
      window.location.href = 'buscar.html?q=' + encodeURIComponent(query);
    });
  }

  // Menú móvil (hamburguesa): muestra/oculta el panel con los enlaces
  var btnMenu = document.getElementById('btn-menu');
  var mobileMenu = document.getElementById('mobile-menu');
  if (btnMenu && mobileMenu) {
    btnMenu.addEventListener('click', function () {
      var isOpen = mobileMenu.classList.toggle('open');
      btnMenu.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobileMenu.classList.remove('open');
        btnMenu.setAttribute('aria-expanded', 'false');
      });
    });
  }

  var mobileCart = document.getElementById('mobile-cart');
  if (mobileCart) {
    mobileCart.addEventListener('click', function (e) {
      e.preventDefault();
      if (mobileMenu) mobileMenu.classList.remove('open');
      toggleCartPanel(true);
    });
  }

  // -------- Plantilla de "artículo individual" --------
  // Lee el slug desde la URL (?slug=), busca el artículo en
  // window.TALAY_ARTICLES (cargado por articles-data.js) y lo pinta.
  var params = new URLSearchParams(window.location.search);
  var slug = params.get('slug');

  var heroEl = document.getElementById('article-hero');
  var breadcrumbEl = document.getElementById('art-breadcrumb-current');
  var dateEl = document.getElementById('art-date');
  var titleEl = document.getElementById('art-title');
  var authorEl = document.getElementById('art-author');
  var coverEl = document.getElementById('art-cover');
  var bodyEl = document.getElementById('art-body');
  var notFoundEl = document.getElementById('art-not-found');

  function resolveCoverSrc(path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return '../' + path;
  }

  function renderArticle() {
    var article = (window.TALAY_ARTICLES || []).find(function (a) { return a.slug === slug; });

    if (!article) {
      if (titleEl) titleEl.textContent = 'Artículo no encontrado';
      if (breadcrumbEl) breadcrumbEl.textContent = 'No encontrado';
      if (notFoundEl) notFoundEl.style.display = 'block';
      if (bodyEl) bodyEl.innerHTML = '';
      return;
    }

    document.title = article.title + ' — Talay';
    if (titleEl) titleEl.textContent = article.title;
    if (breadcrumbEl) breadcrumbEl.textContent = article.title;

    if (article.created_at && dateEl) {
      dateEl.textContent = new Date(article.created_at).toLocaleDateString('es-MX', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      dateEl.style.display = 'inline-flex';
    }

    if (article.author && authorEl) {
      authorEl.textContent = 'Por ' + article.author;
      authorEl.style.display = 'block';
    }

    if (article.cover_image && coverEl) {
      coverEl.src = resolveCoverSrc(article.cover_image);
      coverEl.alt = article.title;
      coverEl.style.display = 'block';
    }

    if (bodyEl) bodyEl.textContent = article.content || '';
  }

  document.addEventListener('talay:articles-ready', renderArticle);
});
