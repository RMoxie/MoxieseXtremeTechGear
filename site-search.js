(function () {
  "use strict";

  function initialize() {
    (function () {
      "use strict";

      if (window.__moxieSiteSearchLoaded) return;
      window.__moxieSiteSearchLoaded = true;

      const CATEGORY_LABELS = {
        "/camping-outdoors-equipment.html": { title: "🏕️ Camping and outdoors Equipment" },
        "/": { title: "🏠 Home" },
        "/offers.html": { title: "🎁 Deals, Drops & Giveaways" },
        "/special-picks.html": { title: "⭐ Featured Gear Picks" },
        "/computers.html": { title: "💻 Computers & Mini PCs" },
        "/mobile-power.html": {
          title: "🔋 Portable Power & Battery Packs"
        },
        "/ai-hardware.html": {
          title: "🤖 AI Hardware & Smart Mini Rigs"
        },
        "/home-networking-security.html": {
          title: "📡 Networking & Wi-Fi Gear"
        },
        "/monitors-docks-desk-setup.html": {
          title: "🖥️ Desk Setups & Monitors"
        },
        "/gan-chargers-guide.html": {
          title: "⚡ Fast Chargers & Wall Power"
        },
        "/storage-gear/index.html": {
          title: "💾 Massive Storage Solutions"
        },
        "/scuba-diving/index.html": {
          title: "🤿 Scuba Gear, Classes & Dive Guides"
        },
        "/audio-gear.html": {
          title: "🎧 State-of-the-Art Audio Gear"
        },
        "/automotive-emergency.html": {
          title: "🔧 Auto, Road & Emergency Tech"
        },
        "/ebike-gear.html": {
          title: "🚴 E-Bikes, Tech & Riding Accessories"
        },
        "/cable-management.html": {
          title: "🔌 Cable Management Made Easy"
        },
        "/coding-gear/index.html": {
          title: "💻 Your Software Hub",
          subtitle: "Windows, macOS, Linux & More"
        },
        "/contact.html": {
          title: "📬 Contact Moxie Anytime",
          subtitle: "Support, Questions, Help & Tech Advice"
        }
      };

      const PAGE_CATEGORY_PATHS = {
        "/": "/",
        "/index.html": "/",
        "/airline-safe-power-bank-capacity-guide.html":
          "/mobile-power.html",
        "/best-power-banks-camping-field-charging.html":
          "/mobile-power.html",
        "/local-ai-gpu-vram-guide.html":
          "/ai-hardware.html",
        "/wifi-7-vs-wifi-6e-guide.html":
          "/home-networking-security.html",
        "/best-usb-c-docks-dual-monitors.html":
          "/monitors-docks-desk-setup.html",
        "/best-100w-usb-c-chargers-travel.html":
          "/gan-chargers-guide.html",
        "/gen4-vs-gen5-nvme-ssd-guide.html":
          "/storage-gear/index.html",
        "/best-electric-bikes.html":
          "/ebike-gear.html",
        "/best-locks-for-ebikes.html":
          "/ebike-gear.html"
      };

      function normalizePath(path) {
        const clean = String(path || "/").replace(/\/{2,}/g, "/");

        if (clean === "/index.html") return "/";

        return clean !== "/" && clean.endsWith("/")
          ? `${clean}index.html`
          : clean;
      }

      function categoryPathForPage(pathname) {
        const path = normalizePath(pathname);

        if (PAGE_CATEGORY_PATHS[path]) {
          return PAGE_CATEGORY_PATHS[path];
        }

        if (
          path.startsWith("/portable-computers/") ||
          path.startsWith("/desktop-systems/")
        ) {
          return "/computers.html";
        }

        if (path.startsWith("/storage-gear/")) {
          return "/storage-gear/index.html";
        }

        if (path.startsWith("/scuba-diving/")) {
          return "/scuba-diving/index.html";
        }

        if (path.startsWith("/audio-gear/")) {
          return "/audio-gear.html";
        }

        if (path.startsWith("/coding-gear/")) {
          return "/coding-gear/index.html";
        }

        return CATEGORY_LABELS[path] ? path : null;
      }

      /*
       * Accept only this website's URLs.
       * Treat www and non-www as the same website.
       * Preserve section anchors such as #gear.
       */
      function siteURL(value) {
        try {
          const url = new URL(value, location.href);
          const host = name =>
            name.toLowerCase().replace(/^www\./, "");

          if (
            !/^https?:$/.test(url.protocol) ||
            url.username ||
            url.password ||
            host(url.hostname) !== host(location.hostname) ||
            url.port !== location.port
          ) {
            return null;
          }

          return new URL(
            url.pathname + url.search + url.hash,
            location.origin
          );
        } catch (_) {
          return null;
        }
      }

      function renderLabel(element, label) {
        if (!element || !label) return;

        element.replaceChildren();
        element.classList.toggle(
          "moxie-nav-has-subtitle",
          Boolean(label.subtitle)
        );

        const title = document.createElement("span");
        title.className = "moxie-label-title";
        title.textContent = label.title;
        element.append(title);

        if (label.subtitle) {
          const subtitle = document.createElement("span");
          subtitle.className = "moxie-label-subtitle";
          subtitle.textContent = label.subtitle;
          element.append(subtitle);
        }
      }

      function enhanceHeader() {
        const headerTop =
          document.querySelector(".site-header-top");

        if (!headerTop) return;

        const campingPath = "/camping-outdoors-equipment.html";
        const primaryNav = document.querySelector(".site-primary-nav");
        if (primaryNav && !primaryNav.querySelector(`a[href="${campingPath}"]`)) {
          const campingLink = document.createElement("a");
          campingLink.href = campingPath;
          campingLink.textContent = "Camping and outdoors Equipment";
          (primaryNav.querySelector(".site-nav-more-menu") || primaryNav).append(campingLink);
        }

        const navLinks = [
          ...document.querySelectorAll(
            ".site-primary-nav a[href]"
          )
        ];

        navLinks.forEach(link => {
          const url = siteURL(link.getAttribute("href"));
          if (!url) return;

          const path = normalizePath(url.pathname);

          if (CATEGORY_LABELS[path]) {
            renderLabel(link, CATEGORY_LABELS[path]);
          }
        });

        const categoryPath =
          categoryPathForPage(location.pathname);

        if (categoryPath) {
          navLinks.forEach(link =>
            link.removeAttribute("aria-current")
          );

          document
            .querySelectorAll(".site-nav-more.is-current")
            .forEach(item =>
              item.classList.remove("is-current")
            );

          const activeLink = navLinks.find(link => {
            const url = siteURL(link.getAttribute("href"));

            return (
              url &&
              normalizePath(url.pathname) === categoryPath
            );
          });

          if (activeLink) {
            activeLink.setAttribute("aria-current", "page");
            activeLink
              .closest(".site-nav-more")
              ?.classList.add("is-current");
          }
        }

        const fallbackTitle = (
          document.querySelector("main h1")?.textContent ||
          document.title.split("|")[0] ||
          "Moxies eXtreme TechGear"
        ).trim();

        const pageLabel =
          CATEGORY_LABELS[categoryPath] ||
          { title: fallbackTitle };

        const heading = document.createElement("div");
        heading.className = "moxie-page-heading";
        heading.setAttribute("role", "heading");
        heading.setAttribute("aria-level", "1");
        heading.setAttribute(
          "aria-label",
          pageLabel.subtitle
            ? `${pageLabel.title}. ${pageLabel.subtitle}`
            : pageLabel.title
        );

        renderLabel(heading, pageLabel);

        const themeButton =
          headerTop.querySelector(".site-theme-toggle");
        const reference =
          themeButton ||
          headerTop.querySelector(".site-menu-toggle");

        headerTop.insertBefore(
          heading,
          reference?.parentElement === headerTop
            ? reference
            : null
        );
      }

      // Only ordinary page content is stored in this cache.
      // The keyword dictionary is loaded separately.
      const CACHE_KEY = "moxie-site-search-v3";
      const CACHE_MAX_AGE = 24 * 60 * 60 * 1000;
      let indexPromise;

      const backgroundCategoryPath =
        categoryPathForPage(location.pathname);

      if (
        backgroundCategoryPath &&
        !["/", "/offers.html", "/contact.html"].includes(
          backgroundCategoryPath
        )
      ) {
        document.documentElement.classList.add(
          "moxie-category-page"
        );
      }

      const style = document.createElement("style");
      style.textContent = `
        html,body{max-width:100%;overflow-x:clip}
        @supports not (overflow:clip){html,body{overflow-x:hidden}}

        .site-nav-more{position:relative;color:inherit}
        .site-nav-more>summary{display:inline-flex;align-items:center;min-height:44px;padding:.65rem .9rem;border-radius:10px;color:inherit;font:inherit;font-weight:750;cursor:pointer;list-style:none;white-space:nowrap}
        .site-nav-more>summary::-webkit-details-marker{display:none}
        .site-nav-more>summary::after{content:"▾";margin-left:.4rem;font-size:.75em;transition:transform .18s ease}
        .site-nav-more[open]>summary::after{transform:rotate(180deg)}
        .site-nav-more>summary:hover,.site-nav-more>summary:focus-visible,.site-nav-more.is-current>summary{background:rgba(255,255,255,.08);outline:none}
        .site-nav-more-menu{position:absolute;z-index:120;top:calc(100% + .45rem);right:0;width:min(520px,90vw);display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.25rem;padding:.65rem;border:1px solid var(--border-color,#334155);border-radius:14px;background:var(--card-bg,#111c2f);box-shadow:0 22px 55px rgba(0,0,0,.38)}
        .site-nav-more-menu a{display:flex;align-items:center;min-height:44px;padding:.7rem .8rem;border-radius:9px;text-align:left}
        @media(max-width:800px){.site-nav-more{width:100%}.site-nav-more>summary{width:100%;justify-content:space-between}.site-nav-more-menu{position:static;width:100%;margin-top:.35rem;grid-template-columns:1fr;box-sizing:border-box}.site-nav-more-menu a{width:100%;box-sizing:border-box}}

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

        .site-header-top{grid-template-columns:minmax(230px,1fr) minmax(280px,auto) minmax(230px,1fr)}
        .site-brand{grid-column:1;justify-self:start}
        .moxie-page-heading{grid-column:2;justify-self:center;align-self:center;max-width:min(44vw,720px);padding:.25rem .8rem;color:var(--text-main,#f8fafc);font:900 clamp(1.15rem,1.75vw,1.8rem)/1.12 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:-.02em;text-align:center;text-wrap:balance}
        .moxie-page-heading .moxie-label-title,.moxie-page-heading .moxie-label-subtitle{display:block}
        .moxie-page-heading .moxie-label-subtitle{margin-top:.18rem;color:var(--text-muted,#b7c3d4);font-size:clamp(.68rem,.8vw,.82rem);font-weight:700;letter-spacing:.01em}
        .site-primary-nav a .moxie-label-title,.site-primary-nav a .moxie-label-subtitle{display:block}
        .site-primary-nav a.moxie-nav-has-subtitle{flex-direction:column;align-items:flex-start;justify-content:center}
        .site-primary-nav a .moxie-label-subtitle{margin-top:.18rem;font-size:.72em;font-weight:650;line-height:1.2;opacity:.82}
        .moxie-header-controls{grid-column:3;justify-self:end}

        @media(max-width:1180px){
          .site-header-top{grid-template-columns:minmax(0,1fr) auto!important;gap:.55rem 1rem!important}
          .site-brand{grid-column:1!important;grid-row:1!important}
          .site-menu-toggle{grid-column:2!important;grid-row:1!important;justify-self:end!important}
          .moxie-page-heading{grid-column:1/-1!important;grid-row:2!important;max-width:100%;padding:.2rem .35rem;font-size:clamp(1.1rem,5vw,1.45rem)}
          .moxie-header-controls{grid-column:1/-1!important;grid-row:3!important;justify-self:center!important}
          .site-primary-nav a{text-align:left}
          .site-primary-nav a .moxie-label-subtitle{font-size:.76em}
        }

        .moxie-header-controls{display:flex;align-items:center;gap:.55rem}
        .moxie-header-controls .site-theme-toggle{grid-column:auto;justify-self:auto}
        .moxie-header-controls .moxie-search-button{position:static;right:auto;bottom:auto;z-index:auto;padding:10px 14px;box-shadow:0 6px 18px rgba(0,0,0,.24)}

        @media(max-width:600px){
          .moxie-search-button{right:12px;bottom:12px;padding:12px}
          .moxie-search-button span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
          .moxie-search-overlay{padding:14px}
          .moxie-search-dialog{max-height:calc(100vh - 28px);border-radius:16px}
        }
      `;
      document.head.appendChild(style);

      const glassParityStyle =
        document.createElement("style");
      glassParityStyle.id =
        "moxie-category-glass-parity-20260920";
      glassParityStyle.textContent = `
        html body,
        html[data-theme="dark"] body,
        html[data-theme="light"] body {
          background-color: transparent !important;
          background-image: none !important;
        }

        html body .hero,
        html body .guide-hero,
        html body .contact-hero {
          background: linear-gradient(rgba(15,23,42,.30),rgba(15,23,42,.42)) !important;
          backdrop-filter: blur(2px) saturate(108%) !important;
        }

        html[data-theme="light"] body .hero,
        html[data-theme="light"] body .guide-hero,
        html[data-theme="light"] body .contact-hero {
          background: linear-gradient(rgba(248,250,252,.32),rgba(248,250,252,.46)) !important;
        }

        html body :is(
          .computer-card,.computer-note,.buyer-note,.trust-note,
          .auto-card,.auto-checklist,.auto-tier,.bike-guide-callout,
          .dive-card,.guide-hero,.contact-hero
        ) {
          background-color: var(--moxie-panel-glass,rgba(17,28,48,.68)) !important;
          background-image: linear-gradient(
            145deg,
            var(--moxie-panel-glass-strong,rgba(17,28,48,.78)),
            var(--moxie-panel-glass,rgba(17,28,48,.68))
          ) !important;
          border-color: var(--moxie-panel-edge,rgba(148,163,184,.28)) !important;
          -webkit-backdrop-filter: blur(5px) saturate(112%);
          backdrop-filter: blur(5px) saturate(112%);
        }
      `;
      document.head.appendChild(glassParityStyle);

      const cosmicVisibilityStyle =
        document.createElement("style");
      cosmicVisibilityStyle.id =
        "moxie-background-visibility-20260920g";
      cosmicVisibilityStyle.textContent = `
        :root {
          --moxie-panel-glass: rgba(7, 17, 36, .48) !important;
          --moxie-panel-glass-strong: rgba(7, 17, 36, .60) !important;
          --moxie-panel-edge: rgba(186, 230, 253, .34) !important;
        }

        html[data-theme="light"] {
          --moxie-panel-glass: rgba(248, 250, 252, .58) !important;
          --moxie-panel-glass-strong: rgba(248, 250, 252, .70) !important;
          --moxie-panel-edge: rgba(71, 85, 105, .28) !important;
        }

        html body::before,
        html body::after {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: auto !important;
          bottom: auto !important;
          width: 100vw !important;
          height: 100vh !important;
        }

        html body::before {
          background-image: url("/moxie-cosmic-cliffs-background.webp") !important;
          background-position: center center !important;
          background-size: cover !important;
          filter: saturate(1.08) contrast(1.03);
        }

        html body::after {
          background: rgba(2, 6, 23, .16) !important;
        }

        html[data-theme="light"] body::after {
          background: rgba(248, 250, 252, .42) !important;
        }

        html body :is(.hero,.guide-hero,.contact-hero) {
          background: linear-gradient(rgba(7,17,36,.24),rgba(7,17,36,.32)) !important;
        }

        html[data-theme="light"] body :is(.hero,.guide-hero,.contact-hero) {
          background: linear-gradient(rgba(248,250,252,.30),rgba(248,250,252,.40)) !important;
        }

        html {
          background-color: #020617 !important;
          background-image: linear-gradient(rgba(2,6,23,.16),rgba(2,6,23,.16)), url("/moxie-cosmic-cliffs-background.webp") !important;
          background-position: center center !important;
          background-size: cover !important;
          background-repeat: no-repeat !important;
          background-attachment: fixed !important;
        }

        html[data-theme="light"] {
          background-color: #f8fafc !important;
          background-image: linear-gradient(rgba(248,250,252,.42),rgba(248,250,252,.42)), url("/moxie-cosmic-cliffs-background.webp") !important;
        }

        html body::before,
        html body::after {
          display: none !important;
        }

        html.moxie-category-page body main > section:not(.hero,.guide-hero,.contact-hero,.computer-hero,.auto-hero,.bike-hero,.linux-hero,.compare-hero,.portable-hero,.article-hero,.policy-hero,.dive-hero,.community-hero) {
          background-color: transparent !important;
          background-image: none !important;
          -webkit-backdrop-filter: none !important;
          backdrop-filter: none !important;
        }

        html.moxie-category-page body footer {
          background: linear-gradient(180deg,rgba(17,28,48,.58),rgba(7,17,36,.68)) !important;
          -webkit-backdrop-filter: none !important;
          backdrop-filter: none !important;
        }

        html[data-theme="light"].moxie-category-page body footer {
          background: linear-gradient(180deg,rgba(248,250,252,.66),rgba(241,245,249,.76)) !important;
        }
      `;
      document.head.appendChild(cosmicVisibilityStyle);

      try {
        enhanceHeader();
      } catch (error) {
        console.warn("Header enhancement skipped:", error);
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = "moxie-search-button";
      button.setAttribute(
        "aria-label",
        "Search this website"
      );
      button.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7"></circle>
          <path d="m20 20-4-4"></path>
        </svg>
        <span>Search site</span>
      `;

      const overlay = document.createElement("div");
      overlay.className = "moxie-search-overlay";
      overlay.setAttribute("role", "presentation");
      overlay.innerHTML = `
        <section
          class="moxie-search-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Search Moxie's eXtreme TechGear"
        >
          <div class="moxie-search-head">
            <input
              class="moxie-search-input"
              type="search"
              autocomplete="off"
              placeholder="Search laptops, chargers, Linux, e-bikes…"
              aria-label="Search this website"
            >
            <button
              class="moxie-search-close"
              type="button"
              aria-label="Close search"
            >&times;</button>
          </div>
          <div class="moxie-search-status">
            Search every guide on Moxie's eXtreme TechGear.
          </div>
          <div
            class="moxie-search-results"
            aria-live="polite"
          ></div>
        </section>
      `;

      const headerTop =
        document.querySelector(".site-header-top");
      const themeButton =
        headerTop?.querySelector(".site-theme-toggle");

      if (headerTop && themeButton) {
        const controls = document.createElement("div");
        controls.className = "moxie-header-controls";

        themeButton.before(controls);
        controls.append(themeButton, button);
        document.body.append(overlay);
      } else {
        document.body.append(button, overlay);
      }

      document
        .querySelectorAll(".site-nav-more")
        .forEach(details => {
          const summary = details.querySelector("summary");

          details.addEventListener("keydown", event => {
            if (event.key === "Escape" && details.open) {
              details.open = false;
              summary?.focus();
            }
          });
        });

      document.addEventListener("click", event => {
        document
          .querySelectorAll(".site-nav-more[open]")
          .forEach(details => {
            if (!details.contains(event.target)) {
              details.open = false;
            }
          });
      });

      const input =
        overlay.querySelector(".moxie-search-input");
      const closeButton =
        overlay.querySelector(".moxie-search-close");
      const status =
        overlay.querySelector(".moxie-search-status");
      const results =
        overlay.querySelector(".moxie-search-results");

      let lastFocus;
      let previousOverflow = "";
      let previousOverflowPriority = "";
      let timer;
      let searchRevision = 0;

      function normalize(value) {
        return String(value || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, " ")
          .replace(/\be\s*bikes?\b/g, "ebike")
          .replace(/\bbikes\b/g, "bike")
          .replace(/\s+/g, " ")
          .trim();
      }

      async function fetchText(url, expectedType) {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          15000
        );

        try {
          const response = await fetch(url, {
            signal: controller.signal,
            cache: "no-store",
            credentials: "same-origin"
          });

          if (
            !response.ok ||
            !siteURL(response.url || url)
          ) {
            throw new Error(
              "Website resource unavailable"
            );
          }

          if (
            expectedType &&
            !(response.headers.get("content-type") || "")
              .toLowerCase()
              .includes(expectedType)
          ) {
            throw new Error(
              "Unexpected response type"
            );
          }

          return await response.text();
        } finally {
          clearTimeout(timeout);
        }
      }

      function validCachedPage(page) {
        return (
          page &&
          typeof page.title === "string" &&
          typeof page.description === "string" &&
          typeof page.text === "string" &&
          typeof page.url === "string" &&
          Boolean(siteURL(page.url))
        );
      }

      async function buildIndex() {
        try {
          const saved = JSON.parse(
            localStorage.getItem(CACHE_KEY) || "null"
          );
          const age = saved
            ? Date.now() - saved.savedAt
            : NaN;

          if (
            saved &&
            saved.version === 2 &&
            Number.isFinite(age) &&
            age >= 0 &&
            age < CACHE_MAX_AGE &&
            Array.isArray(saved.pages) &&
            saved.pages.length &&
            saved.pages.every(validCachedPage)
          ) {
            return {
              pages: saved.pages.map(page => ({
                ...page,
                url: siteURL(page.url).href
              })),
              failedCount: 0
            };
          }
        } catch (_) {
          // Search can work without browser storage.
        }

        const sitemapText = await fetchText(
          new URL("/sitemap.xml", location.origin).href
        );

        const sitemap =
          new DOMParser().parseFromString(
            sitemapText,
            "application/xml"
          );

        if (
          sitemap.getElementsByTagName("parsererror")
            .length ||
          sitemap.documentElement.localName !== "urlset"
        ) {
          throw new Error(
            "A valid page sitemap is required"
          );
        }

        const urls = [
          ...new Set(
            [
              ...sitemap.getElementsByTagNameNS(
                "*",
                "loc"
              )
            ]
              .map(node =>
                siteURL(node.textContent.trim())
              )
              .filter(Boolean)
              .map(url => {
                url.pathname =
                  normalizePath(url.pathname);
                return url.href;
              })
          )
        ];

        if (!urls.length) {
          throw new Error(
            "No website pages found in sitemap"
          );
        }

        const pages = [];
        let nextIndex = 0;
        let failedCount = 0;

        async function worker() {
          while (nextIndex < urls.length) {
            const url = urls[nextIndex++];

            try {
              const html = await fetchText(
                url,
                "text/html"
              );

              const doc =
                new DOMParser().parseFromString(
                  html,
                  "text/html"
                );

              doc.querySelectorAll(
                "script,style,nav,footer,noscript,svg," +
                "header.site-header," +
                ".moxie-search-overlay," +
                ".moxie-search-button," +
                "[hidden],[aria-hidden='true']"
              ).forEach(node => node.remove());

              const title = (
                doc.querySelector("main h1, h1")
                  ?.textContent ||
                doc.title ||
                "Untitled guide"
              ).trim();

              const description = (
                doc.querySelector(
                  'meta[name="description"]'
                )?.content ||
                doc.querySelector("main p")
                  ?.textContent ||
                ""
              ).trim();

              const content =
                doc.querySelector("main") || doc.body;

              const headings = [
                ...content.querySelectorAll(
                  "h1,h2,h3"
                )
              ]
                .map(node => node.textContent.trim())
                .join(" ");

              const bodyText = (
                content.textContent || ""
              )
                .replace(/\s+/g, " ")
                .trim();

              const text = normalize(
                title + " " +
                description + " " +
                headings + " " +
                bodyText
              );

              if (!text) {
                throw new Error(
                  "Page has no searchable content"
                );
              }

              pages.push({
                url,
                title,
                description,
                text,
                preview: bodyText.slice(0, 190)
              });
            } catch (_) {
              failedCount++;
            }
          }
        }

        await Promise.all(
          Array.from(
            { length: Math.min(4, urls.length) },
            () => worker()
          )
        );

        if (!pages.length) {
          throw new Error(
            "No website pages could be indexed"
          );
        }

        if (!failedCount) {
          try {
            localStorage.setItem(
              CACHE_KEY,
              JSON.stringify({
                version: 2,
                savedAt: Date.now(),
                pages
              })
            );
          } catch (_) {
            // Storage limits must not break search.
          }
        }

        return { pages, failedCount };
      }

      /*
       * Load the editable dictionary separately from the
       * cached page-content index.
       *
       * A successful dictionary is reused during this page visit.
       * Refreshing the page loads it again with cache: "no-store".
       */
      let keywordPromise;

      function getKeywordIndex() {
        if (!keywordPromise) {
          const pending = fetchText(
            new URL(
              "/search-keywords.json",
              location.origin
            ).href
          ).then(text => {
            const entries = JSON.parse(text);

            if (!Array.isArray(entries)) {
              throw new Error(
                "Search dictionary must be an array"
              );
            }

            const pages = entries.map(entry => {
              if (
                !entry ||
                typeof entry.title !== "string" ||
                !entry.title.trim() ||
                typeof entry.url !== "string" ||
                typeof entry.description !== "string" ||
                !Array.isArray(entry.keywords) ||
                !entry.keywords.length ||
                !entry.keywords.every(
                  word => typeof word === "string"
                )
              ) {
                throw new Error(
                  "Invalid search dictionary entry"
                );
              }

              const url = siteURL(entry.url);

              if (!url) {
                throw new Error(
                  "Dictionary links must stay on this website"
                );
              }

              return {
                url: url.href,
                title: entry.title.trim(),
                description: entry.description.trim(),
                text: normalize(
                  [
                    entry.title,
                    entry.description,
                    ...entry.keywords
                  ].join(" ")
                ),
                preview: entry.description.trim()
              };
            });

            return {
              pages,
              unavailable: false
            };
          });

          keywordPromise = pending;

          pending.catch(() => {
            if (keywordPromise === pending) {
              keywordPromise = null;
            }
          });
        }

        return keywordPromise.catch(error => {
          console.warn(
            "Extra search keywords could not load:",
            error
          );

          // Keep ordinary website search working.
          return {
            pages: [],
            unavailable: true
          };
        });
      }

      function getIndex() {
        if (!indexPromise) {
          const pending = buildIndex();
          indexPromise = pending;

          pending.then(
            index => {
              if (
                index.failedCount &&
                indexPromise === pending
              ) {
                indexPromise = null;
              }
            },
            () => {
              if (indexPromise === pending) {
                indexPromise = null;
              }
            }
          );
        }

        return Promise.all([
          indexPromise,
          getKeywordIndex()
        ]).then(([index, keywordIndex]) => {
          const unique = new Map();

          [
            ...index.pages,
            ...keywordIndex.pages
          ].forEach(page => {
            unique.set(
              page.url + "\n" + page.title,
              page
            );
          });

          return {
            pages: [...unique.values()],
            failedCount: index.failedCount,
            dictionaryUnavailable:
              keywordIndex.unavailable
          };
        });
      }

      function excerpt(page) {
        return (
          page.description ||
          page.preview ||
          "Open this guide to see the matching information."
        )
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 190);
      }

      function showMessage(message) {
        const empty = document.createElement("div");
        empty.className = "moxie-search-empty";
        empty.textContent = message;
        results.replaceChildren(empty);
      }

      async function search(revision) {
        const rawQuery = input.value.trim();
        const terms = [
          ...new Set(
            normalize(rawQuery)
              .split(" ")
              .filter(Boolean)
          )
        ];

        results.replaceChildren();
        results.removeAttribute("aria-busy");

        if (!terms.length) {
          status.textContent =
            "Search every guide on Moxie's eXtreme TechGear.";
          return;
        }

        status.textContent = "Searching this website…";
        results.setAttribute("aria-busy", "true");

        try {
          const {
            pages,
            failedCount,
            dictionaryUnavailable
          } = await getIndex();

          if (revision !== searchRevision) return;

          const ranked = pages
            .map(page => {
              const title = normalize(page.title);
              const description =
                normalize(page.description);

              if (
                !terms.every(term =>
                  page.text.includes(term)
                )
              ) {
                return null;
              }

              const score = terms.reduce(
                (total, term) =>
                  total +
                  (title.includes(term) ? 12 : 0) +
                  (description.includes(term) ? 5 : 0) +
                  1,
                0
              );

              return { page, score };
            })
            .filter(Boolean)
            .sort(
              (a, b) =>
                b.score - a.score ||
                a.page.title.localeCompare(
                  b.page.title
                )
            );

          const shown = ranked.slice(0, 24);

          status.textContent =
            (
              ranked.length > shown.length
                ? "Showing " + shown.length +
                  " of " + ranked.length + " results"
                : ranked.length + " result" +
                  (ranked.length === 1 ? "" : "s")
            ) +
            " for “" + rawQuery + "”" +
            (
              failedCount
                ? " — some pages could not be searched; try again."
                : ""
            ) +
            (
              dictionaryUnavailable
                ? " — extra search keywords could not load."
                : ""
            );

          if (!shown.length) {
            showMessage(
              dictionaryUnavailable
                ? "No matching page was found. The extra keyword dictionary could not load; please try again."
                : failedCount
                  ? "No matches in the pages that loaded. Some pages were unavailable; try again."
                  : "No matching guide was found. Try a shorter or more general search."
            );
            return;
          }

          const fragment =
            document.createDocumentFragment();

          shown.forEach(({ page }) => {
            const link =
              document.createElement("a");
            link.className = "moxie-search-result";
            link.href = siteURL(page.url).href;

            const title =
              document.createElement("strong");
            title.textContent = page.title;

            const detail =
              document.createElement("span");
            detail.textContent = excerpt(page);

            link.append(title, detail);
            fragment.appendChild(link);
          });

          results.replaceChildren(fragment);
        } catch (error) {
          if (revision !== searchRevision) return;

          console.warn(
            "Website search could not load:",
            error
          );

          status.textContent =
            "Search could not load right now.";

          showMessage(
            "The website search index could not load. Please try again shortly."
          );
        } finally {
          if (revision === searchRevision) {
            results.removeAttribute("aria-busy");
          }
        }
      }

      function scheduleSearch() {
        clearTimeout(timer);
        const revision = ++searchRevision;

        timer = setTimeout(
          () => search(revision),
          180
        );
      }

      function openSearch() {
        if (
          overlay.classList.contains("is-open")
        ) {
          return;
        }

        lastFocus = document.activeElement;
        previousOverflow =
          document.body.style.getPropertyValue(
            "overflow"
          );
        previousOverflowPriority =
          document.body.style.getPropertyPriority(
            "overflow"
          );

        overlay.classList.add("is-open");
        overlay.setAttribute("aria-hidden", "false");
        button.setAttribute("aria-expanded", "true");
        document.body.style.setProperty(
          "overflow",
          "hidden"
        );

        input.focus();
        clearTimeout(timer);
        search(++searchRevision);
      }

      function closeSearch() {
        if (
          !overlay.classList.contains("is-open")
        ) {
          return;
        }

        clearTimeout(timer);
        searchRevision++;
        results.removeAttribute("aria-busy");

        overlay.classList.remove("is-open");
        overlay.setAttribute("aria-hidden", "true");
        button.setAttribute("aria-expanded", "false");

        if (previousOverflow) {
          document.body.style.setProperty(
            "overflow",
            previousOverflow,
            previousOverflowPriority
          );
        } else {
          document.body.style.removeProperty(
            "overflow"
          );
        }

        if (
          lastFocus?.isConnected &&
          typeof lastFocus.focus === "function"
        ) {
          lastFocus.focus();
        }
      }

      button.setAttribute("aria-haspopup", "dialog");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute(
        "aria-controls",
        "moxie-site-search-dialog"
      );
      overlay.setAttribute("aria-hidden", "true");
      overlay.querySelector(
        ".moxie-search-dialog"
      ).id = "moxie-site-search-dialog";

      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");

      button.addEventListener("click", openSearch);
      closeButton.addEventListener(
        "click",
        closeSearch
      );

      overlay.addEventListener("click", event => {
        if (event.target === overlay) {
          closeSearch();
        }
      });

      input.addEventListener("input", event => {
        if (!event.isComposing) {
          scheduleSearch();
        }
      });

      input.addEventListener(
        "compositionend",
        scheduleSearch
      );

      document.addEventListener("keydown", event => {
        const isOpen =
          overlay.classList.contains("is-open");

        if (isOpen && event.key === "Escape") {
          event.preventDefault();
          closeSearch();
          return;
        }

        if (isOpen && event.key === "Tab") {
          const focusable = [
            input,
            closeButton,
            ...results.querySelectorAll("a[href]")
          ];

          const first = focusable[0];
          const last =
            focusable[focusable.length - 1];
          const active = document.activeElement;

          if (
            event.shiftKey &&
            (
              active === first ||
              !overlay.contains(active)
            )
          ) {
            event.preventDefault();
            last.focus();
          } else if (
            !event.shiftKey &&
            (
              active === last ||
              !overlay.contains(active)
            )
          ) {
            event.preventDefault();
            first.focus();
          }
        }

        const active = document.activeElement;
        const isTyping =
          /INPUT|TEXTAREA|SELECT/.test(
            active?.tagName || ""
          ) ||
          active?.isContentEditable;

        if (
          event.key === "/" &&
          !isOpen &&
          !isTyping &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey &&
          !event.isComposing
        ) {
          event.preventDefault();
          openSearch();
        }
      });
    })();

    (function () {
      "use strict";

      if (window.__moxieMotionLoaded) return;
      window.__moxieMotionLoaded = true;

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const style = document.createElement("style");
      style.textContent = `
        .moxie-ambient-glow{display:none!important}
        .moxie-hero-motion{position:relative;isolation:isolate;overflow:hidden}
        .moxie-hero-motion>*:not(.moxie-hero-sheen){position:relative;z-index:1}
        .moxie-hero-sheen{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.76;background:linear-gradient(115deg,transparent 10%,rgba(42,193,218,.28) 36%,rgba(91,134,229,.34) 54%,transparent 76%);background-size:220% 100%;animation:moxie-hero-sweep 5.6s ease-in-out infinite}
        .moxie-hero-motion::after{content:"";position:absolute;z-index:0;width:42%;aspect-ratio:1;right:-9%;top:-30%;border-radius:50%;background:radial-gradient(circle,rgba(71,215,223,.62),rgba(91,134,229,.26) 45%,transparent 70%);filter:blur(10px);animation:moxie-hero-float 5s ease-in-out infinite alternate;pointer-events:none}
        .moxie-hero-motion h1{animation:moxie-title-glow 4.8s ease-in-out infinite alternate}
        .moxie-reveal-item{opacity:0;transform:translateY(34px) scale(.965);transition:opacity .82s cubic-bezier(.2,.75,.25,1),transform .82s cubic-bezier(.2,.75,.25,1);transition-delay:var(--moxie-delay,0ms)}
        .moxie-reveal-item.moxie-is-visible{opacity:1;transform:none}
        .moxie-motion-card{transition:transform .24s ease,border-color .24s ease,box-shadow .24s ease,background-color .24s ease}
        .moxie-motion-card:hover{transform:translateY(-9px);border-color:rgba(78,220,228,.58)!important;box-shadow:0 20px 44px rgba(0,0,0,.32),0 0 32px rgba(61,196,216,.18)}
        .moxie-search-button{animation:moxie-search-breathe 3.8s ease-in-out infinite}
        html.moxie-page-ready body{animation:moxie-page-enter .42s cubic-bezier(.2,.75,.25,1) both}
        .site-primary-nav{transition:opacity .24s ease,transform .24s ease}
        .site-primary-nav.is-open{animation:moxie-menu-open .24s cubic-bezier(.2,.75,.25,1) both}

        @keyframes moxie-page-enter{from{opacity:.01}to{opacity:1}}
        @keyframes moxie-menu-open{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
        @keyframes moxie-ambient-drift{0%{transform:translate3d(-2%,-1%,0) scale(1)}100%{transform:translate3d(3%,2%,0) scale(1.08)}}
        @keyframes moxie-hero-float{0%{transform:translate3d(0,-5px,0) scale(.95)}100%{transform:translate3d(-22px,20px,0) scale(1.08)}}
        @keyframes moxie-hero-sweep{0%,18%{background-position:130% 0}72%,100%{background-position:-80% 0}}
        @keyframes moxie-title-glow{0%{text-shadow:0 0 0 rgba(80,217,229,0)}100%{text-shadow:0 0 36px rgba(80,217,229,.42)}}
        @keyframes moxie-search-breathe{0%,72%,100%{box-shadow:0 10px 30px rgba(0,0,0,.35)}84%{box-shadow:0 12px 34px rgba(0,0,0,.42),0 0 0 12px rgba(54,209,220,.18)}}

        @media(prefers-reduced-motion:reduce){
          html.moxie-page-ready body,.site-primary-nav,.site-primary-nav.is-open{animation:none!important;transition:none!important}
          .moxie-ambient-glow,.moxie-hero-motion::after,.moxie-hero-sheen,.moxie-hero-motion h1,.moxie-search-button{animation:none!important}
          .moxie-reveal-item{opacity:1!important;transform:none!important;transition:none!important}
          .moxie-motion-card{transition:none!important}
          .moxie-motion-card:hover{transform:none}
        }
      `;
      document.head.appendChild(style);

      requestAnimationFrame(() => {
        document.documentElement.classList.add(
          "moxie-page-ready"
        );
      });

      const glow = document.createElement("div");
      glow.className = "moxie-ambient-glow";
      glow.setAttribute("aria-hidden", "true");
      document.body.prepend(glow);

      const main = document.querySelector("main");
      const hero = main?.querySelector(
        ":scope > section:first-child, " +
        ":scope > header:first-child, .hero"
      );

      if (hero) {
        hero.classList.add("moxie-hero-motion");

        const sheen = document.createElement("div");
        sheen.className = "moxie-hero-sheen";
        sheen.setAttribute("aria-hidden", "true");
        hero.appendChild(sheen);
      }

      const cardSelectors =
        "main article, main .card, main .guide-card, " +
        "main .feature-card, main .category-card, " +
        "main [class$='-card']";

      document
        .querySelectorAll(cardSelectors)
        .forEach(card =>
          card.classList.add("moxie-motion-card")
        );

      const candidates = [
        ...document.querySelectorAll(
          "main > section, main > article, " +
          "main .grid > *, main .cards > *, " +
          "main .guide-grid > *, main .category-grid > *"
        )
      ].filter(
        (element, index, all) =>
          !all.some(
            other =>
              other !== element &&
              other.contains(element)
          )
      );

      candidates.forEach((element, index) => {
        element.classList.add("moxie-reveal-item");
        element.style.setProperty(
          "--moxie-delay",
          `${Math.min(index % 5, 4) * 65}ms`
        );
      });

      if (
        reduceMotion ||
        !("IntersectionObserver" in window)
      ) {
        candidates.forEach(element =>
          element.classList.add("moxie-is-visible")
        );
        return;
      }

      let observer;

      try {
        observer = new IntersectionObserver(
          entries => {
            entries.forEach(entry => {
              if (!entry.isIntersecting) return;

              entry.target.classList.add(
                "moxie-is-visible"
              );
              observer.unobserve(entry.target);
            });
          },
          {
            rootMargin: "0px 0px -4%",
            threshold: 0
          }
        );

        candidates.forEach(element =>
          observer.observe(element)
        );

        requestAnimationFrame(() => {
          candidates.forEach(element => {
            const rect =
              element.getBoundingClientRect();

            if (
              rect.top < window.innerHeight * .96 &&
              rect.bottom > 0
            ) {
              element.classList.add(
                "moxie-is-visible"
              );
              observer.unobserve(element);
            }
          });
        });
      } catch (_) {
        observer?.disconnect();

        candidates.forEach(element =>
          element.classList.add("moxie-is-visible")
        );
      }
    })();

    (() => {
      if (window.__moxieSiteBackgroundLoaded) return;
      window.__moxieSiteBackgroundLoaded = true;

      const style = document.createElement("style");
      style.id = "moxie-site-background-v1";
      style.textContent = `
        html{background:#07111f}

        body{
          background-color:#07111f!important;
          background-image:linear-gradient(rgba(2,8,23,.66),rgba(2,8,23,.66)),url('/moxie-cosmic-cliffs-background.webp')!important;
          background-size:cover!important;
          background-position:center!important;
          background-repeat:no-repeat!important;
          background-attachment:fixed!important;
          min-height:100vh;
        }

        .hero{
          background:linear-gradient(rgba(15,23,42,.72),rgba(15,23,42,.82))!important;
          backdrop-filter:blur(1px);
        }

        [data-theme="light"] body{
          background-color:#f8fafc!important;
          background-image:linear-gradient(rgba(248,250,252,.84),rgba(248,250,252,.84)),url('/moxie-cosmic-cliffs-background.webp')!important;
        }

        [data-theme="light"] .hero{
          background:linear-gradient(rgba(248,250,252,.78),rgba(248,250,252,.88))!important;
        }

        .site-background-credit{
          margin:.7rem auto 0;
          max-width:900px;
          font-size:.78rem;
          line-height:1.5;
          color:var(--text-muted,#94a3b8)
        }

        .site-background-credit a{
          color:var(--accent,#38bdf8)
        }

        @media(max-width:780px){
          body{background-attachment:scroll!important}
        }
      `;
      document.head.appendChild(style);

      const footer = document.querySelector("footer");

      if (
        !footer ||
        footer.querySelector(".site-background-credit")
      ) {
        return;
      }

      const credit = document.createElement("p");
      credit.className = "site-background-credit";
      credit.textContent =
        "Background image: “Cosmic Cliffs” in the Carina Nebula. " +
        "Credit: NASA, ESA, CSA, STScI.";

      footer.appendChild(credit);
    })();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }
})();
