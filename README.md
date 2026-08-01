# fourohfourfound

The site behind [fourohfourfound.com](https://fourohfourfound.com). Astro,
Markdown, static output, no JavaScript shipped to the browser.

## Running it

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # writes dist/
npm run preview  # serves the built dist/
```

## Writing a post

Add a Markdown file to `src/content/posts/`. The filename becomes the URL, so
`src/content/posts/on-caching.md` publishes at `/posts/on-caching/`.

```markdown
---
title: On caching
date: 2026-08-14
description: Optional. Used for the post's social preview and RSS entry.
draft: false
---

Body copy starts here.
```

`date` drives both the ordering and the `MM/DD/YYYY` stamp shown on the index.
Posts sort newest first and group under a year heading automatically.

Set `draft: true` to keep a post visible in `npm run dev` while excluding it
from the production build and the RSS feed.

## Deploying

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the
site and publishes it to GitHub Pages. There is nothing to run by hand.

`public/CNAME` is what points the deployment at the custom domain — deleting it
would move the site back to the `github.io` URL on the next deploy.

## Layout

```
src/
  content/posts/     Markdown posts
  pages/
    index.astro      Post list, grouped by year
    posts/[...slug]  Individual post pages
    404.astro
    rss.xml.ts       Feed at /rss.xml
  layouts/Base.astro Page shell, <head>, header, footer
  components/
    Logo.astro       Wordmark — placeholder, see below
  styles/global.css  Palette, type, spacing — nearly all styling
  lib/date.ts        MM/DD/YYYY formatting
public/              Copied to the site root verbatim
```

## Design notes

The palette, type scale, and spacing are all CSS custom properties at the top
of `src/styles/global.css`. `--accent` (amber) is deliberately rare: it appears
on hover, on focus rings, and on the 404 page, and nowhere else.

Dark is unconditional rather than tied to the system preference — the site is
designed as a dark object, so a light variant would be a second design rather
than a palette swap.

Typography is system fonts only: no network requests, no layout shift, nothing
to self-host. Swapping in a real typeface means changing `--sans` / `--mono`
and adding an `@font-face`.

### The logo

`src/components/Logo.astro` is a placeholder wordmark, and it is the only file
that renders the logo. Replacing its contents changes the mark everywhere —
header, post pages, 404 — with no other edits.
