import { appOrigin, hasValidPostOrigin, isJsonPost, jsonResponse, randomToken, sha256Hex } from "../../_shared/auth.js";

const GENERIC_MESSAGE = "If you can sign in with that email address, a link will arrive shortly.";
const RATE_WINDOW_SECONDS = 15 * 60;

async function hitRateLimit(db, key, now, maximum) {
  const resetBefore = now - RATE_WINDOW_SECONDS;
  const row = await db.prepare(`
    INSERT INTO auth_rate_limits (key_hash, window_start, request_count)
    VALUES (?, ?, 1)
    ON CONFLICT(key_hash) DO UPDATE SET
      window_start = CASE WHEN auth_rate_limits.window_start <= ? THEN excluded.window_start ELSE auth_rate_limits.window_start END,
      request_count = CASE WHEN auth_rate_limits.window_start <= ? THEN 1 ELSE auth_rate_limits.request_count + 1 END
    RETURNING request_count
  `).bind(key, now, resetBefore, resetBefore).first();
  return !row || row.request_count > maximum;
}

export async function onRequestPost({ request, env }) {
  if (!hasValidPostOrigin(request, env)) return jsonResponse({ error: "Forbidden" }, 403);
  if (!isJsonPost(request)) return jsonResponse({ error: "Expected JSON" }, 415);
  if (!env.DB || !env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) return jsonResponse({ error: "Authentication is temporarily unavailable" }, 503);

  let email = "";
  try {
    const body = await request.json();
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {
    return jsonResponse({ message: GENERIC_MESSAGE });
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const address = request.headers.get("CF-Connecting-IP") || "unknown";
    const ipHash = await sha256Hex(`ip:${address}`);
    const ipLimited = await hitRateLimit(env.DB, ipHash, now, 10);
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ message: GENERIC_MESSAGE });
    }

    const emailHash = await sha256Hex(`email:${email}`);
    const emailLimited = await hitRateLimit(env.DB, emailHash, now, 3);
    if (ipLimited || emailLimited) return jsonResponse({ message: GENERIC_MESSAGE });

    const user = await env.DB.prepare(
      "INSERT INTO users (id, email, created_at) VALUES (?, ?, ?) ON CONFLICT(email) DO UPDATE SET email = excluded.email RETURNING id"
    ).bind(crypto.randomUUID(), email, now).first();
    if (!user) throw new Error("Unable to create or load user");

    const token = randomToken();
    const tokenHash = await sha256Hex(token);
    const expiresAt = now + 15 * 60;
    await env.DB.prepare("DELETE FROM magic_link_tokens WHERE user_id = ?").bind(user.id).run();
    await env.DB.prepare(
      "INSERT INTO magic_link_tokens (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
    ).bind(tokenHash, user.id, expiresAt, now).run();

    const verifyUrl = new URL("/api/auth/verify", appOrigin(env));
    verifyUrl.searchParams.set("token", token);
    const escapedUrl = verifyUrl.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL,
        to: [email],
        subject: "Your Moxies eXtreme TechGear sign-in link",
        text: `Sign in to Moxies eXtreme TechGear: ${verifyUrl}`,
        html: `<p>Use this link to sign in to Moxies eXtreme TechGear:</p><p><a href="${escapedUrl}">Sign in</a></p><p>This link expires in 15 minutes and can only be used once.</p>`,
      }),
    });
    if (!response.ok) {
      await env.DB.prepare("DELETE FROM magic_link_tokens WHERE token_hash = ?").bind(tokenHash).run();
      throw new Error("Email delivery failed");
    }
    return jsonResponse({ message: GENERIC_MESSAGE });
  } catch {
    return jsonResponse({ error: "Authentication is temporarily unavailable" }, 503);
  }
}