(function () {
  "use strict";

  const MESSAGE = "If you can sign in with that email address, a link will arrive shortly.";

  async function requestMagicLink(email) {
    const response = await fetch("/api/auth/magic-link", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to request a sign-in link.");
    return result.message || MESSAGE;
  }

  async function getSession() {
    const response = await fetch("/api/auth/session", { credentials: "same-origin" });
    if (!response.ok) throw new Error("Unable to check your sign-in status.");
    return (await response.json()).user;
  }

  async function signOut() {
    const response = await fetch("/api/auth/sign-out", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (!response.ok) throw new Error("Unable to sign out.");
  }

  function bindForms() {
    document.querySelectorAll("form[data-moxie-signin]").forEach(form => {
      if (form.dataset.moxieSigninBound) return;
      form.dataset.moxieSigninBound = "true";
      form.addEventListener("submit", async event => {
        event.preventDefault();
        const email = form.elements.email?.value || "";
        const status = form.querySelector("[data-moxie-auth-status]");
        const submit = form.querySelector('[type="submit"]');
        if (submit) submit.disabled = true;
        if (status) status.textContent = "Sending...";
        try {
          const message = await requestMagicLink(email);
          if (status) status.textContent = message;
        } catch (error) {
          if (status) status.textContent = error.message;
        } finally {
          if (submit) submit.disabled = false;
        }
      });
    });

    document.querySelectorAll("[data-moxie-signout]").forEach(button => {
      if (button.dataset.moxieSignoutBound) return;
      button.dataset.moxieSignoutBound = "true";
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await signOut();
          window.location.reload();
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  window.MoxieSignIn = Object.freeze({ requestMagicLink, getSession, signOut });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindForms, { once: true });
  else bindForms();
})();