(function () {
  const positionMap = {
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

  const galleryLayouts = {
    choreography: ['wide', 'medium', 'third', 'third', 'third', 'medium', 'wide', 'third', 'third', 'third'],
    teaching: ['wide', 'tall', 'medium', 'offset']
  };


  function galleryLayoutForCount(pattern, count) {
    const spans = { wide: 7, medium: 5, third: 4, tall: 5, offset: 7, half: 6, full: 12 };
    const classes = Array.from({ length: count }, (_, index) => pattern[index % pattern.length]);
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
  }

  function normalizeGalleryPath(type, source) {
    const value = String(source || '').replace(/^\/+/, '');
    if (!value) return '';
    if (/^assets\/img\/(choreography-gallery|teaching-gallery|instagram)\//i.test(value)) return value;

    const fileName = value.split('/').pop();
    if (type === 'choreography') return `assets/img/choreography-gallery/${fileName}`;
    if (type === 'teaching') return `assets/img/teaching-gallery/${fileName}`;
    if (type === 'instagram') return `assets/img/instagram/${fileName}`;
    return value;
  }

  function assetUrl(getAsset, path, type) {
    if (!path) return '';

    const normalizedPath = normalizeGalleryPath(type, path);

    // Newly selected files exist only in Decap's in-memory media store until
    // they are published. getAsset() resolves those to a blob/data URL, which
    // is exactly what the preview needs.
    const asset = getAsset(normalizedPath) || getAsset(path);
    const resolved = asset
      ? (typeof asset.toString === 'function' ? asset.toString() : '') || asset.url || asset.path || asset._path || asset._url || String(asset || '')
      : '';
    if (/^(blob:|data:)/i.test(resolved)) return resolved;

    // Existing published assets should resolve from the site root.
    if (/^\/?assets\//i.test(normalizedPath)) return `/${normalizedPath.replace(/^\/+/, '')}`;
    if (/^\/?assets\//i.test(String(path))) return `/${String(path).replace(/^\/+/, '')}`;

    // Fallback for any future asset shape Decap can resolve itself.
    return resolved || normalizedPath || String(path);
  }

  function immutableListToArray(list) {
    return list && typeof list.toArray === 'function' ? list.toArray() : [];
  }

  const galleryObjectUrls = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  function objectUrlFor(value) {
    if (typeof Blob === 'undefined' || !(value instanceof Blob)) return '';
    if (galleryObjectUrls && galleryObjectUrls.has(value)) return galleryObjectUrls.get(value);
    const url = URL.createObjectURL(value);
    if (galleryObjectUrls) galleryObjectUrls.set(value, url);
    return url;
  }

  function usableAssetString(value) {
    if (!value) return '';

    const objectUrl = objectUrlFor(value);
    if (objectUrl) return objectUrl;

    const candidates = [];
    if (typeof value === 'string') candidates.push(value);
    if (value && typeof value === 'object') {
      for (const key of ['url', '_url', 'path', '_path']) {
        if (typeof value[key] === 'string') candidates.push(value[key]);
      }
    }
    if (value && typeof value.toString === 'function') {
      try {
        const text = value.toString();
        if (text && text !== '[object Object]') candidates.push(text);
      } catch (_) {}
    }

    for (const candidate of candidates) {
      const text = String(candidate || '');
      if (!text) continue;

      // Decap preview regressions have produced URLs with a valid blob/data URL
      // incorrectly prefixed by the site path. Recover the actual in-memory URL.
      const blobIndex = text.indexOf('blob:');
      if (blobIndex >= 0) return text.slice(blobIndex);
      const dataIndex = text.indexOf('data:');
      if (dataIndex >= 0) return text.slice(dataIndex);

      if (/^https?:\/\//i.test(text)) return text;
      if (/^\/?assets\//i.test(text)) return `/${text.replace(/^\/+/, '')}`;
    }

    return '';
  }

  function galleryImageSource(imageWidget, entryValue, parentGetAsset) {
    const props = imageWidget && imageWidget.props ? imageWidget.props : null;
    const widgetValue = props && props.value != null ? props.value : entryValue;
    const field = props && props.field ? props.field : undefined;

    // A freshly chosen file may be handed directly to the widget before it has
    // a repository path. This bypasses all path handling and previews the File.
    let resolved = usableAssetString(widgetValue);
    if (/^(blob:|data:)/i.test(resolved)) return resolved;

    // The built-in image preview receives getAsset(value, field). Using the same
    // value + field context is essential for field-level gallery media folders.
    const attempts = [
      () => props && typeof props.getAsset === 'function' ? props.getAsset(widgetValue, field) : null,
      () => typeof parentGetAsset === 'function' ? parentGetAsset(widgetValue, field) : null,
      () => props && typeof props.getAsset === 'function' ? props.getAsset(entryValue, field) : null,
      () => typeof parentGetAsset === 'function' ? parentGetAsset(entryValue, field) : null,
      () => typeof parentGetAsset === 'function' ? parentGetAsset(entryValue) : null,
    ];

    let publishedFallback = '';
    for (const attempt of attempts) {
      try {
        const candidate = usableAssetString(attempt());
        if (!candidate) continue;
        if (/^(blob:|data:)/i.test(candidate)) return candidate;
        if (!publishedFallback) publishedFallback = candidate;
      } catch (_) {}
    }

    if (publishedFallback) return publishedFallback;

    // Existing gallery entries are saved as public paths such as
    // assets/img/teaching-gallery/foo.webp. Resolve those from the site root.
    const entryFallback = usableAssetString(entryValue);
    if (entryFallback) return entryFallback;

    return usableAssetString(widgetValue);
  }

  const InstagramPreview = createClass({
    render: function () {
      const items = immutableListToArray(this.props.entry.getIn(['data', 'posts']));

      return h('main', { className: 'ig-preview-shell' },
        h('div', { className: 'ig-preview-heading' },
          h('div', {},
            h('p', { className: 'ig-preview-eyebrow' }, 'On Instagram'),
            h('h1', {}, '@maeghanmchale')
          ),
          h('span', {}, 'Homepage preview')
        ),
        h('div', { className: 'ig-preview-grid' },
          items.slice(0, 6).map((post, index) => {
            const image = post.get('image');
            const alt = post.get('alt') || '';
            const position = post.get('position') || 'center';
            return h('div', { className: 'ig-preview-card', key: index },
              image
                ? h('img', {
                    src: assetUrl(this.props.getAsset, image, 'instagram'),
                    alt: alt,
                    style: { objectPosition: positionMap[position] || positionMap.center }
                  })
                : h('div', { className: 'ig-preview-empty' }, 'Choose an image'),
              h('span', { className: 'ig-preview-number' }, String(index + 1))
            );
          })
        ),
        h('p', { className: 'ig-preview-note' }, 'The square preview uses the same cover crop behavior as the live homepage. The uploaded image itself remains uncropped.')
      );
    }
  });

  function makeGalleryPreview(type, title, surfaceClass) {
    return createClass({
      render: function () {
        const items = immutableListToArray(this.props.entry.getIn(['data', 'items']));
        const widgetItems = this.props.widgetsFor('items');
        const layout = galleryLayoutForCount(galleryLayouts[type], items.length);

        return h('main', { className: `gallery-preview-shell ${surfaceClass}` },
          h('div', { className: 'gallery-preview-heading' },
            h('div', {},
              h('p', { className: 'gallery-preview-eyebrow' }, 'Gallery'),
              h('h1', {}, title)
            ),
            h('span', {}, `${items.length} image${items.length === 1 ? '' : 's'}`)
          ),
          h('div', { className: 'gallery-preview-grid' },
            items.map((item, index) => {
              const image = item.get('image');
              const alt = item.get('alt') || '';
              const position = item.get('position') || (type === 'teaching' ? 'upper' : 'center');
              const tileClass = layout[index % layout.length];
              const widgetItem = widgetItems && typeof widgetItems.get === 'function'
                ? widgetItems.get(index)
                : (widgetItems && widgetItems[index]) || null;
              const imageWidget = widgetItem && typeof widgetItem.getIn === 'function'
                ? widgetItem.getIn(['widgets', 'image'])
                : null;
              const src = image ? galleryImageSource(imageWidget, image, this.props.getAsset) : '';

              return h('div', {
                  className: `gallery-preview-item ${tileClass}`,
                  key: index,
                  style: { position: 'relative', overflow: 'hidden' }
                },
                image
                  ? (src
                      ? h('img', {
                          src: src,
                          alt: alt,
                          style: {
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            bottom: 0,
                            left: 0,
                            display: 'block',
                            width: '100%',
                            height: '100%',
                            maxWidth: 'none',
                            maxHeight: 'none',
                            margin: 0,
                            padding: 0,
                            objectFit: 'cover',
                            objectPosition: positionMap[position] || positionMap.center
                          }
                        })
                      : h('div', { className: 'gallery-preview-error' }, 'Image preview unavailable'))
                  : h('div', { className: 'gallery-preview-empty' }, 'Choose an image'),
                h('span', { className: 'gallery-preview-number' }, String(index + 1))
              );
            })
          ),
          h('p', { className: 'gallery-preview-note' }, 'This preview uses the same automatic tile sequence and cover-crop behavior as the live gallery. Add, remove or drag images in the editor and the mosaic updates automatically. The uploaded files themselves remain uncropped.')
        );
      }
    });
  }

  const ChoreographyGalleryPreview = makeGalleryPreview('choreography', 'Choreography', 'gallery-preview-dark');
  const TeachingGalleryPreview = makeGalleryPreview('teaching', 'Teaching', 'gallery-preview-paper');

  CMS.registerPreviewStyle('preview.css');
  CMS.registerPreviewTemplate('instagram', InstagramPreview);
  CMS.registerPreviewTemplate('choreography_gallery', ChoreographyGalleryPreview);
  CMS.registerPreviewTemplate('teaching_gallery', TeachingGalleryPreview);
})();
