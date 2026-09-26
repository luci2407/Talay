document.addEventListener('DOMContentLoaded', async function () {
  var client = window.supabaseClient;

  // -------- Guardia de acceso: debe haber sesión Y estar en la tabla admins --------
  async function requireAdmin() {
    var sessionResult = await client.auth.getSession();
    var session = sessionResult.data ? sessionResult.data.session : null;
    if (!session) {
      window.location.href = 'admin-login.html';
      return null;
    }
    var adminResult = await client
      .from('admins')
      .select('id')
      .eq('id', session.user.id)
      .maybeSingle();

    if (adminResult.error || !adminResult.data) {
      await client.auth.signOut();
      window.location.href = 'admin-login.html';
      return null;
    }
    return session;
  }

  var session = await requireAdmin();
  if (!session) return; // ya redirigió a login

  document.getElementById('btn-logout').addEventListener('click', async function () {
    await client.auth.signOut();
    window.location.href = 'admin-login.html';
  });

  // -------- Pestañas --------
  var tabs = document.querySelectorAll('.admin-tab');
  var panels = document.querySelectorAll('.admin-panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById('panel-' + tab.getAttribute('data-tab')).classList.add('active');
    });
  });

  function showMessage(el, text, isError) {
    el.textContent = text;
    el.className = 'form-message ' + (isError ? 'error' : 'success');
  }

  // -------- Imágenes: mostrar y subir --------
  // Las imágenes viejas siguen guardadas como ruta relativa (ej. "pic/producto-1.jpg");
  // las nuevas se guardan como URL completa de Supabase Storage. Esta función
  // muestra cualquiera de las dos correctamente en el panel (que vive en /admin,
  // un nivel dentro de la raíz del proyecto, igual que /html).
  function resolveImageSrc(path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return '../' + path;
  }

  // Sube un archivo al bucket "product-images" y regresa su URL pública
  async function uploadImage(file, namePrefix) {
    var ext = file.name.split('.').pop();
    var fileName = namePrefix + '-' + Date.now() + '.' + ext;
    var uploadResult = await client.storage.from('product-images').upload(fileName, file, { upsert: false });
    if (uploadResult.error) throw uploadResult.error;
    var urlResult = client.storage.from('product-images').getPublicUrl(fileName);
    return urlResult.data.publicUrl;
  }

  // Muestra una vista previa instantánea del archivo elegido, antes de subirlo
  function wireImagePreview(fileInputEl, previewImgEl) {
    fileInputEl.addEventListener('change', function () {
      var file = fileInputEl.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (e) {
        previewImgEl.src = e.target.result;
        previewImgEl.style.display = 'block';
      };
      reader.readAsDataURL(file);
    });
  }

  // ============================================================
  // CATEGORÍAS
  // ============================================================
  var catForm = document.getElementById('cat-form');
  var catList = document.getElementById('cat-list');
  var catEditingId = document.getElementById('cat-editing-id');
  var catIdInput = document.getElementById('cat-id');
  var catNameInput = document.getElementById('cat-name');
  var catImageFile = document.getElementById('cat-image-file');
  var catImageCurrent = document.getElementById('cat-image-current');
  var catImagePreview = document.getElementById('cat-image-preview');
  var catDescInput = document.getElementById('cat-description');
  var catFormTitle = document.getElementById('cat-form-title');
  var catSubmitBtn = document.getElementById('cat-submit-btn');
  var catCancelBtn = document.getElementById('cat-cancel-btn');
  var catMessage = document.getElementById('cat-message');

  wireImagePreview(catImageFile, catImagePreview);

  function resetCatForm() {
    catEditingId.value = '';
    catForm.reset();
    catIdInput.disabled = false;
    catImageCurrent.value = '';
    catImagePreview.src = '';
    catImagePreview.style.display = 'none';
    catFormTitle.textContent = 'Nueva categoría';
    catSubmitBtn.textContent = 'Guardar categoría';
    catCancelBtn.style.display = 'none';
  }

  async function loadCategories() {
    var result = await client.from('categories').select('*').order('name');
    if (result.error) {
      catList.innerHTML = '<li class="admin-empty">No se pudieron cargar las categorías.</li>';
      return [];
    }
    var categories = result.data || [];

    catList.innerHTML = categories.length
      ? categories.map(function (cat) {
          return (
            '<li class="admin-row" data-id="' + cat.id + '">' +
              '<img src="' + resolveImageSrc(cat.image) + '" alt="">' +
              '<div class="row-info">' +
                '<div class="row-title">' + cat.name + '</div>' +
                '<div class="row-sub">' + cat.id + '</div>' +
              '</div>' +
              '<div class="row-actions">' +
                '<button type="button" class="icon-action edit-cat" aria-label="Editar">✎</button>' +
                '<button type="button" class="icon-action danger delete-cat" aria-label="Borrar">✕</button>' +
              '</div>' +
            '</li>'
          );
        }).join('')
      : '<li class="admin-empty">Todavía no hay categorías.</li>';

    catList.querySelectorAll('.edit-cat').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.closest('.admin-row').getAttribute('data-id');
        var cat = categories.find(function (c) { return c.id === id; });
        if (!cat) return;
        catEditingId.value = cat.id;
        catIdInput.value = cat.id;
        catIdInput.disabled = true; // el id no se cambia al editar
        catNameInput.value = cat.name || '';
        catImageCurrent.value = cat.image || '';
        if (cat.image) {
          catImagePreview.src = resolveImageSrc(cat.image);
          catImagePreview.style.display = 'block';
        } else {
          catImagePreview.style.display = 'none';
        }
        catDescInput.value = cat.description || '';
        catFormTitle.textContent = 'Editar categoría';
        catSubmitBtn.textContent = 'Actualizar categoría';
        catCancelBtn.style.display = 'inline-block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    catList.querySelectorAll('.delete-cat').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var id = btn.closest('.admin-row').getAttribute('data-id');
        if (!confirm('¿Borrar esta categoría? Los productos que la usan quedarán sin categoría.')) return;
        var delResult = await client.from('categories').delete().eq('id', id);
        if (delResult.error) {
          alert('No se pudo borrar: ' + delResult.error.message);
          return;
        }
        loadCategories();
        loadProducts(); // por si algún producto quedó sin categoría, refrescamos su vista también
      });
    });

    // Refresca el <select> de categorías en el formulario de productos
    var prodCategorySelect = document.getElementById('prod-category');
    var currentValue = prodCategorySelect.value;
    prodCategorySelect.innerHTML = categories.map(function (c) {
      return '<option value="' + c.id + '">' + c.name + '</option>';
    }).join('');
    if (currentValue) prodCategorySelect.value = currentValue;

    return categories;
  }

  catCancelBtn.addEventListener('click', resetCatForm);

  catForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    var isEditing = !!catEditingId.value;

    var imageValue = catImageCurrent.value; // mantiene la imagen existente si no se elige una nueva
    var newFile = catImageFile.files[0];
    if (newFile) {
      catSubmitBtn.disabled = true;
      catSubmitBtn.textContent = 'Subiendo imagen…';
      try {
        imageValue = await uploadImage(newFile, catIdInput.value.trim() || 'categoria');
      } catch (uploadErr) {
        showMessage(catMessage, 'No se pudo subir la imagen: ' + uploadErr.message, true);
        catSubmitBtn.disabled = false;
        catSubmitBtn.textContent = isEditing ? 'Actualizar categoría' : 'Guardar categoría';
        return;
      }
    }

    var payload = {
      id: catIdInput.value.trim(),
      name: catNameInput.value.trim(),
      image: imageValue,
      description: catDescInput.value.trim()
    };

    var result = isEditing
      ? await client.from('categories').update(payload).eq('id', catEditingId.value)
      : await client.from('categories').insert(payload);

    catSubmitBtn.disabled = false;

    if (result.error) {
      catSubmitBtn.textContent = isEditing ? 'Actualizar categoría' : 'Guardar categoría';
      showMessage(catMessage, result.error.message, true);
      return;
    }
    showMessage(catMessage, isEditing ? 'Categoría actualizada.' : 'Categoría creada.', false);
    resetCatForm();
    loadCategories();
  });

  // ============================================================
  // PRODUCTOS
  // ============================================================
  var prodForm = document.getElementById('prod-form');
  var prodList = document.getElementById('prod-list');
  var prodEditingId = document.getElementById('prod-editing-id');
  var prodIdInput = document.getElementById('prod-id');
  var prodNameInput = document.getElementById('prod-name');
  var prodPriceInput = document.getElementById('prod-price');
  var prodCategoryInput = document.getElementById('prod-category');
  var prodImageFile = document.getElementById('prod-image-file');
  var prodImageCurrent = document.getElementById('prod-image-current');
  var prodImagePreview = document.getElementById('prod-image-preview');
  var prodDescInput = document.getElementById('prod-description');
  var prodFeaturedInput = document.getElementById('prod-featured');
  var prodFormTitle = document.getElementById('prod-form-title');
  var prodSubmitBtn = document.getElementById('prod-submit-btn');
  var prodCancelBtn = document.getElementById('prod-cancel-btn');
  var prodMessage = document.getElementById('prod-message');

  wireImagePreview(prodImageFile, prodImagePreview);

  function resetProdForm() {
    prodEditingId.value = '';
    prodForm.reset();
    prodIdInput.disabled = false;
    prodImageCurrent.value = '';
    prodImagePreview.src = '';
    prodImagePreview.style.display = 'none';
    prodFeaturedInput.checked = false;
    prodFormTitle.textContent = 'Nuevo producto';
    prodSubmitBtn.textContent = 'Guardar producto';
    prodCancelBtn.style.display = 'none';
  }

  async function loadProducts() {
    var result = await client
      .from('products')
      .select('id, name, price, category_id, image, description, featured, categories ( name )')
      .order('name');

    if (result.error) {
      prodList.innerHTML = '<li class="admin-empty">No se pudieron cargar los productos.</li>';
      return;
    }
    var products = result.data || [];

    prodList.innerHTML = products.length
      ? products.map(function (p) {
          var categoryName = p.categories ? p.categories.name : 'Sin categoría';
          var featuredTag = p.featured ? ' · ★ Destacado' : '';
          return (
            '<li class="admin-row" data-id="' + p.id + '">' +
              '<img src="' + resolveImageSrc(p.image) + '" alt="">' +
              '<div class="row-info">' +
                '<div class="row-title">' + p.name + '</div>' +
                '<div class="row-sub">$' + Number(p.price).toLocaleString('es-MX') + ' MXN · ' + categoryName + featuredTag + '</div>' +
              '</div>' +
              '<div class="row-actions">' +
                '<button type="button" class="icon-action edit-prod" aria-label="Editar">✎</button>' +
                '<button type="button" class="icon-action danger delete-prod" aria-label="Borrar">✕</button>' +
              '</div>' +
            '</li>'
          );
        }).join('')
      : '<li class="admin-empty">Todavía no hay productos.</li>';

    prodList.querySelectorAll('.edit-prod').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.closest('.admin-row').getAttribute('data-id');
        var product = products.find(function (p) { return p.id === id; });
        if (!product) return;
        prodEditingId.value = product.id;
        prodIdInput.value = product.id;
        prodIdInput.disabled = true;
        prodNameInput.value = product.name || '';
        prodPriceInput.value = product.price || '';
        prodCategoryInput.value = product.category_id || '';
        prodImageCurrent.value = product.image || '';
        if (product.image) {
          prodImagePreview.src = resolveImageSrc(product.image);
          prodImagePreview.style.display = 'block';
        } else {
          prodImagePreview.style.display = 'none';
        }
        prodDescInput.value = product.description || '';
        prodFeaturedInput.checked = !!product.featured;
        prodFormTitle.textContent = 'Editar producto';
        prodSubmitBtn.textContent = 'Actualizar producto';
        prodCancelBtn.style.display = 'inline-block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    prodList.querySelectorAll('.delete-prod').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var id = btn.closest('.admin-row').getAttribute('data-id');
        if (!confirm('¿Borrar este producto?')) return;
        var delResult = await client.from('products').delete().eq('id', id);
        if (delResult.error) {
          alert('No se pudo borrar: ' + delResult.error.message);
          return;
        }
        loadProducts();
      });
    });
  }

  prodCancelBtn.addEventListener('click', resetProdForm);

  prodForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    var isEditing = !!prodEditingId.value;

    var imageValue = prodImageCurrent.value; // mantiene la imagen existente si no se elige una nueva
    var newFile = prodImageFile.files[0];
    if (newFile) {
      prodSubmitBtn.disabled = true;
      prodSubmitBtn.textContent = 'Subiendo imagen…';
      try {
        imageValue = await uploadImage(newFile, prodIdInput.value.trim() || 'producto');
      } catch (uploadErr) {
        showMessage(prodMessage, 'No se pudo subir la imagen: ' + uploadErr.message, true);
        prodSubmitBtn.disabled = false;
        prodSubmitBtn.textContent = isEditing ? 'Actualizar producto' : 'Guardar producto';
        return;
      }
    }

    // Límite de 4 productos destacados en el inicio
    if (prodFeaturedInput.checked) {
      var countQuery = client.from('products').select('id', { count: 'exact', head: true }).eq('featured', true);
      if (isEditing) countQuery = countQuery.neq('id', prodEditingId.value);
      var countResult = await countQuery;
      if (!countResult.error && (countResult.count || 0) >= 4) {
        showMessage(prodMessage, 'Ya tienes 4 productos destacados en el inicio. Quita uno antes de agregar otro.', true);
        prodSubmitBtn.disabled = false;
        prodSubmitBtn.textContent = isEditing ? 'Actualizar producto' : 'Guardar producto';
        return;
      }
    }

    var payload = {
      id: prodIdInput.value.trim(),
      name: prodNameInput.value.trim(),
      price: parseFloat(prodPriceInput.value),
      category_id: prodCategoryInput.value || null,
      image: imageValue,
      description: prodDescInput.value.trim(),
      featured: prodFeaturedInput.checked
    };

    var result = isEditing
      ? await client.from('products').update(payload).eq('id', prodEditingId.value)
      : await client.from('products').insert(payload);

    prodSubmitBtn.disabled = false;

    if (result.error) {
      prodSubmitBtn.textContent = isEditing ? 'Actualizar producto' : 'Guardar producto';
      showMessage(prodMessage, result.error.message, true);
      return;
    }
    showMessage(prodMessage, isEditing ? 'Producto actualizado.' : 'Producto creado.', false);
    resetProdForm();
    loadProducts();
  });

  // ============================================================
  // EVENTOS
  // ============================================================
  var eventForm = document.getElementById('event-form');
  var eventList = document.getElementById('event-list');
  var eventEditingId = document.getElementById('event-editing-id');
  var eventTitleInput = document.getElementById('event-title');
  var eventDateInput = document.getElementById('event-date');
  var eventTimeInput = document.getElementById('event-time');
  var eventLocationInput = document.getElementById('event-location');
  var eventRegistrationInput = document.getElementById('event-registration');
  var eventFormTitle = document.getElementById('event-form-title');
  var eventSubmitBtn = document.getElementById('event-submit-btn');
  var eventCancelBtn = document.getElementById('event-cancel-btn');
  var eventMessage = document.getElementById('event-message');

  function resetEventForm() {
    eventEditingId.value = '';
    eventForm.reset();
    eventFormTitle.textContent = 'Nuevo evento';
    eventSubmitBtn.textContent = 'Guardar evento';
    eventCancelBtn.style.display = 'none';
  }

  async function loadEvents() {
    var result = await client.from('events').select('*').order('event_date');
    if (result.error) {
      eventList.innerHTML = '<li class="admin-empty">No se pudieron cargar los eventos.</li>';
      return;
    }
    var events = result.data || [];

    eventList.innerHTML = events.length
      ? events.map(function (ev) {
          return (
            '<li class="admin-row" data-id="' + ev.id + '">' +
              '<div class="row-info">' +
                '<div class="row-title">' + ev.title + '</div>' +
                '<div class="row-sub">' + ev.event_date + (ev.event_time ? ' · ' + ev.event_time : '') + (ev.location ? ' · ' + ev.location : '') + '</div>' +
              '</div>' +
              '<div class="row-actions">' +
                '<button type="button" class="icon-action edit-event" aria-label="Editar">✎</button>' +
                '<button type="button" class="icon-action danger delete-event" aria-label="Borrar">✕</button>' +
              '</div>' +
            '</li>'
          );
        }).join('')
      : '<li class="admin-empty">Todavía no hay eventos.</li>';

    eventList.querySelectorAll('.edit-event').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.closest('.admin-row').getAttribute('data-id');
        var ev = events.find(function (e) { return String(e.id) === id; });
        if (!ev) return;
        eventEditingId.value = ev.id;
        eventTitleInput.value = ev.title || '';
        eventDateInput.value = ev.event_date || '';
        eventTimeInput.value = ev.event_time || '';
        eventLocationInput.value = ev.location || '';
        eventRegistrationInput.value = ev.registration_url || '';
        eventFormTitle.textContent = 'Editar evento';
        eventSubmitBtn.textContent = 'Actualizar evento';
        eventCancelBtn.style.display = 'inline-block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    eventList.querySelectorAll('.delete-event').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var id = btn.closest('.admin-row').getAttribute('data-id');
        if (!confirm('¿Borrar este evento?')) return;
        var delResult = await client.from('events').delete().eq('id', id);
        if (delResult.error) {
          alert('No se pudo borrar: ' + delResult.error.message);
          return;
        }
        loadEvents();
      });
    });
  }

  eventCancelBtn.addEventListener('click', resetEventForm);

  eventForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    var isEditing = !!eventEditingId.value;
    var payload = {
      title: eventTitleInput.value.trim(),
      event_date: eventDateInput.value,
      event_time: eventTimeInput.value.trim(),
      location: eventLocationInput.value.trim(),
      registration_url: eventRegistrationInput.value.trim()
    };

    var result = isEditing
      ? await client.from('events').update(payload).eq('id', eventEditingId.value)
      : await client.from('events').insert(payload);

    if (result.error) {
      showMessage(eventMessage, result.error.message, true);
      return;
    }
    showMessage(eventMessage, isEditing ? 'Evento actualizado.' : 'Evento creado.', false);
    resetEventForm();
    loadEvents();
  });

  // ============================================================
  // RESEÑAS
  // ============================================================
  var reviewForm = document.getElementById('review-form');
  var reviewList = document.getElementById('review-list');
  var reviewEditingId = document.getElementById('review-editing-id');
  var reviewNameInput = document.getElementById('review-name');
  var reviewRatingInput = document.getElementById('review-rating');
  var reviewCommentInput = document.getElementById('review-comment');
  var reviewPhotoFile = document.getElementById('review-photo-file');
  var reviewPhotoCurrent = document.getElementById('review-photo-current');
  var reviewPhotoPreview = document.getElementById('review-photo-preview');
  var reviewApprovedInput = document.getElementById('review-approved');
  var reviewFeaturedInput = document.getElementById('review-featured');
  var reviewFormTitle = document.getElementById('review-form-title');
  var reviewSubmitBtn = document.getElementById('review-submit-btn');
  var reviewCancelBtn = document.getElementById('review-cancel-btn');
  var reviewMessage = document.getElementById('review-message');

  wireImagePreview(reviewPhotoFile, reviewPhotoPreview);

  function resetReviewForm() {
    reviewEditingId.value = '';
    reviewForm.reset();
    reviewPhotoCurrent.value = '';
    reviewPhotoPreview.src = '';
    reviewPhotoPreview.style.display = 'none';
    reviewApprovedInput.checked = true;
    reviewFeaturedInput.checked = false;
    reviewFormTitle.textContent = 'Nueva reseña';
    reviewSubmitBtn.textContent = 'Guardar reseña';
    reviewCancelBtn.style.display = 'none';
  }

  async function loadReviews() {
    var result = await client.from('reviews').select('*').order('created_at', { ascending: false });
    if (result.error) {
      reviewList.innerHTML = '<li class="admin-empty">No se pudieron cargar las reseñas.</li>';
      return;
    }
    var reviews = result.data || [];

    reviewList.innerHTML = reviews.length
      ? reviews.map(function (rev) {
          var visLabel = rev.approved ? 'Visible' : 'Oculta';
          var featuredTag = rev.featured ? ' · ★ Destacada' : '';
          return (
            '<li class="admin-row" data-id="' + rev.id + '">' +
              (rev.photo_url
                ? '<img src="' + rev.photo_url + '" alt="">'
                : '<div style="width:44px;height:44px;border-radius:10px;background:var(--sky);flex-shrink:0;"></div>') +
              '<div class="row-info">' +
                '<div class="row-title">' + rev.customer_name + ' · ' + '★'.repeat(rev.rating) + '</div>' +
                '<div class="row-sub">' + visLabel + featuredTag + ' — ' + (rev.comment || '').slice(0, 60) + '</div>' +
              '</div>' +
              '<div class="row-actions">' +
                '<button type="button" class="icon-action edit-review" aria-label="Editar">✎</button>' +
                '<button type="button" class="icon-action danger delete-review" aria-label="Borrar">✕</button>' +
              '</div>' +
            '</li>'
          );
        }).join('')
      : '<li class="admin-empty">Todavía no hay reseñas.</li>';

    reviewList.querySelectorAll('.edit-review').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.closest('.admin-row').getAttribute('data-id');
        var rev = reviews.find(function (r) { return String(r.id) === id; });
        if (!rev) return;
        reviewEditingId.value = rev.id;
        reviewNameInput.value = rev.customer_name || '';
        reviewRatingInput.value = rev.rating || 5;
        reviewCommentInput.value = rev.comment || '';
        reviewPhotoCurrent.value = rev.photo_url || '';
        reviewApprovedInput.checked = !!rev.approved;
        reviewFeaturedInput.checked = !!rev.featured;
        if (rev.photo_url) {
          reviewPhotoPreview.src = rev.photo_url;
          reviewPhotoPreview.style.display = 'block';
        } else {
          reviewPhotoPreview.style.display = 'none';
        }
        reviewFormTitle.textContent = 'Editar reseña';
        reviewSubmitBtn.textContent = 'Actualizar reseña';
        reviewCancelBtn.style.display = 'inline-block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    reviewList.querySelectorAll('.delete-review').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var id = btn.closest('.admin-row').getAttribute('data-id');
        if (!confirm('¿Borrar esta reseña?')) return;
        var delResult = await client.from('reviews').delete().eq('id', id);
        if (delResult.error) {
          alert('No se pudo borrar: ' + delResult.error.message);
          return;
        }
        loadReviews();
      });
    });
  }

  reviewCancelBtn.addEventListener('click', resetReviewForm);

  reviewForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    var isEditing = !!reviewEditingId.value;

    var photoValue = reviewPhotoCurrent.value;
    var newFile = reviewPhotoFile.files[0];
    if (newFile) {
      reviewSubmitBtn.disabled = true;
      reviewSubmitBtn.textContent = 'Subiendo foto…';
      try {
        var ext = newFile.name.split('.').pop();
        var fileName = 'review-' + Date.now() + '.' + ext;
        var uploadResult = await client.storage.from('review-photos').upload(fileName, newFile);
        if (uploadResult.error) throw uploadResult.error;
        var urlResult = client.storage.from('review-photos').getPublicUrl(fileName);
        photoValue = urlResult.data.publicUrl;
      } catch (uploadErr) {
        showMessage(reviewMessage, 'No se pudo subir la foto: ' + uploadErr.message, true);
        reviewSubmitBtn.disabled = false;
        reviewSubmitBtn.textContent = isEditing ? 'Actualizar reseña' : 'Guardar reseña';
        return;
      }
    }

    // Límite de 3 reseñas destacadas en el inicio
    if (reviewFeaturedInput.checked) {
      var countQuery = client.from('reviews').select('id', { count: 'exact', head: true }).eq('featured', true);
      if (isEditing) countQuery = countQuery.neq('id', reviewEditingId.value);
      var countResult = await countQuery;
      if (!countResult.error && (countResult.count || 0) >= 3) {
        showMessage(reviewMessage, 'Ya tienes 3 reseñas destacadas en el inicio. Quita una antes de agregar otra.', true);
        reviewSubmitBtn.disabled = false;
        reviewSubmitBtn.textContent = isEditing ? 'Actualizar reseña' : 'Guardar reseña';
        return;
      }
    }

    var payload = {
      customer_name: reviewNameInput.value.trim(),
      rating: parseInt(reviewRatingInput.value, 10),
      comment: reviewCommentInput.value.trim(),
      photo_url: photoValue || null,
      approved: reviewApprovedInput.checked,
      featured: reviewFeaturedInput.checked
    };

    var result = isEditing
      ? await client.from('reviews').update(payload).eq('id', reviewEditingId.value)
      : await client.from('reviews').insert(payload);

    reviewSubmitBtn.disabled = false;

    if (result.error) {
      reviewSubmitBtn.textContent = isEditing ? 'Actualizar reseña' : 'Guardar reseña';
      showMessage(reviewMessage, result.error.message, true);
      return;
    }
    showMessage(reviewMessage, isEditing ? 'Reseña actualizada.' : 'Reseña creada.', false);
    resetReviewForm();
    loadReviews();
  });

  // ============================================================
  // ENTREGAS (fechas de entrega personal)
  // ============================================================
  var pickupForm = document.getElementById('pickup-date-form');
  var pickupList = document.getElementById('pickup-date-list');
  var pickupDateInput = document.getElementById('pickup-date-input');
  var pickupTimeInput = document.getElementById('pickup-time-input');
  var pickupLocationInput = document.getElementById('pickup-location-input');
  var pickupSubmitBtn = document.getElementById('pickup-date-submit-btn');
  var pickupMessage = document.getElementById('pickup-date-message');

  async function loadPickupDates() {
    var result = await client.from('pickup_dates').select('*').order('pickup_date', { ascending: true });
    if (result.error) {
      pickupList.innerHTML = '<li class="admin-empty">No se pudieron cargar las fechas.</li>';
      return;
    }
    var dates = result.data || [];

    pickupList.innerHTML = dates.length
      ? dates.map(function (d) {
          var label = new Date(d.pickup_date + 'T00:00:00').toLocaleDateString('es-MX', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          });
          var details = [];
          if (d.pickup_time) details.push(d.pickup_time);
          if (d.location) details.push(d.location);
          var detailsHtml = details.length
            ? '<div class="row-sub">' + details.join(' · ') + '</div>'
            : '';
          return (
            '<li class="admin-row" data-id="' + d.id + '">' +
              '<div class="row-info"><div class="row-title">' + label + '</div>' + detailsHtml + '</div>' +
              '<div class="row-actions">' +
                '<button type="button" class="icon-action danger delete-pickup-date" aria-label="Borrar">✕</button>' +
              '</div>' +
            '</li>'
          );
        }).join('')
      : '<li class="admin-empty">Todavía no hay fechas de entrega personal.</li>';

    pickupList.querySelectorAll('.delete-pickup-date').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var id = btn.closest('.admin-row').getAttribute('data-id');
        if (!confirm('¿Borrar esta fecha de entrega?')) return;
        var delResult = await client.from('pickup_dates').delete().eq('id', id);
        if (delResult.error) {
          alert('No se pudo borrar: ' + delResult.error.message);
          return;
        }
        loadPickupDates();
      });
    });
  }

  pickupForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!pickupDateInput.value || !pickupTimeInput.value || !pickupLocationInput.value) return;

    pickupSubmitBtn.disabled = true;
    pickupSubmitBtn.textContent = 'Guardando…';

    var result = await client.from('pickup_dates').insert({
      pickup_date: pickupDateInput.value,
      pickup_time: pickupTimeInput.value,
      location: pickupLocationInput.value
    });

    pickupSubmitBtn.disabled = false;
    pickupSubmitBtn.textContent = 'Agregar fecha';

    if (result.error) {
      showMessage(pickupMessage, result.error.message, true);
      return;
    }
    showMessage(pickupMessage, 'Fecha agregada.', false);
    pickupForm.reset();
    loadPickupDates();
  });

  // ============================================================
  // PEDIDOS
  // ============================================================
  var orderList = document.getElementById('order-list');

  var orderStatusLabels = {
    pendiente: 'Pendiente de pago',
    pagado: 'Pagado',
    enviado: 'Enviado',
    cancelado: 'Cancelado'
  };

  var deliveryLabels = {
    envio: 'Envío (Correos de México)',
    personal: 'Entrega personal'
  };

  async function loadOrders() {
    var ordersResult = await client
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (ordersResult.error) {
      orderList.innerHTML = '<li class="admin-empty">No se pudieron cargar los pedidos.</li>';
      return;
    }
    var orders = ordersResult.data || [];

    if (orders.length === 0) {
      orderList.innerHTML = '<li class="admin-empty">Todavía no hay pedidos.</li>';
      return;
    }

    var orderIds = orders.map(function (o) { return o.id; });
    var itemsResult = await client
      .from('order_items')
      .select('*')
      .in('order_id', orderIds);

    var itemsByOrder = {};
    (itemsResult.data || []).forEach(function (item) {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(item);
    });

    orderList.innerHTML = orders.map(function (o) {
      var items = itemsByOrder[o.id] || [];
      var itemsHtml = items.length
        ? items.map(function (it) {
            return it.quantity + '× ' + it.product_name;
          }).join(', ')
        : 'Sin productos registrados';

      var createdLabel = o.created_at
        ? new Date(o.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
        : '';

      var deliveryInfo = deliveryLabels[o.delivery_method] || o.delivery_method || '—';
      if (o.delivery_method === 'personal' && o.pickup_date) {
        var pickupLabel = new Date(o.pickup_date + 'T00:00:00').toLocaleDateString('es-MX', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        deliveryInfo += ' — ' + pickupLabel;
        var extra = [];
        if (o.pickup_time) extra.push(o.pickup_time);
        if (o.pickup_location) extra.push(o.pickup_location);
        if (extra.length) deliveryInfo += ' (' + extra.join(' · ') + ')';
      }

      var statusOptions = Object.keys(orderStatusLabels).map(function (key) {
        return '<option value="' + key + '"' + (o.status === key ? ' selected' : '') + '>' +
          orderStatusLabels[key] + '</option>';
      }).join('');

      return (
        '<li class="order-row" data-id="' + o.id + '">' +
          '<div class="order-info">' +
            '<div class="order-title">' + o.customer_name + ' · #' + String(o.id).slice(0, 8) + '</div>' +
            '<div class="order-sub">' + o.customer_email + (createdLabel ? ' · ' + createdLabel : '') + '</div>' +
            '<div class="order-sub">' + deliveryInfo + '</div>' +
            '<div class="order-items">' + itemsHtml + '</div>' +
          '</div>' +
          '<div class="order-side">' +
            '<div class="order-total">$' + Number(o.total).toLocaleString('es-MX') + ' MXN</div>' +
            '<select class="order-status-select status-' + o.status + '">' + statusOptions + '</select>' +
          '</div>' +
        '</li>'
      );
    }).join('');

    orderList.querySelectorAll('.order-row').forEach(function (row) {
      var select = row.querySelector('.order-status-select');
      select.addEventListener('change', async function () {
        var id = row.getAttribute('data-id');
        var newStatus = select.value;
        select.className = 'order-status-select status-' + newStatus;
        var updateResult = await client.from('orders').update({ status: newStatus }).eq('id', id);
        if (updateResult.error) {
          alert('No se pudo actualizar el estado: ' + updateResult.error.message);
        }
      });
    });
  }

  // -------- Carga inicial --------
  await loadCategories();
  await loadProducts();
  await loadEvents();
  await loadReviews();
  await loadPickupDates();
  await loadOrders();
});