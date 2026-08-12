#!/usr/bin/env node
// Static page generator for pranaynichani.com — bakes SEO-readable HTML for
// every project (site/project/<slug>.html), the block-based blog post(s)
// (site/blog/<slug>.html), and site/sitemap.xml, all from site/js/data.js +
// site/content/blog.json.
//
// Run after ANY edit to data.js or blog.json:   node scripts/generate-static.js
// The generated <main> content is a crawler-readable replica of what
// js/main.js renders; on load main.js re-renders the same content with the
// interactive bits (trailer player, clip bin, timeline strip) wired up.
// Canonical URLs are EXTENSIONLESS (GitHub Pages serves /project/foo for
// project/foo.html); on-disk links keep .html so localhost:8090 still works.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "site");
const ORIGIN = "https://pranaynichani.com";
const TODAY = new Date().toISOString().slice(0, 10);

// ---- load data.js (plain consts, no module system) ----
const dataSrc = fs.readFileSync(path.join(ROOT, "js", "data.js"), "utf8");
const { PROJECTS, TYPE_LABELS } = new Function(
  dataSrc + "; return { PROJECTS, TYPE_LABELS };"
)();
const blog = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "blog.json"), "utf8"));

// ---- helpers mirrored from js/main.js ----
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ytId = url => { const m = String(url || "").match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{6,})/); return m ? m[1] : null; };
const ytThumb = url => { const id = ytId(url); return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null; };
const ytWatch = url => { const id = ytId(url); return id ? `https://www.youtube.com/watch?v=${id}` : url; };
const blogDateLabel = iso => new Date(iso + "T00:00:00")
  .toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();

function groupVideos(videos) {
  const buckets = [];
  videos.forEach((v, i) => {
    let b = buckets.find(x => x.key === (v.group || null));
    if (!b) { b = { key: v.group || null, items: [] }; buckets.push(b); }
    b.items.push([v, i]);
  });
  return buckets;
}

// trim a description to ~155 chars at a word boundary for <meta name="description">
function metaDesc(text) {
  const t = String(text).replace(/\s+/g, " ").trim();
  if (t.length <= 155) return t;
  return t.slice(0, 155).replace(/\s+\S*$/, "") + "…";
}

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,340..500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">`;

// shared header/footer (DEPTH-prefixed) matching project.html / blog/post.html
const header = d => `<header class="site">
  <div class="wrap">
    <a class="logo" href="${d}index.html"><svg class="logo-mark" viewBox="0 0 14 28" aria-hidden="true" focusable="false"><polygon points="1,0 13,0 7,10" fill="#e05a4e"/><rect x="5.75" y="9" width="2.5" height="19" fill="#e05a4e"/></svg><span class="logo-name">PRANAY <span>NICHANI</span></span></a>
    <button class="nav-toggle" id="nav-toggle" aria-label="Menu" aria-expanded="false" aria-controls="site-nav">
      <span></span><span></span><span></span>
    </button>
    <nav class="main" id="site-nav">
      <a href="${d}index.html">HOME</a>
      <a href="${d}work.html" class="active">WORK</a>
      <a href="${d}about.html">ABOUT</a>
      <a href="${d}blog/index.html">NOTES</a>
      <a href="${d}index.html#contact">CONTACT</a>
    </nav>
  </div>
</header>`;

const footer = d => `<footer class="site" id="contact">
  <div class="wrap">
    <div class="foot-contact">
      <p style="font-size:12px; letter-spacing:2px; color:var(--text-faint); margin-bottom:8px;">GOT A PROJECT IN POST?</p>
      <a href="mailto:pranaynichani@gmail.com">pranaynichani@gmail.com</a>
    </div>
    <div class="foot-meta">
      <p><a href="tel:+16477079594">+1 647 707 9594</a> · Toronto, ON</p>
      <p>© 2026 Pranay Nichani</p>
    </div>
  </div>
</footer>

<script src="${d}js/data.js"></script>
<script src="${d}js/main.js"></script>`;

// ---------- project pages ----------
const projDir = path.join(ROOT, "project");
fs.mkdirSync(projDir, { recursive: true });

function projectJsonLd(p, canonical, image) {
  const type = p.type === "feature" || p.type === "short" ? "Movie"
    : p.type === "series" ? "TVSeries" : "CreativeWork";
  const ld = {
    "@context": "https://schema.org",
    "@type": type,
    name: p.title,
    url: canonical,
    image,
    description: p.desc,
    dateCreated: String(p.year),
    contributor: { "@type": "Person", name: "Pranay Nichani", url: ORIGIN + "/", jobTitle: p.role }
  };
  if (p.award) ld.award = p.award;
  return JSON.stringify(ld);
}

