(function () {
  "use strict";

  if (window.__moxieSiteSearchLoaded) return;
  window.__moxieSiteSearchLoaded = true;

  const CACHE_KEY = "moxie-site-search-v1";
  const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;
  let indexPromise;

  const style = document.createElement("style");
  style.textContent = `
    .moxie-search-button{position:fixed;right:18px;bottom:18px;z-index:9997;display:flex;align-items:center;gap:8px;padding:12px 17px;border:1px solid rgba(255,255,255,.3);border-radius:999px;background:linear-gradient(135deg,#36d1dc,#5b86e5);color:#07111f;font:800 15px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);cursor:pointer;transition:transform .15s ease,box-shadow .15s ease}
    .moxie-search-button:hover,.moxie-search-button:focus-visible{transform:translateY(-2px);box-shadow:0 14px 34px rgba(0,0,0,.45);outline:3px solid rgba(54,209,220,.32);outline-offset:3px}
    .moxie-search-button svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:2.4}
    .moxie-search-overlay{position:fixed;inset:0;z-index:9998;display:none;align-items:flex-start;justify-content:center;padding:clamp(28px,8vh,90px) 16px;background:rgba(3,8,18,.82);backdrop-filter:blur(8px)}
    .moxie-search-overlay.is-open{display:flex}
    .moxie-search-dialog{width:min(760px,100%);max-height:min(78vh,760px);display:flex;flex-direction:column;overflow:hidden;border:1px solid rgba(111,213,255,.32);border-radius:20px;background:#0d1728;color:#f5f9ff;box-shadow:0 25px 80px rgba(0,0,0,.55);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .moxie-search-head{display:flex;align-items:center;gap:10px;padding:15px;border-bottom:1px solid rgba(255,255,255,.12)}
    .moxie-search-input{min-width:0;flex:1;padding:13px 15px;border:1px solid rgba(255,255,255,.2);border-radius:12px;background:#08111f;color:#fff;font-size:17px;outline:none}
    .moxie-search-input:focus{border-color:#48d7df;box-shadow:0 0 0 3px rgba(72,215,223,.16)}
    .moxie-search-close{width:44px;height:44px;border:0;border-radius:11px;background:rgba(255,255,255,.09);color:#fff;font-size:26px;line-height:1;cursor:pointer}
    .moxie-search-status{min-height:26px;padding:10px 18px 4px;color:#aabbd1;font-size:13px}
    .moxie-search-results{overflow:auto;padding:7px 12px 17px}
    .moxie-search-result{display:block;margin:7px 0;padding:14px 15px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:rgba(255,255,255,.045);color:#f5f9ff;text-decoration:none;transition:background .15s ease,border-color .15s ease}
    .moxie-search-result:hover,.moxie-search-result:focus-visible{border-color:#48d7df;background:rgba(72,215,223,.09);outline:none}
    .moxie-search-result strong{display:block;margin-bottom:5px;color:#6fe1e7;font-size:16px}
    .moxie-search-result span{display:block;color:#c0cad8;font-size:13px;line-height:1.45}
    .moxie-search-empty{padding:34px 18px;text-align:center;color:#b9c5d4}
    @media(max-width:600px){.moxie-search-button{right:12px;bottom:12px;padding:12px}.moxie-search-button span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}.moxie-search-overlay{padding:14px}.moxie-search-dialog{max-height:calc(100vh - 28px);border-radius:16px}}
  `;
  document.head.appendChild(style);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "moxie-search-button";
  button.setAttribute("aria-label", "Search this website");
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg><span>Search site</span>';

  const overlay = document.createElement("div");
  overlay.className = "moxie-search-overlay";
  overlay.setAttribute("role", "presentation");
  overlay.innerHTML = `
    <section class="moxie-search-dialog" role="dialog" aria-modal="true" aria-label="Search Moxie's eXtreme TechGear">
      <div class="moxie-search-head">
        <input class="moxie-search-input" type="search" autocomplete="off" placeholder="Search laptops, chargers, Linux, e-bikes…" aria-label="Search this website">
        <button class="moxie-search-close" type="button" aria-label="Close search">&times;</button>
      </div>
      <div class="moxie-search-status">Search every guide on Moxie's eXtreme TechGear.</div>
      <div class="moxie-search-results" aria-live="polite"></div>
    </section>`;

  document.body.append(button, overlay);
  const input = overlay.querySelector(".moxie-search-input");
  const closeButton = overlay.querySelector(".moxie-search-close");
  const status = overlay.querySelector(".moxie-search-status");
  const results = overlay.querySelector(".moxie-search-results");
  let lastFocus;
  let timer;

  function normalize(value) {
    return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
  }

  async function buildIndex() {
    try {
      const saved = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (saved && Date.now() - saved.savedAt < CACHE_MAX_AGE && Array.isArray(saved.pages)) return saved.pages;
    } catch (_) {}

    const sitemapResponse = await fetch("/sitemap.xml", { cache: "no-store" });
    if (!sitemapResponse.ok) throw new Error("Sitemap unavailable");
    const sitemap = new DOMParser().parseFromString(await sitemapResponse.text(), "application/xml");
    const urls = [...new Set([...sitemap.querySelectorAll("loc")].map(node => node.textContent.trim()))]
      .filter(url => { try { return new URL(url, location.origin).origin === location.origin; } catch (_) { return false; } });

    const pages = (await Promise.all(urls.map(async url => {
      try {
        const response = await fetch(url);
        if (!response.ok || !(response.headers.get("content-type") || "").includes("text/html")) return null;
        const doc = new DOMParser().parseFromString(await response.text(), "text/html");
        doc.querySelectorAll("script,style,nav,footer,noscript,svg").forEach(node => node.remove());
        const title = (doc.querySelector("h1")?.textContent || doc.title || "Untitled guide").trim();
        const description = (doc.querySelector('meta[name="description"]')?.content || doc.querySelector("main p")?.textContent || "").trim();
        const headings = [...doc.querySelectorAll("h1,h2,h3")].map(node => node.textContent.trim()).join(" ");
        const text = normalize(`${title} ${description} ${headings} ${doc.body?.textContent || ""}`).slice(0, 45000);
        return { url: new URL(url, location.origin).href, title, description, text };
      } catch (_) { return null; }
    }))).filter(Boolean);

    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), pages })); } catch (_) {}
    return pages;
  }

  function getIndex() {
    if (!indexPromise) indexPromise = buildIndex();
    return indexPromise;
  }

  function excerpt(page, terms) {
    const fallback = page.description || "Open this guide to see the matching information.";
    if (!terms.length) return fallback.slice(0, 190);
    const source = page.description || page.text;
    const at = normalize(source).indexOf(terms[0]);
    if (at < 0 || source === page.text) return fallback.slice(0, 190);
    return source.slice(Math.max(0, at - 45), at + 145).trim();
  }

  async function search() {
    const query = normalize(input.value);
    const terms = [...new Set(query.split(" ").filter(term => term.length > 1))];
    if (!terms.length) {
      status.textContent = "Search every guide on Moxie's eXtreme TechGear.";
      results.innerHTML = "";
      return;
    }

    status.textContent = "Searching this website…";
    try {
      const pages = await getIndex();
      const ranked = pages.map(page => {
        const title = normalize(page.title);
        const description = normalize(page.description);
        if (!terms.every(term => page.text.includes(term))) return null;
        const score = terms.reduce((total, term) => total + (title.includes(term) ? 12 : 0) + (description.includes(term) ? 5 : 0) + (page.text.includes(term) ? 1 : 0), 0);
        return { page, score };
      }).filter(Boolean).sort((a, b) => b.score - a.score || a.page.title.localeCompare(b.page.title)).slice(0, 24);

      results.innerHTML = "";
      status.textContent = `${ranked.length} result${ranked.length === 1 ? "" : "s"} for “${input.value.trim()}”`;
      if (!ranked.length) {
        const empty = document.createElement("div");
        empty.className = "moxie-search-empty";
        empty.textContent = "No matching guide was found. Try a shorter or more general search.";
        results.appendChild(empty);
        return;
      }
      ranked.forEach(({ page }) => {
        const link = document.createElement("a");
        link.className = "moxie-search-result";
        link.href = page.url;
        const title = document.createElement("strong");
        title.textContent = page.title;
        const detail = document.createElement("span");
        detail.textContent = excerpt(page, terms);
        link.append(title, detail);
        results.appendChild(link);
      });
    } catch (_) {
      status.textContent = "Search could not load right now.";
      results.innerHTML = '<div class="moxie-search-empty">Please check your connection and try again.</div>';
      indexPromise = null;
    }
  }

  function openSearch() {
    lastFocus = document.activeElement;
    overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";
    input.focus();
  }

  function closeSearch() {
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  button.addEventListener("click", openSearch);
  closeButton.addEventListener("click", closeSearch);
  overlay.addEventListener("click", event => { if (event.target === overlay) closeSearch(); });
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(search, 180); });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && overlay.classList.contains("is-open")) closeSearch();
    if (event.key === "/" && !overlay.classList.contains("is-open") && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "")) {
      event.preventDefault();
      openSearch();
    }
  });
})();
