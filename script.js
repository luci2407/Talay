// Talay — interacciones básicas del sitio

document.addEventListener('DOMContentLoaded', function () {
  // Botón "Descubre la tienda" del hero → baja suavemente a productos
  var btnDescubre = document.getElementById('btn-descubre');
  if (btnDescubre) {
    btnDescubre.addEventListener('click', function () {
      var productos = document.getElementById('productos');
      if (productos) productos.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // Botón "Tu próximo refugio..." → redirige a la página de productos/categorías
  var btnExplora = document.getElementById('btn-explora-mas');
  if (btnExplora) {
    btnExplora.addEventListener('click', function () {
      window.location.href = 'html/productos.html';
    });
  }

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

  function parsePrice(text) {
    // "$349 MXN" → 349
    var match = text.replace(/,/g, '').match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  }

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

  function addToCart(name, price, qty) {
    qty = qty || 1;
    var existing = cart.find(function (item) { return item.name === name; });
    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ name: name, price: price, qty: qty });
    }
    saveCart(cart);
    renderAllCarts();
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
      window.location.href = 'html/pago.html';
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
      window.location.href = 'html/buscar.html?q=' + encodeURIComponent(query);
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
    // Cierra el menú al elegir una opción de navegación
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

  // -------- Ventana rápida de producto (modal) --------
  // Lee los productos desde window.TALAY_PRODUCTS (scripts/products-data.js).
  // Ese archivo es la pieza a reemplazar cuando conectes una base de datos real:
  // el resto de esta lógica no necesita cambiar, solo la fuente de los datos.
  var qvOverlay = document.getElementById('quick-view-overlay');
  var qvClose = document.getElementById('quick-view-close');
  var qvImage = document.getElementById('qv-image');
  var qvCategory = document.getElementById('qv-category');
  var qvTitle = document.getElementById('qv-title');
  var qvPrice = document.getElementById('qv-price');
  var qvDescription = document.getElementById('qv-description');
  var qvQtyValue = document.getElementById('qv-qty-value');
  var qvQtyControls = document.getElementById('qv-qty-controls');
  var qvAddBtn = document.getElementById('qv-add-btn');
  var qvConfirmation = document.getElementById('qv-confirmation');
  var currentQvProduct = null;

  function findProduct(id) {
    return (window.TALAY_PRODUCTS || []).find(function (p) { return p.id === id; });
  }

  // Las imágenes pueden ser una ruta local vieja (ej. "pic/producto-1.jpg")
  // o una URL completa subida a Supabase Storage — cada una se muestra distinto.
  // index.html está en la raíz del proyecto, así que las rutas locales no llevan "../".
  function resolveImageSrc(path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return path;
  }

  function openQuickView(id) {
    var product = findProduct(id);
    if (!product || !qvOverlay) return;
    currentQvProduct = product;

    if (qvImage) { qvImage.src = resolveImageSrc(product.image); qvImage.alt = product.name; }
    if (qvCategory) qvCategory.textContent = product.category;
    if (qvTitle) qvTitle.textContent = product.name;
    if (qvPrice) qvPrice.textContent = '$' + product.price.toLocaleString('es-MX') + ' MXN';
    if (qvDescription) qvDescription.textContent = product.description;
    if (qvQtyValue) qvQtyValue.textContent = '1';
    if (qvConfirmation) qvConfirmation.textContent = '';

    qvOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeQuickView() {
    if (!qvOverlay) return;
    qvOverlay.classList.remove('open');
    document.body.style.overflow = '';
    currentQvProduct = null;
  }

  if (qvClose) qvClose.addEventListener('click', closeQuickView);
  if (qvOverlay) {
    qvOverlay.addEventListener('click', function (e) {
      if (e.target === qvOverlay) closeQuickView();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && qvOverlay && qvOverlay.classList.contains('open')) {
      closeQuickView();
    }
  });

  // Selector de cantidad dentro de la ventana rápida
  if (qvQtyControls && qvQtyValue) {
    qvQtyControls.addEventListener('click', function (e) {
      var btn = e.target.closest('.qty-btn');
      if (!btn) return;
      var current = parseInt(qvQtyValue.textContent, 10) || 1;
      if (btn.classList.contains('qty-plus')) {
        current++;
      } else if (current > 1) {
        current--;
      }
      qvQtyValue.textContent = current;
    });
  }

  // Botón "Añadir al carrito" dentro de la ventana rápida
  if (qvAddBtn) {
    qvAddBtn.addEventListener('click', function () {
      if (!currentQvProduct) return;
      var qty = qvQtyValue ? (parseInt(qvQtyValue.textContent, 10) || 1) : 1;
      addToCart(currentQvProduct.name, currentQvProduct.price, qty);
      if (qvConfirmation) {
        qvConfirmation.textContent = 'Se ' + (qty > 1 ? 'agregaron ' + qty + ' unidades' : 'agregó 1 unidad') + ' a tu carrito.';
      }
    });
  }

  // -------- Reseñas de la comunidad (una sola plantilla, datos desde Supabase) --------
  // reviews-data.js pide las reseñas aprobadas a Supabase; aquí solo mostramos
  // las marcadas como "Destacado" (máx. 3). La página "Comunidad" muestra el listado completo.
  var reviewGrid = document.getElementById('review-grid');
  var reviewGridEmpty = document.getElementById('review-grid-empty');

  function renderReviewGrid() {
    if (!reviewGrid) return;
    var reviews = (window.TALAY_REVIEWS || []).filter(function (r) { return r.featured; }).slice(0, 3);

    if (reviews.length === 0) {
      reviewGrid.innerHTML = '';
      if (reviewGridEmpty) reviewGridEmpty.style.display = 'block';
      return;
    }
    if (reviewGridEmpty) reviewGridEmpty.style.display = 'none';

    reviewGrid.innerHTML = reviews.map(function (review, index) {
      var initial = review.customer_name ? review.customer_name.charAt(0).toUpperCase() : '?';
      var avatarClass = 'a' + ((index % 3) + 1);
      return (
        '<div class="review-card">' +
          '<span class="stars">' + '★'.repeat(review.rating) + '</span>' +
          '<p class="quote">' + review.comment + '</p>' +
          '<div class="review-person">' +
            '<div class="avatar ' + avatarClass + '">' + initial + '</div>' +
            '<div><span class="name">' + review.customer_name + '</span></div>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  document.addEventListener('talay:reviews-ready', renderReviewGrid);

  // -------- Eventos (una sola plantilla, datos desde Supabase) --------
  var monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  var eventsGrid = document.getElementById('events-grid');
  var eventsEmpty = document.getElementById('events-empty');

  function renderEventsGrid() {
    if (!eventsGrid) return;
    var events = window.TALAY_EVENTS || [];

    if (events.length === 0) {
      eventsGrid.innerHTML = '';
      if (eventsEmpty) eventsEmpty.style.display = 'block';
      return;
    }
    if (eventsEmpty) eventsEmpty.style.display = 'none';

    eventsGrid.innerHTML = events.map(function (ev) {
      // event_date llega como "AAAA-MM-DD"; se separa a mano para evitar
      // saltos de un día por zona horaria al usar new Date(...).
      var parts = (ev.event_date || '').split('-');
      var day = parts[2] || '--';
      var month = parts[1] ? monthNames[parseInt(parts[1], 10) - 1] : '';

      var metaHtml = '';
      if (ev.event_time) {
        metaHtml +=
          '<span><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
          ev.event_time + '</span>';
      }
      if (ev.location) {
        metaHtml +=
          '<span><svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="10" r="2.4" stroke="currentColor" stroke-width="1.8"/></svg>' +
          ev.location + '</span>';
      }

      var linkHtml = ev.registration_url
        ? '<a href="' + ev.registration_url + '" target="_blank" rel="noopener" class="event-link">Regístrate aquí →</a>'
        : '';

      return (
        '<div class="event-card">' +
          '<div class="event-date"><span class="day">' + day + '</span><span class="month">' + month + '</span></div>' +
          '<div class="event-info">' +
            '<h3>' + ev.title + '</h3>' +
            '<div class="event-meta">' + metaHtml + '</div>' +
            linkHtml +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  document.addEventListener('talay:events-ready', renderEventsGrid);

  // -------- Productos destacados en el inicio (máx. 4, marcados desde el panel) --------
  var featuredGrid = document.getElementById('featured-product-grid');
  var featuredEmpty = document.getElementById('featured-empty');

  function renderFeaturedProducts() {
    if (!featuredGrid) return;
    var featured = (window.TALAY_PRODUCTS || []).filter(function (p) { return p.featured; }).slice(0, 4);

    if (featured.length === 0) {
      featuredGrid.innerHTML = '';
      if (featuredEmpty) featuredEmpty.style.display = 'block';
      return;
    }
    if (featuredEmpty) featuredEmpty.style.display = 'none';

    featuredGrid.innerHTML = featured.map(function (product) {
      return (
        '<div class="product-card">' +
          '<a href="#" class="product-link js-quick-view" data-product-id="' + product.id + '">' +
            '<div class="product-media"><img src="' + resolveImageSrc(product.image) + '" alt="' + product.name + '"></div>' +
          '</a>' +
          '<div class="product-info">' +
            '<span class="product-tag">' + product.category + '</span>' +
            '<a href="#" class="product-link js-quick-view" data-product-id="' + product.id + '"><h3>' + product.name + '</h3></a>' +
            '<div class="product-price">' +
              '<span>$' + product.price.toLocaleString('es-MX') + ' MXN</span>' +
              '<button class="add-btn" type="button" aria-label="Añadir al carrito" data-product-id="' + product.id + '">+</button>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  // Delegación de eventos: como las tarjetas se generan dinámicamente,
  // un solo listener en el contenedor cubre los botones "+" y los
  // triggers de la ventana rápida, sin importar cuántas veces se re-renderice.
  if (featuredGrid) {
    featuredGrid.addEventListener('click', function (e) {
      var addBtn = e.target.closest('.add-btn');
      if (addBtn) {
        var product = (window.TALAY_PRODUCTS || []).find(function (p) { return p.id === addBtn.getAttribute('data-product-id'); });
        if (product) addToCart(product.name, product.price);
        return;
      }
      var quickViewTrigger = e.target.closest('.js-quick-view');
      if (quickViewTrigger) {
        e.preventDefault();
        openQuickView(quickViewTrigger.getAttribute('data-product-id'));
      }
    });
  }

  document.addEventListener('talay:products-ready', renderFeaturedProducts);
});