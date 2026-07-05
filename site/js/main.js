// Shared rendering for all pages. Reads PROJECTS from data.js.

const $ = (sel, el = document) => el.querySelector(sel);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// depth: prefix for asset/page paths ("" at site root, "../" inside /blog)
const DEPTH = document.body.dataset.depth || "";

function still(p) { return `${DEPTH}assets/stills/${p.slug}.${p.img}`; }
function pageUrl(p) { return `${DEPTH}project.html?p=${p.slug}`; }

function cardHtml(p, extraClass = "") {
  const tag = p.award ? `<span class="tag">${esc(p.award)}</span>` : "";
  return `<a class="card ${extraClass}" href="${pageUrl(p)}" data-type="${p.type}">
    <div class="media"><img src="${still(p)}" alt="Still from ${esc(p.title)}" loading="lazy"></div>
    ${tag}
    <div class="meta"><h3>${esc(p.title)}</h3><p>${esc(p.role)} · ${p.year}</p></div>
  </a>`;
}

// ---------- homepage: selected work ----------
function renderFeatured() {
  const host = $("#featured-grid");
  if (!host) return;
  const feats = PROJECTS.filter(p => p.featured);
  const spans = ["span-8", "span-4", "span-4", "span-4", "span-4", "span-8"];
  host.innerHTML = feats.map((p, i) => cardHtml(p, `${spans[i % spans.length]} reveal`)).join("");
}

// ---------- homepage: career timeline ----------
function renderTimeline() {
  const host = $("#timeline");
  if (!host) return;
  const Y0 = 2010, Y1 = 2026;
  const pct = y => ((y - Y0) / (Y1 - Y0)) * 100;

  const clips = PROJECTS.map(p => ({
    title: p.title, detail: `${p.role} · ${p.year}`, type: p.type,
    start: p.start || p.year, end: (p.end || p.year) + 0.85,
    href: pageUrl(p), editor: /(^|\/ ?)Editor|Director/i.test(p.role)
  })).concat(TIMELINE_EXTRAS.map(x => ({
    title: x.title, detail: x.detail, type: x.type,
    start: x.start, end: x.end, href: null, editor: x.type === "teaching" ? false : true
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
  for (const key of ["feature", "series", "other"]) {
    html += `<p class="tl-track-name">${trackNames[key]}</p>`;
    lanes(tracks[key]).forEach(lane => {
      html += `<div class="tl-track">`;
      lane.forEach(c => {
        const left = pct(c.start), width = Math.max(pct(c.end) - pct(c.start), 3.2);
        html += `<${c.href ? "a" : "div"} class="tl-clip${c.editor ? " editor" : ""}" ${c.href ? `href="${c.href}"` : ""}
          style="left:${left}%;width:${width}%"
          data-title="${esc(c.title)}" data-detail="${esc(c.detail)}" data-mid="${left + width / 2}">
          ${esc(c.title)}</${c.href ? "a" : "div"}>`;
      });
      html += `</div>`;
    });
  }
  html += `<div class="tl-playhead" id="playhead" style="left:60%"></div>`;
  host.innerHTML = html;

  const readTitle = $("#tl-title"), readDetail = $("#tl-detail"), playhead = $("#playhead");
  host.querySelectorAll(".tl-clip").forEach(clip => {
    clip.addEventListener("mouseenter", () => {
      host.querySelectorAll(".tl-clip.lit").forEach(c => c.classList.remove("lit"));
      clip.classList.add("lit");
      readTitle.textContent = clip.dataset.title;
      readDetail.textContent = clip.dataset.detail;
      playhead.style.left = clip.dataset.mid + "%";
    });
  });
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
        <p>${esc(p.desc)}</p>
        ${p.laurels ? `<div class="laurels-text">${esc(p.laurels)}</div>` : ""}
        ${p.trailer ? `<a class="btn" href="${esc(p.trailer)}" target="_blank" rel="noopener">WATCH TRAILER</a>` : ""}
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
}

// ---------- reveal on scroll ----------
function watchReveals() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));
}

renderFeatured();
renderTimeline();
renderArchive();
renderProject();
watchReveals();
