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

✅ Done: Commercial was split into "Commercial" + "Real Estate" (slugs `commercial-work` /
`real-estate-work`), with the spot-expansion/sub-bin logic generalized to work off any
`videos[]`-bearing project (see `groupVideos()` in main.js) rather than being hard-coded.

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

- This is a git repo, **pushed to GitHub at `pranaynichani/pranaynichani.com` (private)**. `gh` CLI
  is installed and authenticated as `pranaynichani`. **Commit after each working, verified change**
  (Pranay has been asking for commits throughout; if unsure, commit — it's all recoverable). End
  commit messages with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- `website/` (the old Adobe Portfolio export) was **permanently removed** from both git history and
  disk on 2026-07-07 via `git filter-repo` (it was 728MB of old video files blocking the first
  GitHub push). Pranay confirmed he has a separate backup. Don't reference it as if it still exists.
- `docs/MOBILE-RUSH-BUILD-BRIEF.md` = the spec the mobile editor was built from (kept for reference).
  `README.md` = a shorter human-facing overview.
- No build step, no framework, no dependencies — plain HTML/CSS/JS. Just edit and reload.

---

## Deployment — LIVE on Netlify (as of 2026-07-08)

- **Live at `https://pranaynichani.com`**, hosted on **Netlify** (site name `pranaynichani-com`,
  site_id `3207a742-e256-4af3-a38f-b9f5e3955332`, also reachable at `pranaynichani-com.netlify.app`).
  Netlify CLI is installed and authenticated (`netlify status` to check).
- **Continuous deployment is live**: every push to `main` on GitHub auto-deploys. `netlify.toml` at
  repo root sets `publish = "site"`, `command = ""` (no build step), `functions = "netlify/functions"`.
- **DNS**: the domain is *not* on Netlify DNS or Cloudflare — it's still registered at
  **Network Solutions** (via Wix as reseller; Wix bills for it but its own DNS panel won't let you
  edit NS records, and "connect to external site" requires a paid Wix plan). Instead, DNS records
  were edited directly in **Wix's "Manage DNS Records" panel** (Domains → DNS Records in the Wix
  dashboard): apex `pranaynichani.com` → **A record → `75.2.60.5`** (Netlify's load balancer IP),
  `www` → **CNAME → `pranaynichani-com.netlify.app`**. This works without moving nameservers because
  Netlify auto-issues SSL for any domain pointed at it this way.
- **Domain transfer in progress, currently blocked.** Plan was Wix → Namecheap (intermediate stop,
  since Wix won't release nameservers pre-transfer and Cloudflare Registrar requires a domain
  already on Cloudflare nameservers before it'll accept a transfer) → optionally Cloudflare Registrar
  later for at-cost pricing. Pranay accidentally triggered ICANN's mandatory **60-day transfer lock**
  by editing the domain's contact info while looking for the privacy toggle (~2026-07-08); lock
  clears **~2026-09-05**, or sooner if Wix support agrees to waive it. **This does not block anything
  live** — DNS/hosting works independently of who the registrar is.
- **Cloudflare is a dormant leftover, not in use.** Early in the deploy process a Cloudflare
  Workers-based static-asset deploy was set up (Worker name `pranay-portfolio-website`, zone
  `pranaynichani.com` added but never activated since nameservers never moved there) before pivoting
  to Netlify — Wix's domain-panel limitations made the Cloudflare path require either a paid Wix plan
  or the now-blocked registrar transfer, while Netlify's plain CNAME/A-record custom-domain support
  needed neither. `wrangler.jsonc` still sits at repo root from that abandoned attempt; it's inert
  and safe to ignore (or delete) unless hosting ever migrates back to Cloudflare.

## Content editing — Decap CMS (as of 2026-07-08)

Pranay can self-edit the About page and blog posts at **`pranaynichani.com/admin`** (GitHub login),
no code required. Two collections:

- **About Page** → edits `site/content/about.json` (heading, lede, body paragraphs, honours, tools,
  education). Rendered by `renderAbout()` in main.js into `about.html`'s `#about-main` /
  `#about-honors` / `#about-tools` / `#about-education` containers.
- **Blog Posts** → edits `site/content/blog.json` (a `posts[]` array: slug, title, date, teaser, plus
  either `blocks[]` **or** `customFile`). Rendered by `renderBlogIndex()` (the Notes list page) and
  `renderBlogPost()` (`site/blog/post.html?s=<slug>`, replaces the old one-file-per-post approach).
  - `blocks[]`: ordered list of `{ type: "paragraph" | "heading" | "html", text }`. `html` inserts
    `text` as-is (no wrapping `<p>`/`<h2>`) — for pasting a raw snippet inline.
  - `customFile`: for a fully custom-designed post (its own complete HTML/CSS, not shared-template
    prose — **this is what Pranay mostly wants to publish going forward**). When set, the post links
    straight to the uploaded standalone file instead of routing through `post.html` at all.

**Fixed 2026-07-08 — `customFile` upload was silently failing.** Root cause: the field's
`media_folder` was set to `/assets/posts` (leading slash, no `site/` prefix) instead of
`site/assets/posts`, inconsistent with the working top-level convention (`media_folder:
"site/assets/stills"` — repo-root-relative, no leading slash; `public_folder` is the one that
gets the leading slash, since that's a URL path not a repo path). The malformed path made
Decap's commit target invalid, so the upload silently failed while the field still *showed* a
value and the post metadata still saved fine. Not a Decap bug — a config mistake. Fixed in
`site/admin/config.yml`; not yet re-tested end-to-end by Pranay as of this writing, so verify a
fresh upload actually commits before assuming it's fully resolved. Separately: images uploaded
via Decap's general Media Library (not tied to the `customFile` field) land in
`site/assets/stills/` (the global `media_folder`), not `site/assets/posts/` — when writing a
custom post's `<img src>` paths, either account for that (`../stills/<filename>.png` relative
from `site/assets/posts/`) or have Pranay use the field's own upload picker for images used
inside that specific post so they land alongside it.
- **Auth**: GitHub OAuth App (owned by Pranay's GitHub account, callback URL
  `https://pranaynichani.com/api/callback`) + `netlify/functions/auth.js` and `callback.js`
  implementing the OAuth handshake Decap needs (Netlify's old Identity/Git Gateway shortcut is
  deprecated as of Feb 2025, so this manual-function approach is the current supported pattern).
  Client ID/secret live as Netlify env vars `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET`
  (secret is Production-context-only — free tier doesn't allow "same value everywhere" for
  secret-flagged vars). Never print these via `netlify api getSiteEnvVars` or similar — that returns
  values in plaintext.
