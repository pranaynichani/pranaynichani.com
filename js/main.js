// Shared rendering for all pages. Reads PROJECTS from data.js.

const $ = (sel, el = document) => el.querySelector(sel);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// depth: prefix for asset/page paths ("" at site root, "../" inside /blog)
const DEPTH = document.body.dataset.depth || "";

function still(p) { return `${DEPTH}assets/stills/${p.slug}.${p.img}`; }
function pageUrl(p) { return `${DEPTH}project.html?p=${p.slug}`; }

// Buckets a project's videos[] by their `group` field (client/campaign), keeping
// each video's original index so bin selectors stay stable. Ungrouped videos (no
// `group` field) come back as a single bucket with key: null.
function groupVideos(videos) {
  const buckets = [];
  videos.forEach((v, i) => {
    let b = buckets.find(x => x.key === (v.group || null));
    if (!b) { b = { key: v.group || null, items: [] }; buckets.push(b); }
    b.items.push([v, i]);
  });
  return buckets;
}

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
// Returns a promise resolving to the YT.Player instance (or null if no id),
// so callers that need real transport control (play/pause) can keep it.
function mountYouTube(el, url, opts = {}) {
  const { autoplay = false, poster = null } = opts;
  const id = ytId(url);
  if (!id) return Promise.resolve(null);
  return ytApi().then(YT => new YT.Player(el, {
    videoId: id,
    playerVars: { rel: 0, modestbranding: 1, playsinline: 1, autoplay: autoplay ? 1 : 0, origin: location.origin },
    events: {
      onReady: e => { if (autoplay) { try { e.target.playVideo(); } catch (_) {} } },
      onError: e => ytFallback(e.target.getIframe(), ytWatch(url), poster)
    }
  }));
}

// Replace a media frame's contents with a fresh mount point and load a video.
function loadVideoInto(frame, url, poster, autoplay) {
  frame.innerHTML = `<div class="ytm"></div>`;
  return mountYouTube(frame.querySelector(".ytm"), url, { autoplay, poster });
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
    page: x.page || null, editor: x.type !== "teaching"
  })));
}

