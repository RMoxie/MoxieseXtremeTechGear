(() => {
  const scriptUrl = document.currentScript?.src || document.baseURI;
  const dataUrl = new URL('giveaway-data.json', scriptUrl);
  const allowedHost = host => host === 'giveawayoftheday.com' || host.endsWith('.giveawayoftheday.com');
  const safeUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' && allowedHost(url.hostname) ? url.href : null; } catch { return null; } };
  const updateCard = (card, item, isFresh) => {
    const title = card.querySelector('[data-giveaway-title]');
    const description = card.querySelector('[data-giveaway-description]');
    const price = card.querySelector('[data-giveaway-price]');
    const link = card.querySelector('[data-giveaway-link]');
    const image = card.querySelector('[data-giveaway-image]');
    const availability = card.querySelector('.giveaway-free');
    if (title && item.title) title.textContent = item.title;
    if (description && item.description) description.textContent = item.description;
    if (price) price.textContent = item.price || 'Regular price';
    const href = safeUrl(item.url) || safeUrl(item.categoryUrl);
    if (link && href) link.href = href;
    if (availability) availability.textContent = isFresh ? 'Free today' : 'Check availability';
    const imageUrl = safeUrl(item.image);
    if (image && imageUrl) { image.loading = 'eager'; image.hidden = true; image.onload = () => { image.hidden = false; }; image.onerror = () => { image.hidden = true; }; image.alt = `${item.title || item.label || 'Daily'} giveaway preview`; image.src = imageUrl; if (image.complete && image.naturalWidth) image.hidden = false; }
  };
  fetch(dataUrl, { cache: 'no-store' }).then(response => { if (!response.ok) throw new Error('Giveaway feed unavailable'); return response.json(); }).then(data => {
    if (!Array.isArray(data.items)) return;
    for (const feed of document.querySelectorAll('[data-giveaway-feed]')) {
      const date = new Date(data.updatedAt);
      const today = new Date();
      const isFresh = !Number.isNaN(date.valueOf()) && date.toDateString() === today.toDateString();
      for (const item of data.items) { const card = feed.querySelector(`[data-giveaway-category="${CSS.escape(item.category)}"]`); if (card) updateCard(card, item, isFresh); }
      const updated = feed.querySelector('[data-giveaway-updated]');
      if (updated && !Number.isNaN(date.valueOf())) updated.textContent = `Updated ${date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`;
    }
  }).catch(() => {});
})();
