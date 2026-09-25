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

  // Botón "Tu próximo refugio..." (no existe en esta página, se deja por si se reutiliza este script)
  var btnExplora = document.getElementById('btn-explora-mas');
  if (btnExplora) {
    btnExplora.addEventListener('click', function () {
      window.location.href = 'productos.html';
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

  // Los botones "+" se enlazan después de renderizar los productos de la categoría (más abajo),
  // ya que las tarjetas se generan dinámicamente y no existen todavía en este punto.

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

  // -------- Plantilla de resultados de búsqueda --------
  // Lee el texto buscado desde la URL (?q=) y filtra window.TALAY_PRODUCTS
  // por nombre, descripción o categoría. La misma plantilla sirve para
  // cualquier búsqueda: solo cambia el parámetro ?q= en la URL.
  var params = new URLSearchParams(window.location.search);
  var query = (params.get('q') || '').trim();

  var searchTitleEl = document.getElementById('search-title');
  var searchSubtitleEl = document.getElementById('search-subtitle');
  var productGrid = document.getElementById('search-product-grid');
  var emptyStateEl = document.getElementById('search-empty-state');

  // Rellena el campo de búsqueda del nav con el término actual, para que se vea lo que se buscó
  var navSearchInput = document.querySelector('#nav-search-form input[name="q"]');
  if (navSearchInput && query) navSearchInput.value = query;

  // Las imágenes pueden ser una ruta local vieja (ej. "pic/producto-1.jpg")
  // o una URL completa subida a Supabase Storage — cada una se muestra distinto.
  function resolveImageSrc(path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return '../' + path;
  }

  function renderSearchResults() {
    var allProducts = window.TALAY_PRODUCTS || [];

    if (searchTitleEl) {
      searchTitleEl.textContent = query ? 'Resultados para “' + query + '”' : 'Resultados de búsqueda';
    }
    document.title = (query ? 'Buscar: ' + query : 'Buscar') + ' — Talay';

    var results = [];
    if (query) {
      var q = query.toLowerCase();
      results = allProducts.filter(function (p) {
        return (
          (p.name && p.name.toLowerCase().indexOf(q) !== -1) ||
          (p.description && p.description.toLowerCase().indexOf(q) !== -1) ||
          (p.category && p.category.toLowerCase().indexOf(q) !== -1)
        );
      });
    }

    if (searchSubtitleEl) {
      searchSubtitleEl.textContent = query
        ? (results.length === 1 ? '1 producto encontrado.' : results.length + ' productos encontrados.')
        : 'Escribe algo en el buscador para encontrar productos.';
    }

    if (!productGrid) return;
    if (results.length === 0) {
      productGrid.innerHTML = '';
      if (emptyStateEl) emptyStateEl.style.display = query ? 'block' : 'none';
      return;
    }
    if (emptyStateEl) emptyStateEl.style.display = 'none';

    productGrid.innerHTML = results.map(function (product) {
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

    // Botones "+" de las tarjetas recién renderizadas
    productGrid.querySelectorAll('.add-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var product = allProducts.find(function (p) { return p.id === btn.getAttribute('data-product-id'); });
        if (product) addToCart(product.name, product.price);
      });
    });

    // Triggers de la ventana rápida en las tarjetas recién renderizadas
    productGrid.querySelectorAll('.js-quick-view').forEach(function (trigger) {
      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        openQuickView(trigger.getAttribute('data-product-id'));
      });
    });
  }

  document.addEventListener('talay:products-ready', renderSearchResults);

  // -------- Ventana rápida de producto (modal) --------
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

  function openQuickView(id) {
    var product = (window.TALAY_PRODUCTS || []).find(function (p) { return p.id === id; });
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

  renderCategoryProducts();
});