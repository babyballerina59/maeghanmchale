(function () {
  const positionMap = {
    center: '50% 50%',
    top: '50% 0%',
    bottom: '50% 100%',
    left: '0% 50%',
    right: '100% 50%',
    'top-left': '0% 0%',
    'top-right': '100% 0%',
    'bottom-left': '0% 100%',
    'bottom-right': '100% 100%'
  };

  function assetUrl(getAsset, path) {
    if (!path) return '';
    const asset = getAsset(path);
    return asset && typeof asset.toString === 'function' ? asset.toString() : String(asset || path);
  }

  const InstagramPreview = createClass({
    render: function () {
      const posts = this.props.entry.getIn(['data', 'posts']);
      const items = posts && typeof posts.toArray === 'function' ? posts.toArray() : [];

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
                    src: assetUrl(this.props.getAsset, image),
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

  CMS.registerPreviewStyle('preview.css');
  CMS.registerPreviewTemplate('instagram', InstagramPreview);
})();
