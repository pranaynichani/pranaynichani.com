# pranaynichani.com — working guide for Claude

You are helping **Pranay Nichani** — a Toronto-based documentary **post-production specialist /
editor** — build and maintain his portfolio site. This file is auto-loaded when a chat is pointed
at this folder. Read it, then continue the work.

**Pranay is not a coder.** Explain what you're doing in plain English, make the reasonable call
instead of asking him to make technical decisions, and *verify changes yourself* (don't ask him to
check). He is colorblind — use colorblind-safe colors (Okabe-Ito) and never rely on hue alone.

---

## The one rule: all content lives in `site/js/data.js`

Every project, trailer, role, award, and category is defined in **`site/js/data.js`**. Every page
(home, work, project pages, the desktop timeline, the mobile editor) reads from it. To change what's
*on* the site, you almost always edit this one file — not the HTML.

- `PROJECTS[]` — one object per project. Fields documented at the top of the file:
  `slug, title, year, start/end (timeline span), img (still's extension), type (category), role,
  credit, desc, award, laurels, trailer (YouTube URL or null), featured (shows in Selected Work),
  videos[] (extra clips, used by Commercial)`.
- `TIMELINE_EXTRAS[]` — non-project timeline clips (Teaching → links to a page via `page:`;
  Transfer → has a `video:`).
- `TYPE_LABELS{}` — display names for each category `type`.

### Common edits (recipes)

- **Add / change a trailer:** set `trailer: "https://youtu.be/XXXX"` on that project. Any
  YouTube `watch?v=` or `youtu.be/` URL works. A player appears automatically on its project page
  and it becomes playable in the timeline monitor.
- **Add spots to the Commercial reel:** add `{ title, url }` entries to the `videos[]` array on the
  `commercial-work` project.
- **Add a new project:** copy an existing `PROJECTS` block, fill in the fields, pick a unique
  `slug`, and drop a 16:9 still at `site/assets/stills/<slug>.<ext>` (set `img` to that extension).
  Stills for existing films came from the old site; for new ones, ask Pranay for an image or pull a
  frame from the trailer.
- **Feature a project on the homepage:** set `featured: true` (currently 6 are featured).
- **Write a blog post:** duplicate `site/blog/posts/tools-and-story.html`, edit the prose, and add
  one `<a class="post-item">` entry to `site/blog/index.html`.

---

## Categories (`type`) — read this before splitting/adding one

A project's `type` drives the bins, filters, and mobile tabs. Current types:
`feature · series · short · commercial · teaching`. **A category is referenced in several places**
— miss one and the UI goes inconsistent. To add or rename a category, update ALL of:

1. `site/js/data.js` — the `type` on each affected project **and** `TYPE_LABELS`.
2. `site/js/main.js` — the `groups` array (desktop bins, in `renderTimeline`), the `RUSH_TABS`
   array (mobile tabs), and `RUSH_ICONS` (add an inline-SVG icon for the new category).
3. `site/work.html` — the `data-filter` buttons in the `.filters` row.

⚠️ **The "Commercial" category is special.** All commercial spots live inside the single
`commercial-work` project as a `videos[]` array, and there's dedicated logic keyed on
`type === "commercial"` / slug `commercial-work` (`commClip`, `commProj`, `loadSpot`, and the
`g.key === "commercial"` branch in the bins). It expands to show every spot.

**Pranay's next task = split Commercial into "Commercial" + "Real estate commercials."** The
real-estate spots are the **Scout Condos** ones (TreMari Bakery, People's Pint, Hounslow's House);
the rest are automotive/brand (Chevrolet, GMC). Recommended approach: create a second project
(e.g. `real-estate-work`, `type: "realestate"`) with its own `videos[]` and still, move the three
Scout Condos spots into it, and **generalize the spot-expansion logic** so it works for any
`videos[]`-bearing project rather than being hard-coded to `commercial-work`. Then register
`realestate` in the three places above. Verify the desktop bins, the work-page filter, and the
mobile tabs all show both categories and play the right spots.

---

## Architecture (so you don't break the wow)

- **Desktop homepage = a scroll-docking "edit suite."** The full-screen hero docks into a program
  monitor as bins + a scrubbable timeline + a draggable playhead assemble around it. All built in
  `renderTimeline()` in `site/js/main.js`. Timecode, an A1 waveform track, zoom controls, and NLE
  styling are intentional flourishes.
- **Mobile homepage = a "Premiere Rush"-style mini-editor** (`renderMobileEditor()` in main.js): a
  sticky editor chrome (preview, transport, tool-bar tabs) over a **vertical** scroll-scrub timeline
  of big poster cards. It only runs in the `isMobileStage` branch of `renderTimeline` (≤860px).
  **Keep desktop and mobile paths separate — don't let a mobile change touch the desktop dock.**
- **Project pages** (`project.html?p=<slug>`) and **work / about / teaching / blog** pages are thin
  HTML shells; content is injected from `data.js` by `main.js`. Shared header/footer are copied
  across pages (there's a hamburger `nav-toggle` for mobile) — keep them in sync when editing nav.
- Styling is one file: `site/css/style.css`. Accent gold is `--accent` (#d9a441) on a near-black
  theme.

---

## Preview & verify (do this every change — don't hand it to Pranay)

1. **Start the server with the preview tool**: `preview_start` (config name `portfolio-site`, port
   8090). **Never** run a background `python -m http.server` on 8090 — it squats the port and blocks
   the preview tool. If 8090 is stuck, `lsof -ti :8090 | xargs kill` then `preview_start`.
2. **Test in REAL Chrome, not the preview panel.** The preview panel caches JS aggressively and
   will show stale code. Use the claude-in-chrome MCP: navigate to `http://localhost:8090`, and
   **hard-reload with `cmd+shift+r`** after every edit. For mobile, `resize_window` to ~390×840
   first.
3. **YouTube "Error 153" is not a bug** — it means the referrer is missing, which happens in the
   preview panel or via `file://`. Videos play fine over `http://localhost:8090` in real Chrome
   (and will play in production). Don't chase it.
4. Check `read_console_messages` for errors. Then **commit** (see below).

### Let Pranay preview on his phone
Run a LAN server and give him the URL: `cd site && python3 -m http.server 8095 --bind 0.0.0.0`,
then he opens `http://<mac-LAN-ip>:8095` on his phone (same WiFi). Find the IP with
`ipconfig getifaddr en0`. (This is separate from the preview tool's 8090 — different port, fine.)

---

## Conventions

- This is a git repo. **Commit after each working, verified change** (Pranay has been asking for
  commits throughout; if unsure, commit — it's all recoverable). End commit messages with:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- **Not deployed yet.** Plan is Cloudflare Pages (free) → point the `pranaynichani.com` domain at it
  → retire the old Adobe Portfolio site. Walk Pranay through deploy hands-on when he's ready.
- **`website/` (project root) is the OLD Adobe Portfolio export** — reference only. Don't edit or
  serve it. The live site is everything under `site/`.
- `docs/MOBILE-RUSH-BUILD-BRIEF.md` = the spec the mobile editor was built from (kept for reference).
  `README.md` = a shorter human-facing overview.
- No build step, no framework, no dependencies — plain HTML/CSS/JS. Just edit and reload.
