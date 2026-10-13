#!/usr/bin/env node
// Builds the password-protected /theme-tracker page (unlisted).
//
//   node scripts/build-theme-tracker.js
//
// Source (readable, NEVER committed — private/ is gitignored):
//   private/theme-tracker/tracker.html   the full page (built by the pipeline outside this repo)
//   private/theme-tracker/password       the password (one line)
//   private/theme-tracker/version.json   {version, label} — published as-is so offline copies can spot updates
// Output (committed + deployed): site/theme-tracker/index.html + site/theme-tracker/version.json
//
// Same scheme as /screening: gzip, then AES-256-GCM with a PBKDF2-SHA256 (600k) key from the password.
// The published page holds only ciphertext + a password form; nothing readable without the password.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");

const ROOT = path.join(__dirname, "..");
const PRIV = path.join(ROOT, "private", "theme-tracker");
const OUTDIR = path.join(ROOT, "site", "theme-tracker");
const ITER = 600000;

const pw = fs.readFileSync(path.join(PRIV, "password"), "utf8").trim();
if (!pw) throw new Error("private/theme-tracker/password is empty");
const html = fs.readFileSync(path.join(PRIV, "tracker.html"));
const ver = JSON.parse(fs.readFileSync(path.join(PRIV, "version.json"), "utf8"));

const gz = zlib.gzipSync(html, { level: 9 });
const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const key = crypto.pbkdf2Sync(pw, salt, ITER, 32, "sha256");
const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
const ct = Buffer.concat([cipher.update(gz), cipher.final(), cipher.getAuthTag()]);
const b64 = b => b.toString("base64");

const shell = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <title>Private — Pranay Nichani</title>
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
  <style>
    :root { --bg:#101010; --text:#f2f0e9; --dim:#a5a29a; --line:#3d3d3d; --accent:#d9a441; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
      min-height: 100vh; display: grid; place-items: center; padding: 24px; -webkit-font-smoothing: antialiased; }
    form { width: 100%; max-width: 380px; text-align: center; }
    svg { width: 14px; height: 28px; margin-bottom: 22px; }
    .eyebrow { font-size: 12px; letter-spacing: 3px; color: var(--accent); font-weight: 600; margin-bottom: 10px; }
    h1 { font-family: Georgia, serif; font-weight: 400; font-size: 32px; margin-bottom: 8px; }
    p { color: var(--dim); font-size: 15px; margin-bottom: 26px; }
    label { position: absolute; left: -9999px; }
    input { width: 100%; font: 16px -apple-system, sans-serif; color: var(--text); background: #1e1e1e;
      border: 1px solid var(--line); border-radius: 6px; padding: 13px 14px; margin-bottom: 12px; }
    input:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
    button { width: 100%; font: 600 15px -apple-system, sans-serif; letter-spacing: .5px; color: #101010;
      background: var(--accent); border: 0; border-radius: 6px; padding: 13px; cursor: pointer; }
    button[disabled] { opacity: .6; cursor: wait; }
    .err { color: var(--text); font-size: 14px; margin: 14px 0 0; min-height: 20px; }
  </style>
</head>
<body>
  <form id="gate" autocomplete="off">
    <svg viewBox="0 0 14 28" aria-hidden="true"><polygon points="1,0 13,0 7,10" fill="#e05a4e"/><rect x="5.75" y="9" width="2.5" height="19" fill="#e05a4e"/></svg>
    <p class="eyebrow">PRANAY NICHANI</p>
    <h1>Private page</h1>
    <p>Enter the password you were given.</p>
    <label for="pw">Password</label>
    <input id="pw" type="password" placeholder="Password" required autofocus>
    <button id="go" type="submit">Open</button>
    <p class="err" id="err" role="alert"></p>
  </form>
<script>
(() => {
  const D = { salt: "${b64(salt)}", iv: "${b64(iv)}", iter: ${ITER}, ct: "${b64(ct)}" };
  const bytes = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const KEY = "theme-tracker-pw";
  async function open(pw) {
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: bytes(D.salt), iterations: D.iter, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    const gz = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(D.iv) }, key, bytes(D.ct));
    const stream = new Blob([gz]).stream().pipeThrough(new DecompressionStream("gzip"));
    return await new Response(stream).text();
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
      btn.disabled = false; btn.textContent = "Open"; input.select();
    }
  });
  let saved = null; try { saved = localStorage.getItem(KEY); } catch (_) {}
  if (saved) { btn.disabled = true; btn.textContent = "Opening…";
    open(saved).then(show).catch(() => { try { localStorage.removeItem(KEY); } catch (_) {} btn.disabled = false; btn.textContent = "Open"; }); }
})();
</script>
</body>
</html>
`;

fs.mkdirSync(OUTDIR, { recursive: true });
fs.writeFileSync(path.join(OUTDIR, "index.html"), shell);
fs.writeFileSync(path.join(OUTDIR, "version.json"), JSON.stringify({ version: ver.version, label: ver.label }) + "\n");
console.log(`Wrote site/theme-tracker/index.html (${(shell.length / 1024).toFixed(0)} KB, encrypted) + version.json (${ver.version})`);
