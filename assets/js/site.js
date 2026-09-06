(() => {
  const body = document.body;
  const toggle = document.querySelector('.nav-toggle');
  const mobileNav = document.querySelector('.mobile-nav');

  if (toggle && mobileNav) {
    const closeNav = () => {
      mobileNav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      body.classList.remove('nav-open');
    };
    toggle.addEventListener('click', () => {
      const open = !mobileNav.classList.contains('is-open');
      mobileNav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      body.classList.toggle('nav-open', open);
    });
    mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeNav));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });
  }

  const current = body.dataset.page;
  document.querySelectorAll(`[data-nav="${current}"]`).forEach(link => link.setAttribute('aria-current', 'page'));

  // About hero: keep the sticky container exactly the same rendered height as
  // the uncropped portrait. This makes the pinned navigation/title release at
  // the photograph's true bottom instead of bleeding into Biography.
  const aboutStage = document.querySelector('.about-scroll-stage');
  const aboutPortrait = aboutStage?.querySelector('.about-scroll-media img');
  if (aboutStage && aboutPortrait) {
    let aboutResizeFrame = 0;
    const syncAboutStage = () => {
      cancelAnimationFrame(aboutResizeFrame);
      aboutResizeFrame = requestAnimationFrame(() => {
        if (!window.matchMedia('(min-width: 981px)').matches) {
          aboutStage.style.removeProperty('--about-stage-height');
          return;
        }
        const naturalWidth = aboutPortrait.naturalWidth || 1464;
        const naturalHeight = aboutPortrait.naturalHeight || 2200;
        const renderedImageHeight = aboutStage.clientWidth * (naturalHeight / naturalWidth);
        const stageHeight = Math.max(renderedImageHeight, window.innerHeight);
        aboutStage.style.setProperty('--about-stage-height', `${stageHeight}px`);
      });
    };
    if (aboutPortrait.complete) syncAboutStage();
    else aboutPortrait.addEventListener('load', syncAboutStage, { once: true });
    window.addEventListener('resize', syncAboutStage, { passive: true });
  }

  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(el => observer.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in-view'));
  }

  const imagePositions = {
    center: '50% 50%',
    upper: '50% 18%',
    top: '50% 0%',
    bottom: '50% 100%',
    left: '0% 50%',
    right: '100% 50%',
    'top-left': '0% 0%',
    'top-right': '100% 0%',
    'bottom-left': '0% 100%',
    'bottom-right': '100% 100%'
  };

  // Galleries are managed as data so Decap can add, remove, replace and
  // reorder images without exposing the page HTML. The editorial tile shapes
  // belong to each slot rather than each photo, so reordering automatically
  // preserves the established mosaic rhythm.
  const galleryConfigs = [
    {
      element: document.querySelector('[data-gallery="choreography"]'),
      url: 'assets/data/choreography-gallery.json',
      layout: ['wide', 'medium', 'third', 'third', 'third', 'medium', 'wide', 'third', 'third', 'third']
    },
    {
      element: document.querySelector('[data-gallery="teaching"]'),
      url: 'assets/data/teaching-gallery.json',
      layout: ['wide', 'tall', 'medium', 'offset']
    }
  ].filter(config => config.element);

  const galleryLayoutForCount = (pattern, count) => {
    const spans = { wide: 7, medium: 5, third: 4, tall: 5, offset: 7, half: 6, full: 12 };
    const classes = Array.from({ length: count }, (_, index) => pattern[index % pattern.length]);

    // Keep complete rows exactly as designed. If add/remove leaves a partial
    // final row, rebalance only that row so there is never an accidental gap.
    let rowStart = 0;
    let rowSpan = 0;
    for (let index = 0; index < classes.length; index += 1) {
      rowSpan += spans[classes[index]] || 12;
      if (rowSpan === 12) {
        rowStart = index + 1;
        rowSpan = 0;
      } else if (rowSpan > 12) {
        rowStart = index;
        rowSpan = spans[classes[index]] || 12;
      }
    }

    if (rowSpan > 0) {
      const remaining = classes.length - rowStart;
      if (remaining === 1) classes[rowStart] = 'full';
      else if (remaining === 2) classes.splice(rowStart, 2, 'half', 'half');
      else if (remaining === 3) classes.splice(rowStart, 3, 'third', 'third', 'third');
    }

    return classes;
  };

  const renderGallery = config => fetch(config.url)
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(data => {
      const items = Array.isArray(data) ? data : data.items;
      if (!Array.isArray(items)) return;
      const layout = galleryLayoutForCount(config.layout, items.length);

      const buttons = items.map((item, index) => {
        const button = document.createElement('button');
        button.className = `gallery-item ${layout[index]}`;
        button.type = 'button';

        const image = document.createElement('img');
        image.src = item.image;
        image.alt = item.alt || '';
        image.loading = 'lazy';
        image.style.objectPosition = imagePositions[item.position] || imagePositions.center;

        button.appendChild(image);
        return button;
      });

      config.element.replaceChildren(...buttons);
    })
    // The original gallery HTML remains in the page as a resilient fallback.
    .catch(() => {});

  const galleriesReady = galleryConfigs.length
    ? Promise.allSettled(galleryConfigs.map(renderGallery))
    : Promise.resolve();

  const setupLightbox = () => {
    const lightbox = document.querySelector('.lightbox');
    if (!lightbox) return;

    const lightboxImg = lightbox.querySelector('img');
    const closeButton = lightbox.querySelector('.lightbox-close');
    const galleryItems = [...document.querySelectorAll('.gallery-item')];
    let activeIndex = -1;
    let lightboxOpener = null;

    // Give the image viewer full dialog semantics for screen readers and
    // keyboard users while preserving the existing visual treatment.
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Image viewer');

    const prevButton = document.createElement('button');
    prevButton.type = 'button';
    prevButton.className = 'lightbox-nav lightbox-prev';
    prevButton.setAttribute('aria-label', 'Previous image');
    prevButton.innerHTML = '&#8249;';
    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'lightbox-nav lightbox-next';
    nextButton.setAttribute('aria-label', 'Next image');
    nextButton.innerHTML = '&#8250;';
    if (galleryItems.length > 1) lightbox.append(prevButton, nextButton);

    const focusableControls = () => [...lightbox.querySelectorAll('button:not([disabled])')];

    const showImage = index => {
      if (!galleryItems.length) return;
      activeIndex = (index + galleryItems.length) % galleryItems.length;
      const img = galleryItems[activeIndex].querySelector('img');
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden', 'false');
      closeButton?.focus({ preventScroll: true });
    };
    const close = () => {
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
      lightboxImg.removeAttribute('src');
      activeIndex = -1;
      const opener = lightboxOpener;
      lightboxOpener = null;
      opener?.focus({ preventScroll: true });
    };
    galleryItems.forEach((item, index) => item.addEventListener('click', () => {
      lightboxOpener = item;
      showImage(index);
    }));
    closeButton?.addEventListener('click', close);
    prevButton.addEventListener('click', () => showImage(activeIndex - 1));
    nextButton.addEventListener('click', () => showImage(activeIndex + 1));
    lightbox.addEventListener('click', e => { if (e.target === lightbox) close(); });
    document.addEventListener('keydown', e => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); showImage(activeIndex - 1); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); showImage(activeIndex + 1); return; }
      if (e.key === 'Tab') {
        const controls = focusableControls();
        if (!controls.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  };

  galleriesReady.finally(setupLightbox);

  const igGrid = document.querySelector('[data-instagram-grid]');
  if (igGrid) {
    fetch('assets/data/instagram.json')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        // Backward-compatible with the original top-level array while the CMS
        // uses an object wrapper so Decap can edit the six-post list safely.
        const posts = Array.isArray(data) ? data : data.posts;
        if (!Array.isArray(posts)) return;

        const cards = posts.slice(0, 6).map(post => {
          const card = document.createElement('a');
          card.className = 'instagram-card';
          card.href = post.url;
          card.target = '_blank';
          card.rel = 'noreferrer';
          card.setAttribute('aria-label', 'Open Maeghan McHale on Instagram');

          const image = document.createElement('img');
          image.src = post.image;
          image.alt = post.alt || '';
          image.loading = 'lazy';
          image.style.objectPosition = imagePositions[post.position] || imagePositions.center;

          card.appendChild(image);
          return card;
        });

        igGrid.replaceChildren(...cards);
      })
      .catch(() => {});
  }

  const form = document.querySelector('[data-contact-form]');
  if (form) {
    const inquirySelect = form.querySelector('[name="inquiry"]');
    const subjectField = form.querySelector('[data-form-subject]');
    const requestedInquiry = new URLSearchParams(window.location.search).get('inquiry');
    if (requestedInquiry && inquirySelect) {
      const match = [...inquirySelect.options].find(option => option.value.toLowerCase() === requestedInquiry.toLowerCase());
      if (match) inquirySelect.value = match.value;
    }
    const updateSubject = () => {
      if (subjectField && inquirySelect) subjectField.value = `New ${inquirySelect.value} inquiry from MaeghanMcHale.com`;
    };
    inquirySelect?.addEventListener('change', updateSubject);
    updateSubject();
  }

  document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
})();
