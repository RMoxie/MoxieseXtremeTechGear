import { appOrigin, jsonResponse, randomToken, sessionCookie, sha256Hex } from "../../_shared/auth.js";

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

export async function onRequestGet({ request, env }) {
  let origin;
  try {
    origin = appOrigin(env);
  } catch {
    return jsonResponse({ error: "Authentication is temporarily unavailable" }, 503);
  }

  const token = new URL(request.url).searchParams.get("token") || "";
  const destination = new URL("/", origin);
  if (!env.DB || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) {
    destination.searchParams.set("signin", "invalid");
    return Response.redirect(destination.toString(), 302);
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const tokenHash = await sha256Hex(token);
    const verified = await env.DB.prepare(
      "UPDATE magic_link_tokens SET used_at = ? WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? RETURNING user_id"
    ).bind(now, tokenHash, now).first();
    if (!verified) {
      destination.searchParams.set("signin", "invalid");
      return Response.redirect(destination.toString(), 302);
    }

    const sessionId = randomToken();
    const sessionHash = await sha256Hex(sessionId);
    await env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND expires_at <= ?").bind(verified.user_id, now).run();
    await env.DB.prepare(
      "INSERT INTO sessions (session_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
    ).bind(sessionHash, verified.user_id, now + SESSION_TTL_SECONDS, now).run();

    return new Response(null, {
      status: 302,
      headers: {
        Location: destination.toString(),
        "Cache-Control": "no-store",
        "Set-Cookie": sessionCookie(sessionId, SESSION_TTL_SECONDS),
      },
    });
  } catch {
    destination.searchParams.set("signin", "error");
    return Response.redirect(destination.toString(), 302);
  }
}