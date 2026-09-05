(() => {
  const scriptUrl = document.currentScript?.src || document.baseURI;
  const dataUrl = new URL('giveaway-data.json', scriptUrl);
  const allowedHost = host => host === 'giveawayoftheday.com' || host.endsWith('.giveawayoftheday.com');
  const safeUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' && allowedHost(url.hostname) ? url.href : null; } catch { return null; } };
  const updateCard = (card, item) => {
    const title = card.querySelector('[data-giveaway-title]');
    const description = card.querySelector('[data-giveaway-description]');
    const price = card.querySelector('[data-giveaway-price]');
    const link = card.querySelector('[data-giveaway-link]');
    const image = card.querySelector('[data-giveaway-image]');
    if (title && item.title) title.textContent = item.title;
    if (description && item.description) description.textContent = item.description;
    if (price) price.textContent = item.price || 'Regular price';
    const href = safeUrl(item.url) || safeUrl(item.categoryUrl);
    if (link && href) link.href = href;
    const imageUrl = safeUrl(item.image);
    if (image && imageUrl) { image.hidden = true; image.onload = () => { image.hidden = false; }; image.onerror = () => { image.hidden = true; }; image.alt = `${item.title || item.label || 'Daily'} giveaway preview`; image.src = imageUrl; if (image.complete && image.naturalWidth) image.hidden = false; }
  };
  fetch(dataUrl, { cache: 'no-store' }).then(response => { if (!response.ok) throw new Error('Giveaway feed unavailable'); return response.json(); }).then(data => {
    if (!Array.isArray(data.items)) return;
    for (const feed of document.querySelectorAll('[data-giveaway-feed]')) {
      for (const item of data.items) { const card = feed.querySelector(`[data-giveaway-category="${CSS.escape(item.category)}"]`); if (card) updateCard(card, item); }
      const updated = feed.querySelector('[data-giveaway-updated]');
      const date = new Date(data.updatedAt);
      if (updated && !Number.isNaN(date.valueOf())) updated.textContent = `Updated ${date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`;
    }
  }).catch(() => {});
})();
