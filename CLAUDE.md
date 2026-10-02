# kult-adbuilder

Flashtalking HTML5 banner ad builder. React 18 + Vite + Zustand + Tailwind,
deployed on Cloudflare Pages with Pages Functions and D1.

## Shipping work

**Always merge to `main` and let it deploy — don't wait to be asked.**

Once a change is built, verified and CI is green, take it all the way:

1. Push the branch and open a PR.
2. Mark it ready (not draft) and squash-merge it into `main`.
3. Cloudflare redeploys production from `main` automatically.

Don't leave finished work sitting in a draft PR asking whether to merge it.
This is the user's standing instruction, not a per-change decision.

Preview deployments are not a substitute for this: the Cloudflare **preview
environment has no auth binding**, so nobody can log in to a branch preview to
test it. Production off `main` is the only place a change can actually be
tried. That's why merging is the default.

Still stop and ask when the change itself is genuinely ambiguous or
destructive — the standing merge instruction covers routine delivery, not
decisions the user would want a say in.

## Code notes

- `src/utils/exportBanner.js` is the compiler: it turns editor state into the
  real banner (HTML + CSS + GSAP JS) and is the single code path behind both
  Preview and the Flashtalking ZIP export. Treat changes there as high-risk —
  it fails silently and it's JS writing JS.
- `src/utils/exportVideo.js` sits strictly on top of that, consuming
  `buildPreviewHtml()` output to render MP4s. It must not need changes to the
  banner pipeline.
- CSS `text-shadow` has **no spread parameter** (unlike `box-shadow`), and one
  invalid layer invalidates the whole declaration.
