# pranaynichani.com — new portfolio site

The new version of www.pranaynichani.com — a hand-coded static site for Pranay's
post-production / film work. No frameworks, no build step, no subscription:
plain HTML + CSS + JS that any free static host can serve.

## Layout

```
site/
  index.html        homepage (hero, laurels, selected work, career timeline, thesis)
  work.html         full archive with filters (features/series/shorts/commercial/as-editor)
  project.html      detail page for any project (driven by ?p=slug)
  about.html        bio, honours, tools, education, teaching
  blog/index.html   "Notes" — blog index
  blog/posts/       one HTML file per post
  css/style.css     all styling (dark cinematic theme, gold accent)
  js/data.js        ⭐ ALL CONTENT — every project lives here; edit this to update the site
  js/main.js        rendering: cards, timeline, filters, project pages
  assets/stills/    project stills (pulled from the old Adobe Portfolio site)
```

## How to update content (plain English)

- **Add/edit a project**: edit `site/js/data.js` — copy an existing block, change the
  fields, drop a 16:9 still named `<slug>.jpg` into `assets/stills/`.
- **Add a trailer**: paste a YouTube/Vimeo URL into that project's `trailer:` field —
  a "Watch trailer" button appears automatically.
- **Write a blog post**: duplicate `blog/posts/tools-and-story.html`, write, and add
  one `<a class="post-item">` entry to `blog/index.html`.
- Or just ask Claude to do any of the above.

## Preview locally

Open `site/index.html` in a browser, or run a tiny server:
`cd site && python3 -m http.server 8090` then visit http://localhost:8090

## Deploy (when ready)

Recommended: Cloudflare Pages (free) — drag-and-drop the `site/` folder or connect
this repo. Then point the `pranaynichani.com` DNS at it and retire Adobe Portfolio.

## Still to do

- [ ] Get real trailer URLs for featured projects (data.js `trailer:` fields)
- [ ] Consider a 30–60s hero showreel loop instead of the static Ken Burns still
- [ ] Higher-res stills for Eye of the Hurricane (only 540px available on old site)
- [ ] Deploy + DNS cutover
