// Shared rendering for all pages. Reads PROJECTS from data.js.

const $ = (sel, el = document) => el.querySelector(sel);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// depth: prefix for asset/page paths ("" at site root, "../" inside /blog)
const DEPTH = document.body.dataset.depth || "";

function still(p) { return `${DEPTH}assets/stills/${p.slug}.${p.img}`; }
function pageUrl(p) { return `${DEPTH}project.html?p=${p.slug}`; }

// YouTube helpers — accepts watch?v=, youtu.be, or embed URLs
function ytId(url) {
  const m = String(url || "").match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/);
  return m ? m[1] : null;
}
function ytThumb(url) { const id = ytId(url); return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null; }
function ytEmbed(url, autoplay = true) {
  const id = ytId(url);
  return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1${autoplay ? "&autoplay=1" : ""}` : null;
}

function cardHtml(p, extraClass = "") {
  const tag = p.award ? `<span class="tag">${esc(p.award)}</span>` : "";
  return `<a class="card ${extraClass}" href="${pageUrl(p)}" data-type="${p.type}">
    <div class="media"><img src="${still(p)}" alt="Still from ${esc(p.title)}" loading="lazy"></div>
    ${tag}
    <div class="meta"><h3>${esc(p.title)}</h3><p>${esc(p.role)} · ${p.year}</p></div>
  </a>`;
}

// ---------- homepage: hero slideshow ----------
function renderHero() {
  const host = $("#hero-media");
  if (!host) return;
  const slides = PROJECTS.filter(p => p.featured);
  const cred = $("#hero-cred");
  host.innerHTML = slides.map((p, i) =>
    `<img src="${still(p)}" alt="Still from ${esc(p.title)}" class="${i === 0 ? "on" : ""}">`).join("");
  const imgs = host.querySelectorAll("img");
  const captions = slides.map(p =>
    `Still from ${p.title}${p.award ? " — " + p.award : ""}`);
  if (cred) cred.textContent = captions[0];
  let i = 0;
  setInterval(() => {
    imgs[i].classList.remove("on");
    i = (i + 1) % imgs.length;
    imgs[i].classList.add("on");
    if (cred) cred.textContent = captions[i];
  }, 6000);
}

// ---------- homepage: selected work ----------
function renderFeatured() {
  const host = $("#featured-grid");
  if (!host) return;
  const feats = PROJECTS.filter(p => p.featured);
  const spans = ["span-8", "span-4", "span-4", "span-4", "span-4", "span-8"];
  host.innerHTML = feats.map((p, i) => cardHtml(p, `${spans[i % spans.length]} reveal`)).join("");
}

// ---------- homepage: edit-suite timeline (bins + program monitor + tracks) ----------
function renderTimeline() {
  const host = $("#timeline");
  if (!host) return;
  const Y0 = 2010, Y1 = 2026;
  const pct = y => ((y - Y0) / (Y1 - Y0)) * 100;

  const clips = PROJECTS.map(p => ({
    title: p.title, detail: `${p.role} · ${p.year}`, type: p.type,
    start: p.start || p.year, end: (p.end || p.year) + 0.85,
    href: pageUrl(p), video: p.trailer, poster: still(p),
    editor: /(^|\/ ?)Editor|Director/i.test(p.role)
  })).concat(TIMELINE_EXTRAS.map(x => ({
    title: x.title, detail: x.detail, type: x.type,
    start: x.start, end: x.end, href: null, video: x.video || null, poster: null,
    editor: x.type !== "teaching"
  })));

  const tracks = { feature: [], series: [], other: [] };
  clips.forEach(c => (tracks[c.type === "feature" ? "feature" : c.type === "series" ? "series" : "other"]).push(c));

  // greedy lane packing inside each track so clips never overlap
  function lanes(list) {
    const ls = [];
    list.sort((a, b) => a.start - b.start).forEach(c => {
      let lane = ls.find(l => l[l.length - 1].end <= c.start + 0.05);
      if (!lane) { lane = []; ls.push(lane); }
      lane.push(c);
    });
    return ls;
  }

  const years = [];
  for (let y = Y0; y < Y1; y += 2) years.push(`<span>${y}</span>`);

  let html = `<div class="tl-years">${years.join("")}</div>`;
  const trackNames = { feature: "V1 · FEATURES", series: "V2 · SERIES", other: "V3 · SHORTS + MORE" };
  let idx = 0;
  const byIdx = [];
  for (const key of ["feature", "series", "other"]) {
    html += `<p class="tl-track-name">${trackNames[key]}</p>`;
    lanes(tracks[key]).forEach(lane => {
      html += `<div class="tl-track">`;
      lane.forEach(c => {
        byIdx[idx] = c;
        const left = pct(c.start), width = Math.max(pct(c.end) - pct(c.start), 3.2);
        html += `<div class="tl-clip${c.editor ? " editor" : ""}" role="button" tabindex="0"
          style="left:${left}%;width:${width}%" data-i="${idx}" data-mid="${left + width / 2}">
          ${esc(c.title)}</div>`;
        idx++;
      });
      html += `</div>`;
    });
  }
  html += `<div class="tl-playhead" id="playhead" style="left:60%"></div>`;
  host.innerHTML = html;

  // ---- program monitor ----
  const screen = $("#mon-screen"), readTitle = $("#tl-title"), readDetail = $("#tl-detail");
  const openLink = $("#mon-open"), playhead = $("#playhead");
  let current = null;

  // preload poster frames so scrubbing is instant
  clips.forEach(c => { const src = c.poster || ytThumb(c.video); if (src) { const im = new Image(); im.src = src; } });

  function posterSrc(c) { return ytThumb(c.video) || c.poster; }

  function scrubTo(c, clipEl) {
    current = c;
    host.querySelectorAll(".tl-clip.lit").forEach(x => x.classList.remove("lit"));
    if (clipEl) { clipEl.classList.add("lit"); playhead.style.left = clipEl.dataset.mid + "%"; }
    readTitle.textContent = c.title;
    readDetail.textContent = c.detail;
    const src = posterSrc(c);
    screen.innerHTML = src
      ? `<img src="${src}" alt="Preview of ${esc(c.title)}"><span class="mon-play">▶&#xFE0E;</span>`
      : `<p class="mon-empty">${esc(c.title)}</p>`;
    if (openLink) {
      if (c.href) { openLink.style.display = ""; openLink.href = c.href; }
      else openLink.style.display = "none";
    }
  }

  function playCurrent() {
    if (!current) return;
    const embed = ytEmbed(current.video);
    if (embed) screen.innerHTML = `<iframe src="${embed}" title="${esc(current.title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    else if (current.href) location.href = current.href;
  }

  host.querySelectorAll(".tl-clip").forEach(el => {
    const c = byIdx[el.dataset.i];
    el.addEventListener("mouseenter", () => scrubTo(c, el));
    el.addEventListener("focus", () => scrubTo(c, el));
    el.addEventListener("click", () => { scrubTo(c, el); playCurrent(); });
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); scrubTo(c, el); playCurrent(); } });
  });
  screen.addEventListener("click", e => { if (!screen.querySelector("iframe")) playCurrent(); });

  // ---- bins ----
  const bins = $("#bins");
  if (bins) {
    const groups = [
      { key: "feature", label: "Features" }, { key: "series", label: "Series" },
      { key: "short", label: "Shorts" }, { key: "commercial", label: "Commercial" },
      { key: "teaching", label: "Teaching" }
    ];
    bins.innerHTML = `<p class="bins-head">BINS</p>` + groups.map(g => {
      const n = clips.filter(c => c.type === g.key).length;
      return `<button class="bin" data-bin="${g.key}"><span class="bin-icon">▸</span> ${g.label} <span class="bin-count">${n}</span></button>`;
    }).join("");
    bins.querySelectorAll(".bin").forEach(btn => {
      btn.addEventListener("click", () => {
        bins.querySelectorAll(".bin.on").forEach(b => b.classList.remove("on"));
        btn.classList.add("on");
        const first = clips.filter(c => c.type === btn.dataset.bin)
          .sort((a, b) => b.start - a.start)[0];
        const el = [...host.querySelectorAll(".tl-clip")].find(x => byIdx[x.dataset.i] === first);
        if (first) scrubTo(first, el);
      });
    });
  }

  // default: land on To Kill a Tiger
  const start = clips.find(c => c.title === "To Kill a Tiger") || clips[0];
  const startEl = [...host.querySelectorAll(".tl-clip")].find(x => byIdx[x.dataset.i] === start);
  scrubTo(start, startEl);
}

// ---------- work page: archive + filters ----------
function renderArchive() {
  const host = $("#archive-grid");
  if (!host) return;
  const sorted = [...PROJECTS].sort((a, b) => b.year - a.year);
  host.innerHTML = sorted.map(p => cardHtml(p, "reveal")).join("");

  document.querySelectorAll(".filters button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filters button").forEach(b => b.classList.remove("on"));
      btn.classList.add("on");
      const f = btn.dataset.filter;
      host.querySelectorAll(".card").forEach(card => {
        const p = sorted.find(x => card.href.includes(x.slug));
        const show =
          f === "all" ? true :
          f === "editor" ? /(^|\/ ?)(Additional )?Editor|Director/i.test(p.role) :
          card.dataset.type === f;
        card.style.display = show ? "" : "none";
      });
    });
  });
}

// ---------- project page ----------
function renderProject() {
  const host = $("#proj");
  if (!host) return;
  const slug = new URLSearchParams(location.search).get("p");
  const idx = PROJECTS.findIndex(p => p.slug === slug);
  const p = PROJECTS[idx] || PROJECTS[0];
  document.title = `${p.title} — Pranay Nichani`;

  const prev = PROJECTS[(idx - 1 + PROJECTS.length) % PROJECTS.length];
  const next = PROJECTS[(idx + 1) % PROJECTS.length];

  const trailerEmbed = ytEmbed(p.trailer, false);
  const playerHtml = trailerEmbed
    ? `<div class="player" id="player"><iframe src="${trailerEmbed}" title="${esc(p.title)} trailer" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`
    : "";
  const videosHtml = p.videos ? `
    <p class="clip-bin-head">SELECTED SPOTS — CLICK TO LOAD</p>
    <div class="clip-bin">${p.videos.map(v =>
      `<button class="clip-thumb" data-url="${esc(v.url)}" title="${esc(v.title)}">
        <img src="${ytThumb(v.url)}" alt="" loading="lazy"><span>${esc(v.title)}</span></button>`).join("")}
    </div>` : "";

  host.innerHTML = `
    <div class="proj-hero">
      <div class="hero-media"><img src="${still(p)}" alt="Still from ${esc(p.title)}"></div>
      <div class="wrap hero-content">
        ${p.award ? `<p class="hero-kicker">${esc(p.award).toUpperCase()}</p>` : ""}
        <h1 class="hero-title">${esc(p.title)}</h1>
        <p class="hero-sub">${TYPE_LABELS[p.type]} · ${p.year}</p>
      </div>
    </div>
    <div class="wrap proj-body">
      <div class="desc">
        ${playerHtml}
        <p>${esc(p.desc)}</p>
        ${p.laurels ? `<div class="laurels-text">${esc(p.laurels)}</div>` : ""}
        ${videosHtml}
      </div>
      <dl class="spec">
        <dt>MY ROLE</dt><dd>${esc(p.role)}</dd>
        <dt>CREDITS</dt><dd>${esc(p.credit)}</dd>
        <dt>YEAR</dt><dd>${p.year}</dd>
        <dt>FORMAT</dt><dd>${TYPE_LABELS[p.type]}</dd>
      </dl>
    </div>
    <div class="wrap proj-nav">
      <a href="${pageUrl(prev)}">← ${esc(prev.title)}</a>
      <a href="${DEPTH}work.html">All work</a>
      <a href="${pageUrl(next)}">${esc(next.title)} →</a>
    </div>`;

  host.querySelectorAll(".clip-thumb").forEach(btn => {
    btn.addEventListener("click", () => {
      const player = $("#player");
      if (player) {
        player.querySelector("iframe").src = ytEmbed(btn.dataset.url);
        player.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  });
}

// ---------- reveal on scroll ----------
function watchReveals() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));
}

renderHero();
renderFeatured();
renderTimeline();
renderArchive();
renderProject();
watchReveals();
