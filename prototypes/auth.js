/* A360 Demo — simple password gate
   Static-site friendly. Stores auth in localStorage with a 7-day expiry.
   Not cryptographically secure — meant to keep casual viewers / search engines out.
   Usage: <script src="auth.js"></script> on every page (load it FIRST, before other scripts).
*/
(function () {
  'use strict';

  // SHA-256 of the password
  // Password: A360
  const PASSWORD_HASH = '2dbf903b41a396b7d71c4035397b186049ae2478cd7c367396f9afa33176fddc';
  const STORAGE_KEY = 'a360_demo_auth';
  const EXPIRY_DAYS = 7;

  // ─── Hash utility ──────────────────────────────────────────────────────────
  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ─── Auth state ────────────────────────────────────────────────────────────
  function isAuthed() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const { hash, expires } = JSON.parse(raw);
      if (Date.now() > expires) {
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }
      return hash === PASSWORD_HASH;
    } catch (e) {
      return false;
    }
  }

  function persistAuth() {
    const expires = Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ hash: PASSWORD_HASH, expires }));
  }

  // ─── Gate UI ───────────────────────────────────────────────────────────────
  function injectStyles() {
    const css = `
      .a360-gate-overlay{
        position:fixed;inset:0;z-index:99999;
        background:linear-gradient(135deg,#0f172a 0%,#1b4f6b 60%,#143f57 100%);
        display:flex;align-items:center;justify-content:center;padding:20px;
        font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;
      }
      .a360-gate-overlay.hide{opacity:0;pointer-events:none;transition:opacity .25s ease}
      .a360-gate-card{
        background:#fff;border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,.4);
        padding:36px 40px;max-width:380px;width:100%;
      }
      .a360-gate-logo{font-weight:800;font-size:18px;color:#1a1f2e;letter-spacing:-.02em;margin-bottom:4px}
      .a360-gate-logo span{color:#9ca3af}
      .a360-gate-title{font-size:14px;font-weight:600;color:#374151;margin-bottom:24px;letter-spacing:-.01em}
      .a360-gate-form{display:flex;flex-direction:column;gap:10px}
      .a360-gate-input{
        font-family:'JetBrains Mono',monospace;font-size:14px;
        padding:12px 14px;border:1.5px solid #e5e7eb;border-radius:8px;
        background:#f9fafb;color:#1a1f2e;outline:none;
        transition:border-color .12s,background .12s;
      }
      .a360-gate-input:focus{border-color:#1b4f6b;background:#fff}
      .a360-gate-input.err{border-color:#dc2626;background:#fef2f2}
      .a360-gate-btn{
        font-family:'Inter',sans-serif;font-size:13px;font-weight:700;letter-spacing:.02em;
        padding:11px 18px;border:none;border-radius:8px;
        background:#1b4f6b;color:#fff;cursor:pointer;
        transition:background .12s;
      }
      .a360-gate-btn:hover{background:#143f57}
      .a360-gate-btn:disabled{background:#9ca3af;cursor:not-allowed}
      .a360-gate-msg{font-size:11px;color:#6b7280;margin-top:14px;line-height:1.5}
      .a360-gate-err{font-size:11px;color:#dc2626;font-weight:600;margin-top:6px;min-height:14px}
      body.a360-gate-active{overflow:hidden}
    `;
    const s = document.createElement('style');
    s.id = 'a360-gate-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function buildGate() {
    const overlay = document.createElement('div');
    overlay.className = 'a360-gate-overlay';
    overlay.innerHTML = `
      <div class="a360-gate-card" role="dialog" aria-modal="true" aria-labelledby="a360-gate-title">
        <div class="a360-gate-logo">AESTHETICS<span>360</span></div>
        <div class="a360-gate-title" id="a360-gate-title">Demo prototype · password protected</div>
        <form class="a360-gate-form" id="a360-gate-form" autocomplete="off">
          <input
            type="password"
            class="a360-gate-input"
            id="a360-gate-input"
            placeholder="Password"
            autocomplete="off"
            autofocus
            required
          />
          <div class="a360-gate-err" id="a360-gate-err">&nbsp;</div>
          <button type="submit" class="a360-gate-btn" id="a360-gate-btn">Enter</button>
        </form>
        <div class="a360-gate-msg">If you don't have the password, contact ccabell@aesthetics360.com.</div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.body.classList.add('a360-gate-active');

    const form = overlay.querySelector('#a360-gate-form');
    const input = overlay.querySelector('#a360-gate-input');
    const errEl = overlay.querySelector('#a360-gate-err');
    const btn = overlay.querySelector('#a360-gate-btn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      btn.disabled = true;
      errEl.textContent = '';
      input.classList.remove('err');
      try {
        const candidate = await sha256(input.value);
        if (candidate === PASSWORD_HASH) {
          persistAuth();
          overlay.classList.add('hide');
          document.body.classList.remove('a360-gate-active');
          setTimeout(() => overlay.remove(), 300);
        } else {
          errEl.textContent = 'Incorrect password';
          input.classList.add('err');
          input.value = '';
          input.focus();
          btn.disabled = false;
        }
      } catch (e2) {
        errEl.textContent = 'Auth error — try refreshing';
        btn.disabled = false;
      }
    });
  }

  // ─── Boot ──────────────────────────────────────────────────────────────────
  function boot() {
    if (isAuthed()) return;
    injectStyles();
    if (document.body) {
      buildGate();
    } else {
      document.addEventListener('DOMContentLoaded', buildGate);
    }
  }

  // Run as soon as possible — BEFORE other scripts try to render anything
  if (document.readyState === 'loading') {
    // Run synchronously by injecting styles + checking auth now;
    // build the gate when DOM is ready.
    if (!isAuthed()) injectStyles();
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Public API for testing/dev
  window.A360 = window.A360 || {};
  window.A360.auth = {
    isAuthed,
    logout: () => { localStorage.removeItem(STORAGE_KEY); location.reload(); },
  };
})();
