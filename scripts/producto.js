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

  var addButtons = document.querySelectorAll('.add-btn');
  addButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('.product-card');
      var name = card ? card.querySelector('h3').textContent : 'Producto';
      var priceText = card ? card.querySelector('.product-price span').textContent : '$0';
      addToCart(name, parsePrice(priceText));
    });
  });

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
        e.target !== btnCart) {
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

  // -------- Ficha de producto (plantilla de 1 producto) --------

  // Galería: al hacer clic en una miniatura, cambia la imagen principal
  var mainImg = document.getElementById('gallery-main-img');
  var thumbs = document.querySelectorAll('.thumb-btn');
  thumbs.forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      thumbs.forEach(function (t) { t.classList.remove('active'); });
      thumb.classList.add('active');
      if (mainImg) mainImg.src = thumb.getAttribute('data-img');
    });
  });

  // Variantes: color y talla (solo visual, selección de una opción a la vez)
  document.querySelectorAll('.option-swatches').forEach(function (group) {
    group.querySelectorAll('.swatch').forEach(function (swatch) {
      swatch.addEventListener('click', function () {
        group.querySelectorAll('.swatch').forEach(function (s) { s.classList.remove('active'); });
        swatch.classList.add('active');
      });
    });
  });
  document.querySelectorAll('.option-pills').forEach(function (group) {
    group.querySelectorAll('.pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        group.querySelectorAll('.pill').forEach(function (p) { p.classList.remove('active'); });
        pill.classList.add('active');
      });
    });
  });

  // Selector de cantidad en la ficha de producto
  var detailQtyValue = document.getElementById('detail-qty-value');
  var detailQtyControls = document.getElementById('detail-qty-controls');
  if (detailQtyControls && detailQtyValue) {
    detailQtyControls.addEventListener('click', function (e) {
      var btn = e.target.closest('.qty-btn');
      if (!btn) return;
      var current = parseInt(detailQtyValue.textContent, 10) || 1;
      if (btn.classList.contains('qty-plus')) {
        current++;
      } else if (current > 1) {
        current--;
      }
      detailQtyValue.textContent = current;
    });
  }

  // Botón "Añadir al carrito" de la ficha de producto
  var btnAddDetail = document.getElementById('btn-add-detail');
  var addConfirmation = document.getElementById('add-confirmation');
  if (btnAddDetail) {
    btnAddDetail.addEventListener('click', function () {
      var titleEl = document.querySelector('.product-detail-title');
      var priceEl = document.querySelector('.product-detail-price');
      var name = titleEl ? titleEl.textContent.trim() : 'Producto';
      var price = priceEl ? parsePrice(priceEl.textContent) : 0;
      var qty = detailQtyValue ? (parseInt(detailQtyValue.textContent, 10) || 1) : 1;
      addToCart(name, price, qty);
      if (addConfirmation) {
        addConfirmation.textContent = 'Se ' + (qty > 1 ? 'agregaron ' + qty + ' unidades' : 'agregó 1 unidad') + ' a tu carrito.';
      }
    });
  }
});