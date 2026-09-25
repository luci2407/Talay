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

  // Resumen editable del pedido (con botones +/− para ajustar cantidades)
  function renderEditableCart(itemsListEl, emptyEl, totalRowEl, totalEl) {
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
      li.className = 'payment-line';
      li.setAttribute('data-name', item.name);
      li.innerHTML =
        '<div class="payment-line-info">' +
          '<span class="payment-line-name">' + item.name + '</span>' +
          '<span class="payment-line-price">$' + (item.price * item.qty).toLocaleString('es-MX') + ' MXN</span>' +
        '</div>' +
        '<div class="qty-controls">' +
          '<button type="button" class="qty-btn qty-minus" aria-label="Quitar una unidad de ' + item.name + '">−</button>' +
          '<span class="qty-value">' + item.qty + '</span>' +
          '<button type="button" class="qty-btn qty-plus" aria-label="Agregar una unidad de ' + item.name + '">+</button>' +
        '</div>';
      itemsListEl.appendChild(li);
    });
    if (totalEl) totalEl.textContent = '$' + total.toLocaleString('es-MX') + ' MXN';
  }

  // Sube o baja la cantidad de un producto por nombre; si llega a 0, se quita del pedido
  function changeQty(name, delta) {
    var item = cart.find(function (i) { return i.name === name; });
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      cart = cart.filter(function (i) { return i.name !== name; });
    }
    saveCart(cart);
    renderAllCarts();
  }

  // Delegación de clics en los botones +/− del resumen editable
  var paymentItemsEl = document.getElementById('payment-items');
  if (paymentItemsEl) {
    paymentItemsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.qty-btn');
      if (!btn) return;
      var li = btn.closest('.payment-line');
      if (!li) return;
      var name = li.getAttribute('data-name');
      changeQty(name, btn.classList.contains('qty-plus') ? 1 : -1);
    });
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
    // Resumen editable del pedido en el cuerpo de la página de pago
    renderEditableCart(
      document.getElementById('payment-items'),
      document.getElementById('payment-empty'),
      document.getElementById('payment-total-row'),
      document.getElementById('payment-total')
    );
  }

  function addToCart(name, price) {
    var existing = cart.find(function (item) { return item.name === name; });
    if (existing) {
      existing.qty++;
    } else {
      cart.push({ name: name, price: price, qty: 1 });
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

  // -------- Confirmar pedido (lo guarda de verdad en Supabase) --------
  var btnConfirmOrder = document.getElementById('btn-confirm-order');
  var confirmOrderBlock = document.getElementById('confirm-order-block');
  var orderConfirmedBlock = document.getElementById('order-confirmed-block');
  var orderNumberDisplay = document.getElementById('order-number-display');
  var confirmOrderMessage = document.getElementById('confirm-order-message');
  var emailOrderNote = document.getElementById('email-order-note');
  var emailReceiptLink = document.getElementById('email-receipt-link');

  if (btnConfirmOrder) {
    btnConfirmOrder.addEventListener('click', async function () {
      var name = document.getElementById('order-name').value.trim();
      var email = document.getElementById('order-email').value.trim();

      if (cart.length === 0) {
        confirmOrderMessage.textContent = 'Tu carrito está vacío.';
        confirmOrderMessage.className = 'form-message error';
        return;
      }
      if (!name || !email) {
        confirmOrderMessage.textContent = 'Escribe tu nombre y correo para continuar.';
        confirmOrderMessage.className = 'form-message error';
        return;
      }

      var total = cart.reduce(function (sum, item) { return sum + item.price * item.qty; }, 0);

      btnConfirmOrder.disabled = true;
      btnConfirmOrder.textContent = 'Guardando pedido…';

      try {
        var orderResult = await window.supabaseClient
          .from('orders')
          .insert({
            customer_name: name,
            customer_email: email,
            status: 'pendiente',
            total: total
          })
          .select()
          .single();

        if (orderResult.error) throw orderResult.error;

        var orderId = orderResult.data.id;

        var itemsPayload = cart.map(function (item) {
          return {
            order_id: orderId,
            product_name: item.name,
            price: item.price,
            quantity: item.qty
          };
        });

        var itemsResult = await window.supabaseClient.from('order_items').insert(itemsPayload);
        if (itemsResult.error) throw itemsResult.error;

        // Pedido guardado: mostramos el número de pedido y limpiamos el carrito
        orderNumberDisplay.textContent = orderId;
        if (emailOrderNote) emailOrderNote.textContent = ' (' + orderId + ')';
        if (emailReceiptLink) {
          emailReceiptLink.href = 'mailto:talayshop.mx@gmail.com?subject=' +
            encodeURIComponent('Comprobante de pago — Pedido ' + orderId) +
            '&body=' + encodeURIComponent('Hola, adjunto mi comprobante de pago.\n\nNombre: ' + name + '\nNúmero de pedido: ' + orderId);
        }

        confirmOrderBlock.style.display = 'none';
        orderConfirmedBlock.style.display = 'block';

        cart.length = 0;
        saveCart(cart);
        renderAllCarts();
      } catch (err) {
        confirmOrderMessage.textContent = 'No se pudo registrar tu pedido: ' + err.message;
        confirmOrderMessage.className = 'form-message error';
        btnConfirmOrder.disabled = false;
        btnConfirmOrder.textContent = 'Confirmar mi pedido';
      }
    });
  }
});