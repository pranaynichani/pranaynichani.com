#!/usr/bin/env node
// Builds the password-protected /screening page.
//
//   node scripts/build-screening.js
//
// Source (readable, NEVER committed — private/ is gitignored):
//   private/screening.src.html   the page itself
//   private/screening.pw         the password (one line)
//   private/lrd_60.jpg           inlined as the Lost in the Right Direction still
// Output (committed + deployed): site/screening.html
//
// The whole page is encrypted with AES-256-GCM using a key derived from the
// password (PBKDF2-SHA256, 600k iterations). The published file contains only
// ciphertext plus a small password form that decrypts it in the browser with
// WebCrypto — without the password there is nothing readable in it, not even
// the video links. Re-run after editing the source or changing the password.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const PRIV = path.join(ROOT, "private");
const OUT = path.join(ROOT, "site", "screening.html");
const ITER = 600000;

const pw = fs.readFileSync(path.join(PRIV, "screening.pw"), "utf8").trim();
if (!pw) throw new Error("private/screening.pw is empty");

let html = fs.readFileSync(path.join(PRIV, "screening.src.html"), "utf8");
const still = fs.readFileSync(path.join(PRIV, "lrd_60.jpg")).toString("base64");
html = html.replace("__LRD_STILL__", "data:image/jpeg;base64," + still);

const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const key = crypto.pbkdf2Sync(pw, salt, ITER, 32, "sha256");
const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
const ct = Buffer.concat([cipher.update(html, "utf8"), cipher.final(), cipher.getAuthTag()]);
const b64 = b => b.toString("base64");

const shell = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <title>Screening Room — Pranay Nichani</title>
  <link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,340..500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root { --bg:#101010; --text:#f2f0e9; --dim:#a5a29a; --line:#3d3d3d; --accent:#d9a441; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); font-family: Inter, -apple-system, sans-serif;
      min-height: 100vh; display: grid; place-items: center; padding: 24px; -webkit-font-smoothing: antialiased; }
    form { width: 100%; max-width: 380px; text-align: center; }
    svg { width: 14px; height: 28px; margin-bottom: 22px; }
    .eyebrow { font-size: 12px; letter-spacing: 3px; color: var(--accent); font-weight: 600; margin-bottom: 10px; }
    h1 { font-family: Fraunces, Georgia, serif; font-weight: 400; font-size: 34px; margin-bottom: 8px; }
    p { color: var(--dim); font-size: 15px; margin-bottom: 26px; }
    label { position: absolute; left: -9999px; }
    input { width: 100%; font: 16px Inter, sans-serif; color: var(--text); background: #1e1e1e;
      border: 1px solid var(--line); border-radius: 6px; padding: 13px 14px; margin-bottom: 12px; }
    input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
    button { width: 100%; font: 600 15px Inter, sans-serif; letter-spacing: .5px; color: #101010;
      background: var(--accent); border: 0; border-radius: 6px; padding: 13px; cursor: pointer; }
    button[disabled] { opacity: .6; cursor: wait; }
    .err { color: var(--text); font-size: 14px; margin: 14px 0 0; min-height: 20px; }
  </style>
</head>
<body>
  <form id="gate" autocomplete="off">
    <svg viewBox="0 0 14 28" aria-hidden="true"><polygon points="1,0 13,0 7,10" fill="#e05a4e"/><rect x="5.75" y="9" width="2.5" height="19" fill="#e05a4e"/></svg>
    <p class="eyebrow">PRANAY NICHANI</p>
    <h1>Screening Room</h1>
    <p>This page is private. Enter the password you were given.</p>
    <label for="pw">Password</label>
    <input id="pw" type="password" placeholder="Password" required autofocus>
    <button id="go" type="submit">Enter</button>
    <p class="err" id="err" role="alert"></p>
  </form>
<script>
(() => {
  const D = { salt: "${b64(salt)}", iv: "${b64(iv)}", iter: ${ITER}, ct: "${b64(ct)}" };
  const bytes = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const KEY = "screening-pw";
  async function open(pw) {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: bytes(D.salt), iterations: D.iter, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(D.iv) }, key, bytes(D.ct));
    return new TextDecoder().decode(plain);
  }
  function show(html) { document.open(); document.write(html); document.close(); }
  const form = document.getElementById("gate"), input = document.getElementById("pw"),
        btn = document.getElementById("go"), err = document.getElementById("err");
  form.addEventListener("submit", async e => {
    e.preventDefault(); err.textContent = ""; btn.disabled = true; btn.textContent = "Opening…";
    try {
      const html = await open(input.value.trim());
      try { localStorage.setItem(KEY, input.value.trim()); } catch (_) {}
      show(html);
    } catch (_) {
      err.textContent = "That password didn't work — please check it and try again.";
      btn.disabled = false; btn.textContent = "Enter"; input.select();
    }
  });
  let saved = null; try { saved = localStorage.getItem(KEY); } catch (_) {}
  if (saved) open(saved).then(show).catch(() => { try { localStorage.removeItem(KEY); } catch (_) {} });
})();
</script>
</body>
</html>
`;

fs.writeFileSync(OUT, shell);
console.log(`Wrote ${path.relative(ROOT, OUT)} (${(shell.length / 1024).toFixed(0)} KB, encrypted)`);
