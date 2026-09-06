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

  function directAssetUrl(getAsset, path) {
    if (!path) return '';
    const asset = getAsset(path);
    return asset && typeof asset.toString === 'function' ? asset.toString() : String(asset || path);
  }

  function immutableListToArray(list) {
    return list && typeof list.toArray === 'function' ? list.toArray() : [];
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
              return h('div', { className: `gallery-preview-item ${tileClass}`, key: index },
                image
                  ? h('img', {
                      src: directAssetUrl(this.props.getAsset, image),
                      alt: alt,
                      style: { objectPosition: positionMap[position] || positionMap.center }
                    })
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
