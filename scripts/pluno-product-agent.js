(function () {
  "use strict";

  const ENABLED_ORIGIN = "https://moxiesextremetechgear.com";
  const WIDGET_MODULE_URL = "https://app.pluno.ai/api/product-agent/embed/widget.js";

  if (window.location.origin !== ENABLED_ORIGIN) return;

  function siteSection() {
    const segment = window.location.pathname.split("/").filter(Boolean)[0] || "home";
    return segment.replace(/\.html$/i, "").toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 80) || "other";
  }

  async function mount() {
    try {
      const { mountPlunoProductAgentWidget } = await import(WIDGET_MODULE_URL);
      if (typeof mountPlunoProductAgentWidget !== "function") return;
      await mountPlunoProductAgentWidget({
        tokenEndpoint: "/api/pluno-product-agent-token",
        publicKey: "pa_pk_uxR1L4izcWd-icwoHULcUurdhGKc_ncJ",
        metadata: { site_section: siteSection() },
      });
    } catch {
      // Keep the editorial pages usable when the optional product agent is unavailable.
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
  else mount();
})();