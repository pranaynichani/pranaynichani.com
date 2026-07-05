// Shared rendering for all pages. Reads PROJECTS from data.js.

const $ = (sel, el = document) => el.querySelector(sel);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// depth: prefix for asset/page paths ("" at site root, "../" inside /blog)
const DEPTH = document.body.dataset.depth || "";

function still(p) { return `${DEPTH}assets/stills/${p.slug}.${p.img}`; }
function pageUrl(p) { return `${DEPTH}project.html?p=${p.slug}`; }

// ---------- YouTube helpers ----------
// NOTE: YouTube refuses to play when the page is opened via file:// or inside
// a sandboxed preview iframe (Error 153 = missing referrer). Always view the
// site over http(s) — locally that's http://localhost:8090.
function ytId(url) {
  const m = String(url || "").match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/);
  return m ? m[1] : null;
}
function ytThumb(url) { const id = ytId(url); return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null; }
function ytWatch(url) { const id = ytId(url); return id ? `https://www.youtube.com/watch?v=${id}` : url; }

// Load the IFrame Player API once. Resolves with the YT namespace.
let _ytReady;
function ytApi() {
  if (_ytReady) return _ytReady;
  _ytReady = new Promise(resolve => {
    if (window.YT && window.YT.Player) return resolve(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(window.YT); };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return _ytReady;
}

function ytFallback(node, url, poster) {
  const wrap = document.createElement("div");
  wrap.className = "yt-fallback";
  wrap.innerHTML =
    `${poster ? `<img src="${poster}" alt="" class="yt-fallback-bg">` : ""}
     <div class="yt-fallback-in">
       <p>This trailer is set to play on YouTube only.</p>
       <a class="btn" href="${url}" target="_blank" rel="noopener">WATCH ON YOUTUBE ↗</a>
     </div>`;
  node.replaceWith(wrap);
}

// Mount a player into the given div (`el` is consumed/replaced by the iframe).
// On any embedding error, swap in a clean "Watch on YouTube" fallback.
function mountYouTube(el, url, opts = {}) {
  const { autoplay = false, poster = null } = opts;
  const id = ytId(url);
  if (!id) return;
  ytApi().then(YT => {
    new YT.Player(el, {
      videoId: id,
      playerVars: { rel: 0, modestbranding: 1, playsinline: 1, autoplay: autoplay ? 1 : 0, origin: location.origin },
      events: {
        onReady: e => { if (autoplay) { try { e.target.playVideo(); } catch (_) {} } },
        onError: e => ytFallback(e.target.getIframe(), ytWatch(url), poster)
      }
    });
  });
}

// Replace a media frame's contents with a fresh mount point and load a video.
function loadVideoInto(frame, url, poster, autoplay) {
  frame.innerHTML = `<div class="ytm"></div>`;
  mountYouTube(frame.querySelector(".ytm"), url, { autoplay, poster });
}

// ---------- cards ----------
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

// ---------- timeline layout (shared by homepage suite + project mini nav) ----------
const TL_Y0 = 2010, TL_Y1 = 2026;
const tlPct = y => ((y - TL_Y0) / (TL_Y1 - TL_Y0)) * 100;

function buildClips() {
  return PROJECTS.map(p => ({
    slug: p.slug, title: p.title, detail: `${p.role} · ${p.year}`, type: p.type,
    start: p.start || p.year, end: (p.end || p.year) + 0.85,
    href: pageUrl(p), video: p.trailer, poster: still(p),
    editor: /(^|\/ ?)Editor|Director/i.test(p.role)
  })).concat(TIMELINE_EXTRAS.map(x => ({
    slug: null, title: x.title, detail: x.detail, type: x.type,
    start: x.start, end: x.end, href: null, video: x.video || null, poster: null,
    editor: x.type !== "teaching"
  })));
}

// greedy lane packing inside each track so clips never overlap
function tlLanes(list) {
  const ls = [];
  list.sort((a, b) => a.start - b.start).forEach(c => {
    let lane = ls.find(l => l[l.length - 1].end <= c.start + 0.05);
    if (!lane) { lane = []; ls.push(lane); }
    lane.push(c);
  });
  return ls;
}

// Renders the year ruler + three tracks. mini=true renders compact <a> clips
// for navigation (currentSlug highlighted); mini=false renders interactive divs.
function timelineMarkup(clips, { mini = false, currentSlug = null } = {}) {
  const tracks = { feature: [], series: [], other: [] };
  clips.forEach(c => (tracks[c.type === "feature" ? "feature" : c.type === "series" ? "series" : "other"]).push(c));

  const years = [];
  for (let y = TL_Y0; y < TL_Y1; y += 2) years.push(`<span>${y}</span>`);

  let html = `<div class="tl-years">${years.join("")}</div>`;
  const trackNames = { feature: "V1 · FEATURES", series: "V2 · SERIES", other: "V3 · SHORTS + MORE" };
  let idx = 0;
  const byIdx = [];
  let currentMid = null;
  for (const key of ["feature", "series", "other"]) {
    html += `<p class="tl-track-name">${trackNames[key]}</p>`;
    tlLanes(tracks[key]).forEach(lane => {
      html += `<div class="tl-track">`;
      lane.forEach(c => {
        byIdx[idx] = c;
        const left = tlPct(c.start), width = Math.max(tlPct(c.end) - tlPct(c.start), 3.2);
        const mid = left + width / 2;
        const isCurrent = currentSlug && c.slug === currentSlug;
        if (isCurrent) currentMid = mid;
        if (mini) {
          const inner = `class="tl-clip${c.editor ? " editor" : ""}${isCurrent ? " lit" : ""}"
            style="left:${left}%;width:${width}%" title="${esc(c.title)} · ${esc(c.detail)}"`;
          html += c.href
            ? `<a ${inner} href="${c.href}">${esc(c.title)}</a>`
            : `<span ${inner}>${esc(c.title)}</span>`;
        } else {
          html += `<div class="tl-clip${c.editor ? " editor" : ""}" role="button" tabindex="0"
            style="left:${left}%;width:${width}%" data-i="${idx}" data-mid="${mid}">
            ${esc(c.title)}</div>`;
        }
        idx++;
      });
      html += `</div>`;
    });
  }
  html += `<div class="tl-playhead"${currentMid !== null ? ` style="left:${currentMid}%"` : ` style="left:60%"`}></div>`;
  return { html, byIdx };
}

// ---------- homepage: edit-suite hero (bins + program monitor + tracks) ----------
function renderTimeline() {
  const host = $("#timeline");
  if (!host) return;
  const clips = buildClips();
  const { html, byIdx } = timelineMarkup(clips);
  host.innerHTML = html;

  const screen = $("#mon-screen"), readTitle = $("#tl-title"), readDetail = $("#tl-detail");
  const openLink = $("#mon-open"), playhead = host.querySelector(".tl-playhead");
  const heroBox = $("#mon-hero");
  let heroMode = true, heroTimer = null;
  let current = null;

  // --- hero slideshow inside the monitor (runs until a clip is clicked) ---
  const slides = PROJECTS.filter(p => p.featured);
  if (heroBox) {
    slides.forEach((p, i) => {
      const im = document.createElement("img");
      im.src = still(p);
      im.alt = `Still from ${p.title}`;
      if (i === 0) im.className = "on";
      heroBox.prepend(im);
    });
    const imgs = [...heroBox.querySelectorAll("img")];
    const captions = slides.map(p => `Now showing: ${p.title}${p.award ? " — " + p.award : ""}`);
    readDetail.textContent = captions[0] + " · hover a clip to scrub · click to play";
    let i = 0;
    heroTimer = setInterval(() => {
      imgs[i].classList.remove("on");
      i = (i + 1) % imgs.length;
      imgs[i].classList.add("on");
      if (heroMode) readDetail.textContent = captions[i] + " · hover a clip to scrub · click to play";
    }, 6000);
  }

  // preload poster frames so loading feels instant
  clips.forEach(c => { const src = c.poster || ytThumb(c.video); if (src) { const im = new Image(); im.src = src; } });
  function posterSrc(c) { return c.poster || ytThumb(c.video); }

  // hover: highlight + readout only — never touches what's loaded in the monitor
  function scrubTo(c, clipEl) {
    host.querySelectorAll(".tl-clip.hov").forEach(x => x.classList.remove("hov"));
    if (clipEl) clipEl.classList.add("hov");
    readTitle.textContent = c.title;
    readDetail.textContent = c.detail + (c.video ? " · CLICK TO PLAY" : "");
  }

  // click: load the clip into the monitor and play it
  function loadClip(c, clipEl) {
    if (heroMode) { heroMode = false; clearInterval(heroTimer); }
    current = c;
    host.querySelectorAll(".tl-clip.lit").forEach(x => x.classList.remove("lit"));
    if (clipEl) { clipEl.classList.add("lit"); playhead.style.left = clipEl.dataset.mid + "%"; }
    readTitle.textContent = c.title;
    readDetail.textContent = c.detail;
    if (openLink) {
      if (c.href) { openLink.style.display = ""; openLink.href = c.href; }
      else openLink.style.display = "none";
    }
    if (c.video) {
      loadVideoInto(screen, c.video, posterSrc(c), true);
    } else if (c.poster) {
      screen.innerHTML = `<img src="${c.poster}" alt="Still from ${esc(c.title)}">`;
    } else if (c.href) {
      location.href = c.href;
    }
    // reflect the selection in the bins panel (open its bin, highlight it)
    const binsEl = document.getElementById("bins");
    if (binsEl) {
      binsEl.querySelectorAll(".bin-item.on").forEach(b => b.classList.remove("on"));
      const item = binsEl.querySelector(`.bin-item[data-ci="${clips.indexOf(c)}"]`);
      if (item) { item.classList.add("on"); const g = item.closest(".bin-group"); if (g) g.classList.add("open"); }
    }
  }

  host.querySelectorAll(".tl-clip").forEach(el => {
    const c = byIdx[el.dataset.i];
    el.addEventListener("mouseenter", () => scrubTo(c, el));
    el.addEventListener("focus", () => scrubTo(c, el));
    el.addEventListener("click", () => loadClip(c, el));
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); loadClip(c, el); } });
  });

  // ---- bins ----
  const bins = $("#bins");
  if (bins) {
    const groups = [
      { key: "feature", label: "Features" }, { key: "series", label: "Series" },
      { key: "short", label: "Shorts" }, { key: "commercial", label: "Commercial" },
      { key: "teaching", label: "Teaching" }
    ];
    const clipEls = [...host.querySelectorAll(".tl-clip")];
    const findEl = c => clipEls.find(x => byIdx[x.dataset.i] === c);

    bins.innerHTML = `<p class="bins-head">BINS · CLICK TO OPEN</p><div class="bins-list">` + groups.map(g => {
      const items = clips.map((c, i) => [c, i]).filter(([c]) => c.type === g.key)
        .sort((a, b) => b[0].start - a[0].start);
      if (!items.length) return "";
      return `<div class="bin-group" data-bin="${g.key}">
        <button class="bin-header"><span class="bin-icon">▸</span><span class="bin-label">${g.label}</span><span class="bin-count">${items.length}</span></button>
        <div class="bin-items">${items.map(([c, i]) =>
          `<button class="bin-item" data-ci="${i}"><span class="bin-dot">${c.editor ? "◆" : "▸"}</span><span class="bin-title">${esc(c.title)}</span></button>`).join("")}</div>
      </div>`;
    }).join("") + `</div>`;

    bins.querySelectorAll(".bin-header").forEach(h => {
      h.addEventListener("click", () => h.parentElement.classList.toggle("open"));
    });
    bins.querySelectorAll(".bin-item").forEach(it => {
      it.addEventListener("click", () => {
        const c = clips[+it.dataset.ci];
        loadClip(c, findEl(c));
      });
    });
  }
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

  // media frame: trailer player if there's a video, otherwise the still
  const mediaHtml = p.trailer
    ? `<div class="proj-media" id="proj-media"></div>`
    : `<div class="proj-media still"><img src="${still(p)}" alt="Still from ${esc(p.title)}"></div>`;

  const videosHtml = p.videos ? `
    <p class="clip-bin-head">SELECTED SPOTS — CLICK TO PLAY</p>
    <div class="clip-bin">${p.videos.map(v =>
      `<button class="clip-thumb" data-url="${esc(v.url)}" data-poster="${ytThumb(v.url)}" title="${esc(v.title)}">
        <img src="${ytThumb(v.url)}" alt="" loading="lazy"><span>${esc(v.title)}</span></button>`).join("")}
    </div>` : "";

  const mini = timelineMarkup(buildClips(), { mini: true, currentSlug: p.slug });

  host.innerHTML = `
    <div class="wrap proj-top">
      <a class="proj-back" href="${DEPTH}work.html">← All work</a>
      <div class="proj-lead">
        ${mediaHtml}
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

    <div class="wrap proj-strip-wrap">
      <p class="strip-head">THE TIMELINE — CLICK A CLIP TO JUMP TO IT</p>
      <div class="tl-scroll"><div class="tl-inner tl-mini">${mini.html}</div></div>
    </div>

    <div class="wrap proj-nav">
      <a href="${pageUrl(prev)}">← ${esc(prev.title)}</a>
      <a href="${DEPTH}work.html">All work</a>
      <a href="${pageUrl(next)}">${esc(next.title)} →</a>
    </div>`;

  // load the main trailer (poster + play; auto-falls back if embedding is off)
  if (p.trailer) loadVideoInto($("#proj-media"), p.trailer, ytThumb(p.trailer), false);

  // clip-bin thumbs swap the main media frame
  host.querySelectorAll(".clip-thumb").forEach(btn => {
    btn.addEventListener("click", () => {
      const frame = $("#proj-media");
      loadVideoInto(frame, btn.dataset.url, btn.dataset.poster, true);
      frame.scrollIntoView({ behavior: "smooth", block: "center" });
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

renderFeatured();
renderTimeline();
renderArchive();
renderProject();
watchReveals();
