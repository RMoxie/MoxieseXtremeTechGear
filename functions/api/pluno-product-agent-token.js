import { hasValidPostOrigin, isJsonPost, jsonResponse, sessionUser } from "../_shared/auth.js";

const PLUNO_ORIGIN = "https://moxiesextremetechgear.com";
const PLUNO_PUBLIC_KEY = "pa_pk_uxR1L4izcWd-icwoHULcUurdhGKc_ncJ";

export async function onRequestPost({ request, env }) {
  if (!hasValidPostOrigin(request, env)) return jsonResponse({ error: "Forbidden" }, 403);
  if (request.headers.get("Origin") !== PLUNO_ORIGIN) return jsonResponse({ error: "Not found" }, 404);
  if (!isJsonPost(request)) return jsonResponse({ error: "Expected JSON" }, 415);
  if (!env.DB || !env.PLUNO_PRODUCT_AGENT_SECRET_KEY) return jsonResponse({ error: "Product agent is unavailable" }, 503);

  try {
    const user = await sessionUser(request, env);
    if (!user) return jsonResponse({ error: "Authentication required" }, 401);

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    let sectionFromPage = "other";
    try {
      const referer = new URL(request.headers.get("Referer"));
      if (referer.origin === PLUNO_ORIGIN) {
        const page = referer.pathname.split("/").filter(Boolean)[0] || "home";
        sectionFromPage = page.replace(/\.html$/i, "");
      }
    } catch {
      sectionFromPage = "other";
    }
    const requestedSection = typeof body.site_section === "string" ? body.site_section.toLowerCase() : sectionFromPage.toLowerCase();
    const siteSection = /^[a-z0-9][a-z0-9-]{0,79}$/.test(requestedSection) ? requestedSection : "other";

    const upstream = await fetch("https://app.pluno.ai/api/product-agent/embed/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        public_key: PLUNO_PUBLIC_KEY,
        secret_key: env.PLUNO_PRODUCT_AGENT_SECRET_KEY,
        origin: PLUNO_ORIGIN,
        metadata: { user_id: user.id, email: user.email, site_section: siteSection },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) return jsonResponse({ error: "Product agent is unavailable" }, 502);

    const payload = await upstream.json();
    const token = payload.token || payload.access_token || payload.data?.token;
    if (typeof token !== "string" || !token) return jsonResponse({ error: "Product agent is unavailable" }, 502);
    return jsonResponse({ token, expires_at: payload.expires_at || payload.data?.expires_at || null });
  } catch {
    return jsonResponse({ error: "Product agent is unavailable" }, 502);
  }
}