// decorative NLE waveform bars — shared by the desktop A1 track and the
// mobile Rush editor's A1 strip
function audioBarsSvg(n = 240) {
  let bars = "";
  for (let x = 0; x < n; x++) {
    const h = 14 + 72 * Math.abs(Math.sin(x * 0.83) * 0.55 + Math.sin(x * 0.19) * 0.45);
    bars += `<rect x="${x * 4}" y="${(100 - h) / 2}" width="2.4" height="${h.toFixed(1)}"/>`;
  }
  return bars;
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

  let html = `<div class="tl-years">${years.join("")}</div><div class="tl-ticks" aria-hidden="true"></div>`;
  const trackNames = { feature: "V1 · FEATURES", series: "V2 · SERIES", other: "V3 · SHORTS + MORE" };
  let idx = 0;
  const byIdx = [];
  let currentMid = null;
  for (const key of ["feature", "series", "other"]) {
    tlLanes(tracks[key]).forEach((lane, li) => {
      html += `<div class="tl-track">`;
      if (li === 0) html += `<span class="tl-track-tag">${trackNames[key]}</span>`;
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
          const thumbSrc = c.poster || ytThumb(c.video);
          const thumb = thumbSrc ? `<img class="cthumb" src="${thumbSrc}" alt="" loading="lazy">` : "";
          html += `<div class="tl-clip${c.editor ? " editor" : ""}" role="button" tabindex="0"
            style="left:${left}%;width:${width}%" data-i="${idx}" data-mid="${mid}"
            data-start="${c.start}" data-end="${c.end}">
            ${thumb}<span class="tl-clip-name">${esc(c.title)}</span></div>`;
        }
        idx++;
      });
      html += `</div>`;
    });
  }
  if (!mini) {
    // decorative A1 audio track — pure NLE garnish
    const aStart = tlPct(2014), aEnd = tlPct(2025.85);
    html += `<div class="tl-track tl-audio-track">
        <span class="tl-track-tag">A1 · MIX</span>
        <div class="tl-audio" style="left:${aStart}%;width:${(aEnd - aStart)}%">
          <svg viewBox="0 0 960 100" preserveAspectRatio="none" aria-hidden="true">${audioBarsSvg()}</svg>
          <span>PRANAY_CAREER_MIX.wav</span>
        </div>
      </div>`;
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
  let heroMode = true, heroTimer = null;
  let current = null;
  let userScrubbed = false; // once true, slideshow captions stop stomping the readout

  // --- hero slideshow in the overlay (full-screen, docks into the monitor on scroll) ---
  const overlay = $("#hero-overlay"), slidesBox = $("#ho-slides");
  const slides = PROJECTS.filter(p => p.featured);
  if (slidesBox) {
    // each slide carries a blurred, zoomed copy of the same still (the .ho-slide-bg
    // layer) that mobile shows behind a fully-visible (contain) image — no poster
    // text ever gets cropped. Desktop hides the backdrop and keeps the cover fill.
    // (The backdrop path is an inline style so it resolves against the page, like
    // the <img>, not against the stylesheet.)
    slidesBox.innerHTML = slides.map((p, i) =>
      `<div class="ho-slide${i === 0 ? " on" : ""}"><div class="ho-slide-bg" style="background-image:url('${still(p)}')"></div><img src="${still(p)}" alt="Still from ${esc(p.title)}"></div>`).join("");
    const imgs = [...slidesBox.querySelectorAll(".ho-slide")];
    const captions = slides.map(p => `Now showing: ${p.title}${p.award ? " — " + p.award : ""}`);
    readDetail.textContent = captions[0] + " · hover a clip to scrub · click to play";
    let i = 0;
    heroTimer = setInterval(() => {
      imgs[i].classList.remove("on");
      i = (i + 1) % imgs.length;
      imgs[i].classList.add("on");
      if (heroMode && !userScrubbed) readDetail.textContent = captions[i] + " · hover a clip to scrub · click to play";
    }, 6000);
  }

  // --- scroll-driven docking: hero shrinks into the program monitor,
  //     bins slide in from the left, timeline rises from below ---
  const sticky = $("#suite-sticky"), section = $("#timeline-suite");
  const binsPanel = $("#bins"), monitorEl = document.querySelector(".monitor");
  const tlScroll = section && section.querySelector(".tl-scroll");
  const tlLegend = section && section.querySelector(".tl-legend");
  const textBig = $("#ho-text-big"), textSmall = $("#ho-text-small");
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const ease = t => t * t * (3 - 2 * t);
  const isMobileStage = window.matchMedia("(max-width: 860px)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function stageAt(p) {
    if (!overlay || !sticky) return;
    const sR = sticky.getBoundingClientRect();
    const mR = screen.getBoundingClientRect();
    const full = { left: 0, top: 0, w: sR.width, h: Math.min(window.innerHeight - sR.top, sR.height) };
    const dock = { left: mR.left - sR.left, top: mR.top - sR.top, w: mR.width, h: mR.height };
    const e = ease(p), L = (a, b) => a + (b - a) * e;
    overlay.style.left = L(full.left, dock.left) + "px";
    overlay.style.top = L(full.top, dock.top) + "px";
    overlay.style.width = L(full.w, dock.w) + "px";
    overlay.style.height = L(full.h, dock.h) + "px";
    overlay.style.borderRadius = (6 * e) + "px";
    if (textBig) {
      const o = clamp01(1 - p / 0.35);
      textBig.style.opacity = o;
      textBig.style.transform = `translateY(${(1 - o) * -26}px)`;
      textBig.style.visibility = o <= 0 ? "hidden" : "";
    }
    if (textSmall) textSmall.style.opacity = clamp01((p - 0.75) / 0.25);
    const slideIn = (el, from, at, span) => {
      if (!el) return;
      const o = ease(clamp01((p - at) / span));
      el.style.opacity = o;
      el.style.transform = `translate(${from[0] * (1 - o)}px, ${from[1] * (1 - o)}px)`;
      el.style.pointerEvents = o > 0.6 ? "" : "none";
    };
    slideIn(binsPanel, [-36, 0], 0.40, 0.45);
    slideIn(monitorEl && monitorEl.querySelector(".mon-bar"), [0, 14], 0.55, 0.40);
    slideIn(tlScroll, [0, 44], 0.50, 0.45);
    slideIn(tlLegend, [0, 24], 0.65, 0.35);
  }

  let stageTicking = false;
  function onStageScroll() {
    if (stageTicking) return;
    stageTicking = true;
    requestAnimationFrame(() => {
      stageTicking = false;
      if (!heroMode && overlay && overlay.classList.contains("gone")) { stageAt(1); return; }
      // dock completes at 55% of the runway; the rest is a hold so the
      // assembled suite stays pinned for a few more scrolls before release
      const runway = section.offsetHeight - sticky.offsetHeight;
      const p = runway > 0 ? clamp01(-section.getBoundingClientRect().top / (runway * 0.55)) : 1;
      stageAt(p);
    });
  }
  if (overlay && sticky) {
    if (isMobileStage) {
      // phones get a plain full-width hero, then their own Rush-style mini-editor
      section.classList.add("stage-mobile");
      overlay.removeAttribute("style");
      if (textBig) textBig.removeAttribute("style");
      if (textSmall) textSmall.style.display = "none";
      renderMobileEditor(clips, section);
    } else if (reducedMotion) {
      section.classList.add("stage-static");
      stageAt(1);
      window.addEventListener("resize", () => stageAt(1));
    } else {
      window.addEventListener("scroll", onStageScroll, { passive: true });
      window.addEventListener("resize", onStageScroll);
      onStageScroll();
    }
  }

  // --- program timecode (23.976-flavoured, starts at 01:00:00:00) ---
  const tcEl = $("#mon-tc");
  if (tcEl) {
    const t0 = performance.now();
    const pad = n => String(n).padStart(2, "0");
    setInterval(() => {
      const f = Math.floor((performance.now() - t0) / 1000 * 24);
      tcEl.textContent = `01:${pad(Math.floor(f / 1440) % 60)}:${pad(Math.floor(f / 24) % 60)}:${pad(f % 24)}`;
    }, 42);
  }

  // preload poster frames so loading feels instant
  clips.forEach(c => { const src = c.poster || ytThumb(c.video); if (src) { const im = new Image(); im.src = src; } });
  function posterSrc(c) { return c.poster || ytThumb(c.video); }

  const clipEls = [...host.querySelectorAll(".tl-clip")];
  const findEl = c => clipEls.find(x => byIdx[x.dataset.i] === c);

  // projects with a videos[] array (Commercial, Real Estate, ...) expand into
  // individual spots in their bin, rather than showing as a single timeline clip
  const spotProjects = PROJECTS.filter(p => p.videos && p.videos.length);
  const spotClipBySlug = new Map(spotProjects.map(p => [p.slug, clips.find(c => c.slug === p.slug)]));

  // autoplay toggle — when off, clicking a clip loads its poster + a play button
  const apToggle = $("#autoplay-toggle");
  const autoplayOn = () => apToggle ? apToggle.getAttribute("aria-checked") === "true" : true;
  if (apToggle) apToggle.addEventListener("click", () =>
    apToggle.setAttribute("aria-checked", String(!autoplayOn())));

  // hover: highlight + readout only — never touches what's loaded in the monitor
  function scrubTo(c, clipEl) {
    host.querySelectorAll(".tl-clip.hov").forEach(x => x.classList.remove("hov"));
    if (clipEl) clipEl.classList.add("hov");
    readTitle.textContent = c.title;
    readDetail.textContent = c.detail + (c.page ? " · OPENS A PAGE" : c.video ? (autoplayOn() ? " · CLICK TO PLAY" : " · CLICK TO LOAD") : "");
  }

  // core: put a spec {title, detail, video, poster, href, page} into the monitor
  function showMonitor(spec, clipEl) {
    if (spec.page) { location.href = DEPTH + spec.page; return; }
    if (heroMode) {
      heroMode = false;
      clearInterval(heroTimer);
      if (overlay) overlay.classList.add("gone");
    }
    host.querySelectorAll(".tl-clip.lit").forEach(x => x.classList.remove("lit"));
    if (clipEl) { clipEl.classList.add("lit"); playhead.style.left = clipEl.dataset.mid + "%"; }
    readTitle.textContent = spec.title;
    readDetail.textContent = spec.detail;
    if (openLink) {
      if (spec.href) { openLink.style.display = ""; openLink.href = spec.href; }
      else openLink.style.display = "none";
    }
    const poster = spec.poster || ytThumb(spec.video);
    if (spec.video) {
      if (autoplayOn()) {
        loadVideoInto(screen, spec.video, poster, true);
      } else {
        screen.innerHTML = `<img src="${poster}" alt="${esc(spec.title)}"><button class="mon-play" aria-label="Play ${esc(spec.title)}">▶&#xFE0E;</button>`;
        const play = () => loadVideoInto(screen, spec.video, poster, true);
        screen.querySelector(".mon-play").addEventListener("click", play);
        screen.querySelector("img").addEventListener("click", play);
      }
    } else if (poster) {
      screen.innerHTML = `<img src="${poster}" alt="${esc(spec.title)}">`;
    }
  }

  function highlightBin(sel) {
    const bx = document.getElementById("bins");
    if (!bx) return;
    bx.querySelectorAll(".bin-item.on").forEach(b => b.classList.remove("on"));
    const item = bx.querySelector(sel);
    if (item) {
      item.classList.add("on");
      const g = item.closest(".bin-group");
      if (g) g.classList.add("open");
      const sub = item.closest(".bin-subgroup");
      if (sub) sub.classList.add("open");
      item.scrollIntoView({ block: "nearest" });
    }
  }

  // a timeline clip / regular bin item
  function loadClip(c, clipEl) {
    showMonitor({ title: c.title, detail: c.detail, video: c.video, poster: c.poster, href: c.href, page: c.page }, clipEl);
    if (!c.page) highlightBin(`.bin-item[data-ci="${clips.indexOf(c)}"]`);
  }

  // a spot from a videos[]-bearing project (no timeline clip of its own; lights that project's clip)
  function loadSpot(proj, i) {
    const clip = spotClipBySlug.get(proj.slug);
    const s = proj.videos[i];
    showMonitor({ title: s.title, detail: `${TYPE_LABELS[proj.type]} · ${proj.role}`, video: s.url,
      href: clip ? clip.href : null }, findEl(clip));
    highlightBin(`.bin-item[data-spot="${proj.slug}:${i}"]`);
  }

  host.querySelectorAll(".tl-clip").forEach(el => {
    const c = byIdx[el.dataset.i];
    const proj = c.slug && spotClipBySlug.has(c.slug) ? PROJECTS.find(p => p.slug === c.slug) : null;
    el.addEventListener("mouseenter", () => scrubTo(c, el));
    el.addEventListener("focus", () => scrubTo(c, el));
    el.addEventListener("click", () => proj ? loadSpot(proj, 0) : loadClip(c, el));
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); proj ? loadSpot(proj, 0) : loadClip(c, el); } });
  });

  // ---- bins ----
  const bins = $("#bins");
  if (bins) {
    const groups = [
      { key: "feature", label: "Features" }, { key: "series", label: "Series" },
      { key: "short", label: "Shorts" }, { key: "commercial", label: "Commercial" },
      { key: "realestate", label: "Real Estate" }, { key: "teaching", label: "Teaching" }
    ];

    bins.innerHTML = `<p class="bins-head">BINS · CLICK TO OPEN</p><div class="bins-list">` + groups.map(g => {
      // a videos[]-bearing project expands to every individual spot, not a single project clip;
      // spots with a `group` field nest into client/campaign sub-bins
      const sp = spotProjects.find(p => p.type === g.key);
      if (sp) {
        if (!sp.videos.length) return "";
        const buckets = groupVideos(sp.videos);
        const spotBtn = (s, i) => `<button class="bin-item" data-spot="${sp.slug}:${i}"><span class="bin-dot">◆</span><span class="bin-title">${esc(s.title)}</span></button>`;
        const bodyHtml = buckets.length > 1
          ? buckets.map(b => `<div class="bin-subgroup" data-sub="${esc(b.key || "Other")}">
              <button class="bin-subheader"><span class="bin-subicon">▸</span><span class="bin-sublabel">${esc(b.key || "Other")}</span><span class="bin-count">${b.items.length}</span></button>
              <div class="bin-subitems">${b.items.map(([s, i]) => spotBtn(s, i)).join("")}</div>
            </div>`).join("")
          : sp.videos.map((s, i) => spotBtn(s, i)).join("");
        return `<div class="bin-group" data-bin="${g.key}">
          <button class="bin-header"><span class="bin-icon">▸</span><span class="bin-label">${g.label}</span><span class="bin-count">${sp.videos.length}</span></button>
          <div class="bin-items">${bodyHtml}</div>
        </div>`;
      }
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
    bins.querySelectorAll(".bin-subheader").forEach(h => {
      h.addEventListener("click", e => { e.stopPropagation(); h.parentElement.classList.toggle("open"); });
    });
    bins.querySelectorAll(".bin-item").forEach(it => {
      it.addEventListener("click", () => {
        if (it.dataset.spot !== undefined) {
          const [slug, i] = it.dataset.spot.split(":");
          loadSpot(PROJECTS.find(p => p.slug === slug), +i);
        }
        else loadClip(clips[+it.dataset.ci], findEl(clips[+it.dataset.ci]));
      });
    });
  }

  // ---- timeline zoom: horizontal stretches the ruler, vertical grows the
  //      tracks (taller tracks reveal clip thumbnails) ----
  const scroller = $("#tl-scroll");
  const VZ = [{ h: 18, fs: 8.5 }, { h: 24, fs: 9.5 }, { h: 40, fs: 10 }, { h: 56, fs: 11 }];
  let zh = 1, vz = 1;
  function applyZoom() {
    host.style.width = (zh * 100) + "%";
    host.style.setProperty("--trackh", VZ[vz].h + "px");
    host.style.setProperty("--clipfs", VZ[vz].fs + "px");
    host.dataset.vz = vz;
  }
  applyZoom();
  const zoomBtn = (id, fn) => { const b = document.getElementById(id); if (b) b.addEventListener("click", fn); };
  zoomBtn("tlz-hplus", () => { zh = Math.min(zh * 1.5, 5.1); applyZoom(); });
  zoomBtn("tlz-hminus", () => { zh = Math.max(zh / 1.5, 1); applyZoom(); });
  zoomBtn("tlz-vplus", () => { vz = Math.min(vz + 1, VZ.length - 1); applyZoom(); });
  zoomBtn("tlz-vminus", () => { vz = Math.max(vz - 1, 0); applyZoom(); });
  zoomBtn("tlz-fit", () => {
    zh = 1; vz = 1; applyZoom();
    if (scroller) { scroller.scrollLeft = 0; scroller.scrollTop = 0; }
  });

  // ---- draggable playhead: grab it, or scrub anywhere on the year ruler ----
  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  function movePlayhead(clientX) {
    userScrubbed = true;
    const r = host.getBoundingClientRect();
    const pct = clamp01((clientX - r.left) / r.width) * 100;
    playhead.style.left = pct + "%";
    const yr = TL_Y0 + (pct / 100) * (TL_Y1 - TL_Y0);
    readTitle.textContent = `Playhead — ${MONTHS[Math.min(11, Math.floor((yr % 1) * 12))]} ${Math.floor(yr)}`;
    const under = [];
    clipEls.forEach(el => {
      const c = byIdx[el.dataset.i];
      const hit = c.start <= yr && yr <= c.end;
      el.classList.toggle("hov", hit);
      if (hit) under.push(c.title);
    });
    readDetail.textContent = under.length ? "Under the playhead: " + under.join(" · ") : "Nothing on the timeline here — keep scrubbing";
  }
  let phDrag = false;
  function startPH(e) {
    phDrag = true;
    playhead.style.transition = "none";
    e.preventDefault();
    movePlayhead(e.clientX);
  }
  playhead.classList.add("grabbable");
  playhead.addEventListener("pointerdown", startPH);
  host.querySelectorAll(".tl-years, .tl-ticks").forEach(el => el.addEventListener("pointerdown", startPH));
  window.addEventListener("pointermove", e => { if (phDrag) movePlayhead(e.clientX); });
  window.addEventListener("pointerup", () => { phDrag = false; playhead.style.transition = ""; });
}

// ---------- mobile "Rush" editor: vertical scroll-scrub timeline ----------
const RUSH_ICONS = {
  all: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1"/><rect x="11" y="2.5" width="6.5" height="6.5" rx="1"/><rect x="2.5" y="11" width="6.5" height="6.5" rx="1"/><rect x="11" y="11" width="6.5" height="6.5" rx="1"/></svg>`,
  feature: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M2.5 7l1.3-3.5h12.4L17.5 7"/><rect x="2.5" y="7" width="15" height="10.5" rx="1"/><path d="M2.5 7l2.6-3.5M8.3 7l2.6-3.5M14.1 7l2.6-3.5"/></svg>`,
  series: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M10 2.5l7.5 4L10 10.5l-7.5-4 7.5-4z"/><path d="M2.5 10.5l7.5 4 7.5-4"/><path d="M2.5 14l7.5 4 7.5-4"/></svg>`,
  short: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="5" cy="5" r="2.4"/><circle cx="5" cy="15" r="2.4"/><path d="M16.5 3.5L7 10M16.5 16.5L7 10"/></svg>`,
  commercial: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8.3v3.4h3.3l5 3.3V5l-5 3.3H2.5z"/><path d="M14 7.3a3.2 3.2 0 010 5.4"/></svg>`,
  realestate: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 9.5L10 3l7.5 6.5"/><path d="M4.5 8v8h11V8"/></svg>`
};
const RUSH_PLAY = `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M6 4l10 6-10 6V4z"/></svg>`;
const RUSH_PAUSE = `<svg viewBox="0 0 20 20" fill="currentColor"><rect x="5" y="4" width="3.4" height="12"/><rect x="11.6" y="4" width="3.4" height="12"/></svg>`;
const RUSH_SKIPBACK = `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M16 4.5L7 10l9 5.5v-11z"/><rect x="4" y="4.5" width="2" height="11"/></svg>`;
const RUSH_SKIPFWD = `<svg viewBox="0 0 20 20" fill="currentColor"><path d="M4 4.5L13 10l-9 5.5v-11z"/><rect x="14" y="4.5" width="2" height="11"/></svg>`;
const RUSH_BIGGER = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="2" y="3" width="16" height="14" rx="1.5"/></svg>`;
const RUSH_SMALLER = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="5" y="7.5" width="10" height="5" rx="1"/></svg>`;
const RUSH_CHEVRON = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8l5 5 5-5"/></svg>`;
const RUSH_TABS = [
  { key: "all", label: "All" }, { key: "feature", label: "Features" },
  { key: "series", label: "Series" }, { key: "short", label: "Shorts" },
  { key: "commercial", label: "Commercial" }, { key: "realestate", label: "Real Estate" }
];

// Builds the mobile-only Rush-style mini-editor (sticky chrome + a vertical
// scroll-scrub timeline of poster cards) and appends it into `section`.
// Desktop is untouched — this only ever runs from the isMobileStage branch.
function renderMobileEditor(clips, section) {
  const sorted = [...clips].filter(c => c.title).sort((a, b) => b.start - a.start);
  if (!sorted.length) return;

  const posterFor = c => c.poster || ytThumb(c.video);
  const awardFor = c => c.slug ? (PROJECTS.find(p => p.slug === c.slug) || {}).award : null;

  const cardsHtml = sorted.map((c, i) => {
    const poster = posterFor(c), award = awardFor(c), yr = Math.round(c.start);
    const media = poster
      ? `<img src="${poster}" alt="Still from ${esc(c.title)}" loading="lazy">`
      : `<div class="rt-noposter">${esc((c.type || "").toUpperCase())}</div>`;
    return `<div class="rt-card" data-i="${i}" data-type="${c.type}">
      <span class="rt-yr">${yr}</span><span class="rt-dot"></span>
      <div class="rt-media">
        ${media}
        ${award ? `<span class="rt-tag">${esc(award)}</span>` : ""}
        <span class="rt-now">▶ now in the monitor</span>
        ${c.video ? `<button class="rt-play" aria-label="Play trailer for ${esc(c.title)}">${RUSH_PLAY}</button>` : ""}
      </div>
      <div class="rt-meta"><h3>${esc(c.title)}<span class="rt-now-text">▶ now in the monitor</span></h3><p>${esc(c.detail)}</p></div>
    </div>`;
  }).join("");

  const html = `
  <div class="rush-mobile" id="rush-mobile">
    <div class="rush-sticky" id="rush-sticky">
      <div class="rush-appbar">
        <a class="rush-back" href="${DEPTH}work.html">‹ Work</a>
        <span class="rush-brand">PRANAY NICHANI</span>
        <div class="rush-appbar-actions">
          <button class="rush-skip" id="rush-skip" aria-label="Skip past the timeline to Selected work" title="Skip to Selected work">${RUSH_CHEVRON}</button>
          <a class="rush-share" href="#contact" aria-label="Contact">⤴</a>
        </div>
      </div>
      <div class="rush-program"><span class="rush-program-tag">● PROGRAM</span><div class="rush-screen" id="rush-screen"></div></div>
      <div class="rush-readout">
        <div class="rush-readout-text"><h3 id="rush-title"></h3><p id="rush-detail"></p></div>
        <a class="rush-open" id="rush-open" href="#">OPEN PROJECT →</a>
      </div>
      <div class="rush-transport">
        <button id="rush-back-btn" aria-label="Previous clip">${RUSH_SKIPBACK}</button>
        <button id="rush-play-btn" aria-label="Play or pause">${RUSH_PLAY}</button>
        <button id="rush-fwd-btn" aria-label="Next clip">${RUSH_SKIPFWD}</button>
        <button id="rt-size-bigger" class="rush-size-btn" title="Bigger cards" aria-label="Bigger cards">${RUSH_BIGGER}</button>
        <button id="rt-size-smaller" class="rush-size-btn" title="Smaller cards" aria-label="Smaller cards">${RUSH_SMALLER}</button>
        <span class="rush-tc" id="rush-tc">01:00:00:00</span>
      </div>
      <div class="rush-toolbar" id="rush-toolbar">
        ${RUSH_TABS.map(t => `<button class="rush-tab${t.key === "all" ? " on" : ""}" data-filter="${t.key}">${RUSH_ICONS[t.key]}<span>${t.label}</span></button>`).join("")}
      </div>
    </div>
    <div class="rush-timeline" id="rush-timeline"><div class="rt-rail"></div>${cardsHtml}</div>
  </div>`;

  section.insertAdjacentHTML("beforeend", html);

  // ---- wiring ----
  const screen = $("#rush-screen"), titleEl = $("#rush-title"), detailEl = $("#rush-detail");
  const tcEl = $("#rush-tc"), playBtn = $("#rush-play-btn"), openBtn = $("#rush-open");
  const stickyEl = $("#rush-sticky");
  const cardEls = [...document.querySelectorAll(".rt-card")];
  let activeIndex = -1, currentPlayer = null;

  const pad = n => String(n).padStart(2, "0");
  const setTC = i => { tcEl.textContent = `01:00:${pad(i % 60)}:${pad((i * 7) % 24)}`; };

  function showPoster(c) {
    const poster = posterFor(c);
    screen.innerHTML = poster ? `<img src="${poster}" alt="${esc(c.title)}">` : `<div class="mon-empty">No preview</div>`;
    currentPlayer = null;
    playBtn.innerHTML = RUSH_PLAY;
    playBtn.setAttribute("aria-label", c.video ? "Play trailer" : "No trailer available");
  }

  function playTrailer(c) {
    if (!c.video) return;
    loadVideoInto(screen, c.video, posterFor(c), true).then(player => {
      currentPlayer = player;
      playBtn.innerHTML = RUSH_PAUSE;
      playBtn.setAttribute("aria-label", "Pause trailer");
    });
  }

  function setActive(i) {
    if (i === activeIndex || i < 0 || i >= sorted.length) return;
    activeIndex = i;
    const c = sorted[i], award = awardFor(c);
    cardEls.forEach(el => el.classList.toggle("active", +el.dataset.i === i));
    titleEl.textContent = c.title;
    detailEl.textContent = c.detail + (award ? " · " + award : "") + (c.page ? " · OPENS A PAGE" : "");
    setTC(i);
    showPoster(c);
    // OPEN PROJECT → jumps to this film's project page (or the extra's page);
    // hidden for entries with no destination of their own
    const dest = c.href || (c.page ? DEPTH + c.page : null);
    if (dest) { openBtn.style.display = ""; openBtn.href = dest; }
    else openBtn.style.display = "none";
  }

  // tap the PROGRAM preview to play the active clip's trailer
  screen.addEventListener("click", () => {
    if (activeIndex < 0 || currentPlayer) return;
    playTrailer(sorted[activeIndex]);
  });

  // cards: tap to select (loads it into the PROGRAM monitor). Page-links
  // navigate; tapping the already-selected card (or its play button) plays it.
  cardEls.forEach(el => {
    const i = +el.dataset.i, c = sorted[i];
    el.addEventListener("click", e => {
      if (c.page) { location.href = DEPTH + c.page; return; }
      if (e.target.closest(".rt-play")) { setActive(i); playTrailer(c); return; }
      if (i === activeIndex) playTrailer(c);
      else setActive(i);
    });
  });

  // transport: real play/pause + real prev/next (scrolls to the neighbouring card)
  playBtn.addEventListener("click", () => {
    if (activeIndex < 0) return;
    const c = sorted[activeIndex];
    if (!currentPlayer) { playTrailer(c); return; }
    if (currentPlayer.getPlayerState && currentPlayer.getPlayerState() === 1) {
      currentPlayer.pauseVideo(); playBtn.innerHTML = RUSH_PLAY; playBtn.setAttribute("aria-label", "Play trailer");
    } else {
      currentPlayer.playVideo(); playBtn.innerHTML = RUSH_PAUSE; playBtn.setAttribute("aria-label", "Pause trailer");
    }
  });
  $("#rush-back-btn").addEventListener("click", () => {
    const target = cardEls.slice(0, activeIndex).reverse().find(el => el.style.display !== "none");
    if (target) { setActive(+target.dataset.i); target.scrollIntoView({ behavior: "smooth", block: "center" }); }
  });
  $("#rush-fwd-btn").addEventListener("click", () => {
    const target = cardEls.slice(activeIndex + 1).find(el => el.style.display !== "none");
    if (target) { setActive(+target.dataset.i); target.scrollIntoView({ behavior: "smooth", block: "center" }); }
  });

  // bottom tool-bar: filter the vertical timeline by category
  const tabs = [...document.querySelectorAll(".rush-tab")];
  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(b => b.classList.remove("on"));
      btn.classList.add("on");
      const f = btn.dataset.filter;
      cardEls.forEach(el => { el.style.display = (f === "all" || el.dataset.type === f) ? "" : "none"; });
      const activeEl = cardEls[activeIndex];
      if (activeEl && activeEl.style.display === "none") {
        const next = cardEls.find(el => el.style.display !== "none");
        if (next) { setActive(+next.dataset.i); next.scrollIntoView({ behavior: "smooth", block: "center" }); }
      }
    });
  });

  // card size: a live "Bigger / Smaller" stepper over the poster aspect-ratio,
  // remembered between visits via localStorage. The last (default) step drops
  // the poster entirely for a plain-text list, like the desktop mini-timeline.
  const RT_SIZES = ["16/8.5", "16/7", "16/5.5", "16/4.4", "text"];
  const timelineEl = $("#rush-timeline");
  let rtSizeIdx = parseInt(localStorage.getItem("rushCardSize"), 10);
  if (isNaN(rtSizeIdx) || rtSizeIdx < 0 || rtSizeIdx >= RT_SIZES.length) rtSizeIdx = RT_SIZES.length - 1;
  function applyCardSize() {
    const val = RT_SIZES[rtSizeIdx];
    const textMode = val === "text";
    timelineEl.classList.toggle("rt-text", textMode);
    if (!textMode) document.documentElement.style.setProperty("--rt-ar", val);
    localStorage.setItem("rushCardSize", rtSizeIdx);
  }
  $("#rt-size-bigger").addEventListener("click", () => { rtSizeIdx = Math.max(0, rtSizeIdx - 1); applyCardSize(); });
  $("#rt-size-smaller").addEventListener("click", () => { rtSizeIdx = Math.min(RT_SIZES.length - 1, rtSizeIdx + 1); applyCardSize(); });

  // Selection is tap-driven only — scrolling the timeline never changes what's
  // loaded in the monitor. Keep the sticky editor pinned just under the header.
  function syncStickyTop() {
    stickyEl.style.top = document.querySelector("header.site").offsetHeight + "px";
  }
  syncStickyTop();
  window.addEventListener("resize", syncStickyTop);

  // The monitor is not a scroll trap: a swipe/scroll starting on it scrolls the
  // page normally (following the finger) like any other content, so you stay in
  // control of the pace instead of being flung to the next section.

  // deliberate "skip past the timeline" chevron in the app bar
  $("#rush-skip").addEventListener("click", () => {
    const next = document.getElementById("selected-work");
    if (!next) return;
    const headerH = document.querySelector("header.site").offsetHeight;
    const y = next.getBoundingClientRect().top + window.scrollY - headerH - 8;
    window.scrollTo({ top: y, behavior: "smooth" });
  });

  applyCardSize();
  setActive(0);
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

  const clipThumb = v => `<button class="clip-thumb" data-url="${esc(v.url)}" data-poster="${ytThumb(v.url)}" title="${esc(v.title)}">
    <img src="${ytThumb(v.url)}" alt="" loading="lazy"><span>${esc(v.title)}</span></button>`;
  const videoBuckets = p.videos ? groupVideos(p.videos) : [];
  const videosHtml = p.videos ? `
    <p class="clip-bin-head">SELECTED SPOTS — CLICK TO PLAY</p>
    ${videoBuckets.length > 1
      ? videoBuckets.map(b => `<p class="clip-bin-subhead">${esc(b.key || "OTHER")}</p>
          <div class="clip-bin">${b.items.map(([v]) => clipThumb(v)).join("")}</div>`).join("")
      : `<div class="clip-bin">${p.videos.map(clipThumb).join("")}</div>`}` : "";

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

// ---------- header: hamburger nav (mobile) ----------
function wireNavToggle() {
  const btn = $("#nav-toggle"), header = document.querySelector("header.site");
  if (!btn || !header) return;
  btn.addEventListener("click", () => {
    const open = header.classList.toggle("nav-open");
    btn.setAttribute("aria-expanded", String(open));
  });
  header.querySelectorAll("nav.main a").forEach(a => a.addEventListener("click", () => {
    header.classList.remove("nav-open");
    btn.setAttribute("aria-expanded", "false");
  }));
}

renderFeatured();
renderTimeline();
renderArchive();
renderProject();
watchReveals();
wireNavToggle();