PROJECTS.forEach((p, idx) => {
  const d = "../";
  const canonical = `${ORIGIN}/project/${p.slug}`;
  const image = `${ORIGIN}/assets/stills/${p.slug}.${p.img}`;
  const desc = metaDesc(p.desc);
  const prev = PROJECTS[(idx - 1 + PROJECTS.length) % PROJECTS.length];
  const next = PROJECTS[(idx + 1) % PROJECTS.length];

  const clipThumb = v => `<button class="clip-thumb" data-url="${esc(v.url)}" data-poster="${ytThumb(v.url)}" title="${esc(v.title)}">
    <img src="${ytThumb(v.url)}" alt="" loading="lazy"><span>${esc(v.title)}</span></button>`;
  const buckets = p.videos ? groupVideos(p.videos) : [];
  const videosHtml = p.videos ? `
        <p class="clip-bin-head">SELECTED SPOTS — CLICK TO PLAY</p>
        ${buckets.length > 1
          ? buckets.map(b => `<p class="clip-bin-subhead">${esc(b.key || "OTHER")}</p>
          <div class="clip-bin">${b.items.map(([v]) => clipThumb(v)).join("")}</div>`).join("")
          : `<div class="clip-bin">${p.videos.map(clipThumb).join("")}</div>`}` : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(p.title)} — Pranay Nichani</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(p.title)} — Pranay Nichani">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${image}">
  <meta name="twitter:card" content="summary_large_image">
  ${FONTS}
  <link rel="icon" type="image/svg+xml" href="${d}assets/favicon.svg">
  <link rel="stylesheet" href="${d}css/style.css">
  <script type="application/ld+json">${projectJsonLd(p, canonical, image)}</script>
</head>
<body data-depth="${d}" data-project="${p.slug}">

${header(d)}

<main id="proj">
  <div class="wrap proj-top">
    <a class="proj-back" href="${d}work.html">← All work</a>
    <div class="proj-lead">
      <div class="proj-media still"><img src="${d}assets/stills/${p.slug}.${p.img}" alt="Still from ${esc(p.title)}"></div>
      <div class="proj-info">
        ${p.award ? `<p class="proj-award">${esc(p.award)}</p>` : ""}
        <h1>${esc(p.title)}</h1>
        <p class="proj-type">${TYPE_LABELS[p.type]} · ${p.year}</p>
        <dl class="spec">
          <dt>MY ROLE</dt><dd>${esc(p.role)}</dd>
          <dt>CREDITS</dt><dd>${esc(p.credit)}</dd>
        </dl>
        ${p.trailer ? `<a class="proj-yt" href="${ytWatch(p.trailer)}" target="_blank" rel="noopener">Watch on YouTube ↗</a>` : ""}
      </div>
    </div>
    <div class="proj-desc">
      <p>${esc(p.desc)}</p>
      ${p.laurels ? `<div class="laurels-text">${esc(p.laurels)}</div>` : ""}
      ${videosHtml}
    </div>
  </div>

  <div class="wrap proj-nav">
    <a href="${prev.slug}.html">← ${esc(prev.title)}</a>
    <a href="${d}work.html">All work</a>
    <a href="${next.slug}.html">${esc(next.title)} →</a>
  </div>
</main>

${footer(d)}
</body>
</html>
`;
  fs.writeFileSync(path.join(projDir, `${p.slug}.html`), html);
});
console.log(`✓ ${PROJECTS.length} project pages → site/project/`);

// ---------- block-based blog posts (posts WITHOUT a customFile) ----------
const blockPosts = blog.posts.filter(p => !p.customFile || p.customFile.startsWith("/blog/"));
blockPosts.forEach(p => {
  const d = "../";
  const canonical = `${ORIGIN}/blog/${p.slug}`;
  const blocksHtml = (p.blocks || []).map(b =>
    b.type === "heading" ? `<h2>${esc(b.text)}</h2>` :
    b.type === "html" ? b.text :
    `<p>${b.text}</p>`).join("\n      ");
  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.title,
    datePublished: p.date,
    description: p.teaser,
    url: canonical,
    author: { "@type": "Person", name: "Pranay Nichani", url: ORIGIN + "/" }
  });
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(p.title)} — Pranay Nichani</title>
  <meta name="description" content="${esc(metaDesc(p.teaser))}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${esc(p.title)} — Pranay Nichani">
  <meta property="og:description" content="${esc(metaDesc(p.teaser))}">
  <meta property="og:url" content="${canonical}">
  <meta name="twitter:card" content="summary">
  ${FONTS}
  <link rel="icon" type="image/svg+xml" href="${d}assets/favicon.svg">
  <link rel="stylesheet" href="${d}css/style.css">
  <script type="application/ld+json">${ld}</script>
</head>
<body data-depth="${d}" data-post="${p.slug}">

${header(d)}

<main id="post">
  <article class="post">
    <p class="date">${blogDateLabel(p.date)}</p>
    <h1>${esc(p.title)}</h1>
    ${blocksHtml}
  </article>
</main>

${footer(d)}
</body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, "blog", `${p.slug}.html`), html);
});
console.log(`✓ ${blockPosts.length} blog post page(s) → site/blog/`);

// ---------- sitemap ----------
const urls = [
  { loc: `${ORIGIN}/`, pri: "1.0" },
  { loc: `${ORIGIN}/work`, pri: "0.9" },
  { loc: `${ORIGIN}/about`, pri: "0.8" },
  { loc: `${ORIGIN}/teaching`, pri: "0.7" },
  { loc: `${ORIGIN}/blog/`, pri: "0.8" },
  ...blog.posts.map(p => ({
    loc: p.customFile && !p.customFile.startsWith("/blog/")
      ? ORIGIN + p.customFile.replace(/\.html$/, "")
      : `${ORIGIN}/blog/${p.slug}`,
    pri: "0.7"
  })),
  ...PROJECTS.map(p => ({ loc: `${ORIGIN}/project/${p.slug}`, pri: "0.6" }))
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${TODAY}</lastmod><priority>${u.pri}</priority></url>`).join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap);
console.log(`✓ sitemap.xml — ${urls.length} URLs`);
