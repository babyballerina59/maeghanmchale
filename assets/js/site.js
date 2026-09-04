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

  const lightbox = document.querySelector('.lightbox');
  if (lightbox) {
    const lightboxImg = lightbox.querySelector('img');
    const galleryItems = [...document.querySelectorAll('.gallery-item')];
    let activeIndex = -1;

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

    const showImage = index => {
      if (!galleryItems.length) return;
      activeIndex = (index + galleryItems.length) % galleryItems.length;
      const img = galleryItems[activeIndex].querySelector('img');
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden', 'false');
    };
    const close = () => {
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
      lightboxImg.removeAttribute('src');
      activeIndex = -1;
    };
    galleryItems.forEach((item, index) => item.addEventListener('click', () => showImage(index)));
    lightbox.querySelector('.lightbox-close')?.addEventListener('click', close);
    prevButton.addEventListener('click', () => showImage(activeIndex - 1));
    nextButton.addEventListener('click', () => showImage(activeIndex + 1));
    lightbox.addEventListener('click', e => { if (e.target === lightbox) close(); });
    document.addEventListener('keydown', e => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') { e.preventDefault(); showImage(activeIndex - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); showImage(activeIndex + 1); }
    });
  }

  const igGrid = document.querySelector('[data-instagram-grid]');
  if (igGrid) {
    fetch('assets/data/instagram.json')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(posts => {
        igGrid.innerHTML = posts.slice(0, 6).map(post => `
          <a class="instagram-card" href="${post.url}" target="_blank" rel="noreferrer" aria-label="Open Maeghan McHale on Instagram">
            <img src="${post.image}" alt="${post.alt}" loading="lazy">
          </a>`).join('');
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
