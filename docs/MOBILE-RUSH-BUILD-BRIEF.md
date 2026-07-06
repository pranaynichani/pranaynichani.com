# Build brief — mobile "Premiere Rush" homepage editor

**Status:** design locked, not built. Build this in a fresh chat.
**Repo:** `~/Documents/Claude/Projects/pranaynichani.com/` (git; commit when the user asks).
**Owner is a non-coder** — explain in plain English, verify visually, don't ask him to check things you can check yourself.

---

## What we're building & why

The desktop homepage has a signature scroll-docking "edit suite" (program monitor + bins +
scrubbable timeline + draggable playhead). That interaction is desktop-only; on phones it was
garbled, so today mobile just shows a plain full-screen hero and hides the suite. The user wants
phones to get their own "wow." We're giving mobile a **Premiere Rush–style mini-editor**.

**The locked design (a synthesis):** keep Rush's editor *chrome*, but make the timeline a
**vertical scroll-scrub of big poster cards** (NOT a horizontal filmstrip — horizontal swiping is
too fiddly at 375px). So: Rush identity + thumb-friendly vertical scrolling + big film imagery.

Approved mockup this is based on: a phone with a top app-bar, a PROGRAM preview, transport
controls, an A1 audio track, a bottom tool-bar of category filters, and (the change from the
literal Rush mock) a **vertical** timeline of large poster cards instead of a horizontal strip.

---

## The experience, top to bottom

1. **Landing = full-screen hero** (same as current mobile): the crossfading featured-film
   slideshow + name/tagline. Reuses the existing `.hero-overlay` (`#hero-overlay`, `#ho-slides`,
   `#ho-text-big`).
2. **On scroll, the hero docks** into a **sticky Rush editor** that assembles at the top —
   mirroring the desktop dock, but mobile-specific. Once docked, the editor stays pinned while the
   timeline scrolls underneath it. Rush chrome, top to bottom:
   - **App bar**: `‹ Work` · `PRANAY NICHANI` · share icon.
   - **PROGRAM preview** (16:9): shows the poster of the film currently at the playhead; a
     `● PROGRAM` tag; tap to play its trailer inline.
   - **Transport row**: skip-back · play/pause · skip-forward · running timecode
     (`01:00:14:00`). These must be REAL, not props (see interactions).
   - **A1 audio track**: a thin decorative waveform strip (reuse the desktop `.tl-audio` SVG-bars
     idea) to complete the editor look.
   - **Bottom tool-bar**: the category filters as Rush-style icon+label tabs —
     All · Features · Series · Shorts · Commercial (Tabler-style icons acceptable, or inline SVG).
3. **Below the sticky editor: the vertical timeline** — one **big poster card per film**, newest
   first, with a left rail of year markers + nodes. The card crossing the **playhead line** (just
   under the sticky preview) is the "active" clip: gold-edged, labelled "▶ now in the monitor," and
   its poster is what's showing in the PROGRAM preview. Scrolling moves the playhead through the
   films = scrubbing.
4. Everything else on the page (laurels, Selected work, thesis, panels, footer) stays as-is below.

---

## Interactions (make the editor real, not decorative)

- **Scroll = scrub.** Pick the "active" card as the one nearest the playhead line. Prefer an
  `IntersectionObserver` (rootMargin tuned so the trigger line sits just under the sticky preview)
  over a scroll handler. On active-change: swap the PROGRAM preview poster, update the readout
  (title · award · role), and the transport timecode.
- **Tap the preview (or the active card's play button) → play the trailer inline** in the preview
  via the existing `loadVideoInto(frame, url, poster, autoplay=true)`. Reuse as-is.
- **Transport buttons work:** play/pause toggles the trailer; skip-back / skip-forward scroll to
  the previous / next card (`element.scrollIntoView({behavior:"smooth"})`). This kills the
  "stage-props" risk.
- **Bottom tool-bar filters** the vertical timeline to a category (hide non-matching cards), same
  category keys as desktop bins: `feature|series|short|commercial` (+ `All`). Teaching can be a
  card that links to `teaching.html` (it has `page` set in data).
- **Tap-to-play only** — do NOT autoplay trailers on scroll (data + jank). Poster scrubs; tap plays.

---

## Reuse map (don't rebuild these)

All in `site/js/`:
- **Data** — `data.js`: `PROJECTS` (each: slug, title, year, start/end, img, type, role, credit,
  desc, award, laurels, trailer, videos, featured), `TIMELINE_EXTRAS` (Teaching has `page`,
  Transfer has `video`), `TYPE_LABELS`.
- **Clips** — `buildClips()` (main.js:97) returns the unified clip list (projects + extras) with
  `{slug,title,detail,type,start,end,href,video,poster,editor,page}`. Use it; sort by year desc.
- **YouTube** — `ytThumb(url)` (poster frame), `ytWatch(url)`, `mountYouTube(el,url,{autoplay})`
  with built-in "Watch on YouTube" fallback, and `loadVideoInto(frame,url,poster,autoplay)`
  (main.js:52,69). Error 153 = missing referrer; only works over http(s), never file:// or the
  sandboxed preview panel.
- **Stills** — `assets/stills/<slug>.<img>` (img = the project's `img` field).
- **Hero** — the full-screen landing is the existing `.hero-overlay`; the slideshow interval is
  already in `renderTimeline()`.
- **Mobile hook** — in `renderTimeline()` (main.js:185) the `isMobileStage` branch (main.js:225,
  275) currently adds `.stage-mobile` and shows the plain hero. **This is where the mobile editor
  gets wired.** Build the Rush editor DOM here (JS-generated into a mobile-only container), keep the
  desktop branch (`stageAt`/`onStageScroll`) untouched.
- **NLE styling cues** to echo: `.mon-screen`, `.mon-bar`, `.mon-tc`, `.tl-audio`, `.tl-playhead`,
  gold accent `--accent` (#d9a441). See `site/css/style.css`.

**Structure:** add a mobile-only editor block (either hidden HTML in `index.html` shown by the
`.stage-mobile` CSS, or JS-generated). Desktop (>860px) must be completely unaffected — the
existing scroll-docking suite stays exactly as it is.

---

## Verification (do this, don't hand it to the user)

1. Start the server with the preview tool (`preview_start`, config `portfolio-site`, port 8090).
   **Never** run a background `python -m http.server` — it squats port 8090 and blocks the tool.
2. **Test in real Chrome, not the preview panel** — the preview panel caches JS hard and will show
   stale code. Use the claude-in-chrome MCP: `resize_window` to ~390×840, then `cmd+shift+r`.
3. Verify: hero full-screen on load → scroll docks it into the Rush editor (sticky) → scrubbing by
   scroll swaps the PROGRAM preview → tap preview plays the trailer → transport prev/next jumps
   cards → tool-bar filters the timeline → tapping Teaching opens teaching.html.
4. Check **desktop is unchanged** (resize back to 1440, hard reload: hero still docks into the
   program monitor, bins/timeline/playhead all work).
5. No console errors (`read_console_messages`). Then commit.

---

## Known gotchas (carry these in)

- Videos need http(s) + a referrer. Error 153 in the preview panel or via file:// is expected and
  NOT a bug; test over http://localhost:8090 in real Chrome.
- Preview panel caches JS — always hard-reload in real Chrome to see changes.
- `isMobileStage` is evaluated once at load (matchMedia); switching desktop⇄mobile needs a reload.
  Acceptable.
- Keep it tap-to-play; no autoplay-on-scroll.
