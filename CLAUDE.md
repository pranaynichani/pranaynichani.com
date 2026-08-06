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

- This is a git repo, **pushed to GitHub at `pranaynichani/pranaynichani.com` (PUBLIC as of
  2026-08-06 — it's the Pages hosting source; never commit secrets)**. `gh` CLI is installed and
  authenticated as `pranaynichani`. **Commit after each working, verified change**
  (Pranay has been asking for commits throughout; if unsure, commit — it's all recoverable). End
  commit messages with: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- `website/` (the old Adobe Portfolio export) was **permanently removed** from both git history and
  disk on 2026-07-07 via `git filter-repo` (it was 728MB of old video files blocking the first
  GitHub push). Pranay confirmed he has a separate backup. Don't reference it as if it still exists.
- `docs/MOBILE-RUSH-BUILD-BRIEF.md` = the spec the mobile editor was built from (kept for reference).
  `README.md` = a shorter human-facing overview.
- No build step, no framework, no dependencies — plain HTML/CSS/JS. Just edit and reload.

---

## Deployment — LIVE on GitHub Pages (as of 2026-08-06)

- **Live at `https://pranaynichani.com`**, hosted on **GitHub Pages** from the now-**public** repo
  `pranaynichani/pranaynichani.com`. Pages serves the **`gh-pages` branch** (a copy of just the
  `site/` folder). `site/CNAME` (containing `pranaynichani.com`) binds the custom domain — never
  delete that file.
- **⚠️ DEPLOYS ARE MANUAL — pushing `main` does NOT update the live site.** After committing a
  verified change to `main`, republish with:
  `SHA=$(git subtree split --prefix site main | tail -1) && git push origin "$SHA:refs/heads/gh-pages" --force`
  Then verify live (allow ~1–2 min for Pages to rebuild). **Every site edit must end with this
  subtree push** or Pranay's live site silently stays stale.
- **Why not GitHub Actions:** the `gh` OAuth token lacks `workflow` scope — pushes containing
  `.github/workflows/*` files are rejected. Don't add workflow files unless Pranay re-auths
  `gh` with that scope.
- **DNS**: registered at Network Solutions via Wix (Wix's own DNS-records panel is editable; NS
  records are not). As of 2026-08-06 the apex has **four A records → GitHub Pages IPs**
  (`185.199.108.153`, `.109.153`, `.110.153`, `.111.153`) and `www` → **CNAME →
  `pranaynichani.github.io`**. Domain transfer to Namecheap still blocked by the 60-day ICANN lock
  (clears **~2026-09-05**); doesn't affect anything live.
- **HTTPS: fully live and enforced** (verified 2026-08-06: all pages 200 over https, http→https
  301, www→apex 301). Gotcha for the future: after a domain/DNS change, GitHub's cert provisioning
  can silently stall (`.https_certificate` stays null for an hour) — the fix is to remove and
  re-add the custom domain via `PUT /repos/.../pages` with `{"cname":null}` then
  `{"cname":"pranaynichani.com"}`, which kicks it to `approved` within seconds.
- **Netlify is RETIRED but not deleted** (site `pranaynichani-com`, was blocked by the credits
  system — the reason for this move). It may still serve stale copies to unpropagated DNS for a
  while; ignore it. `netlify.toml`, `netlify/functions/`, and `wrangler.jsonc` (Cloudflare, an even
  earlier abandoned attempt) are inert leftovers — safe to delete once the move is confirmed stable.
- **The repo is PUBLIC now** (required for free GitHub Pages; Pranay approved 2026-08-06 after a
  secrets scan came back clean). Never commit secrets, tokens, or private info — and `website/`
  (728MB local-only folder) is gitignored; keep it that way.

## SEO / findability (set up 2026-08-06)

- `site/sitemap.xml` — 29 URLs. **⚠️ REGENERATE IT whenever a project or post is added** (it lists
  every `/project.html?p=<slug>` from `data.js` plus the standalone posts), then bump `<lastmod>`.
- `site/robots.txt` — allows all crawlers (AI ones included) and points at the sitemap.
- Every static page has `rel="canonical"` + Open Graph/Twitter tags. **New pages must get them too**
  — copy the block from `work.html`.
- JSON-LD structured data: a `Person` block (with award-bearing `workExample` entries) on
  `index.html` and `about.html`; a `BlogPosting` block on each standalone post. **Give every new
  post one** — it's what makes AI answer engines cite the work correctly.
- **Search Console**: property `sc-domain:pranaynichani.com`, sitemap submitted and reading Success.
  Pranay must drive it in his logged-in Chrome (claude-in-chrome MCP) — there's no API set up yet.
  After publishing a new post, inspect its URL there and hit "Request indexing".
  ⚠️ `get_page_text` returns stale panels on the URL-Inspection screen — trust screenshots.

## Content editing — Decap CMS is DEAD (since the 2026-08-06 GitHub Pages move)

**The `/admin` self-edit page no longer works** — its GitHub-login handshake ran on Netlify
Functions, which GitHub Pages can't host. Pranay updates the site by asking Claude (edit →
verify → commit → subtree push, per Deployment above). He accepted this trade-off knowingly;
if he ever wants self-editing back, it needs an OAuth helper hosted elsewhere (e.g. a free
Cloudflare Worker) — don't rebuild it unprompted. The `site/admin/` folder and the config notes
below are kept for that eventuality.

**Blog posts:** add an entry to `site/content/blog.json` (see fields below) and, for a
custom-designed post, drop its standalone HTML at `site/assets/posts/<slug>.html` — that's the
path `customFile: "/assets/posts/<slug>.html"` resolves to in production. ⚠️ If a post arrives as
a Claude-artifact **"bundled" export** (`<title>Bundled Page</title>`, `__bundler/manifest`
script, UUID src refs), **unbundle it before publishing** — bundles display for humans but are
invisible to search/AI crawlers. Precedent: the Prep Bible post (2026-08-06) — decode the
`__bundler/template` JSON string, inline the manifest's woff2 fonts as data: URIs, drop the
dc-runtime loader + `x-dc`/`helmet` wrappers (move helmet contents into `<head>`), add a real
`<title>`.

### Old Decap reference (dormant)

The two collections were:

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
