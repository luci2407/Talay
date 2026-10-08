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

  // Icono del carrito (nav) → muestra/oculta el resumen del pedido
  if (btnCart) {
    btnCart.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleCartPanel();
    });
  }

  // Cierra el panel del carrito al hacer clic fuera de él
  document.addEventListener('click', function (e) {
    if (!cartPanel) return;
    if (cartPanel.classList.contains('open') &&
        !cartPanel.contains(e.target) &&
        !e.target.closest('#btn-cart, #mobile-cart')) {
      toggleCartPanel(false);
    }
  });

  // Botón "Pagar ya" dentro del resumen → lleva a la página de pago con el resumen del pedido
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

  // Enlace "Carrito" dentro del menú móvil → abre el mismo resumen de pedido
  var mobileCart = document.getElementById('mobile-cart');
  if (mobileCart) {
    mobileCart.addEventListener('click', function (e) {
      e.preventDefault();
      if (mobileMenu) mobileMenu.classList.remove('open');
      toggleCartPanel(true);
    });
  }

  // -------- Blog: cuadrícula de artículos publicados, desde Supabase --------
  var blogGrid = document.getElementById('blog-grid');
  var blogEmpty = document.getElementById('blog-empty');

  function resolveCoverSrc(path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return '../' + path;
  }

  function renderBlogGrid() {
    if (!blogGrid) return;
    var articles = window.TALAY_ARTICLES || [];

    if (articles.length === 0) {
      blogGrid.innerHTML = '';
      if (blogEmpty) blogEmpty.style.display = 'block';
      return;
    }
    if (blogEmpty) blogEmpty.style.display = 'none';

    blogGrid.innerHTML = articles.map(function (article) {
      var dateLabel = article.created_at
        ? new Date(article.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
        : '';
      var mediaHtml = article.cover_image
        ? '<img src="' + resolveCoverSrc(article.cover_image) + '" alt="' + article.title + '">'
        : '';

      return (
        '<a class="blog-card" href="articulo.html?slug=' + encodeURIComponent(article.slug) + '">' +
          '<div class="blog-card-media">' + mediaHtml + '</div>' +
          '<div class="blog-card-body">' +
            (dateLabel ? '<span class="blog-card-date">' + dateLabel + '</span>' : '') +
            '<h3>' + article.title + '</h3>' +
            '<p>' + (article.excerpt || '') + '</p>' +
            '<span class="blog-card-link">Leer artículo →</span>' +
          '</div>' +
        '</a>'
      );
    }).join('');
  }

  document.addEventListener('talay:articles-ready', renderBlogGrid);
});
