/* ==========================================================================
   Implica — /blog pages

   The site deploys as static files with no build step on Vercel, so blog
   pages are generated here and committed: run `node scripts/build-blog.mjs`
   after editing anything in content/blog/.

   It also writes the /blog index listing every article, newest first.

   An article whose "published" date is still in the future is left out
   entirely, and links to it from other articles become plain text, so
   articles can be scheduled: rebuild and commit on or after the date to
   release one. `--drafts` builds everything, for previewing locally only.

   Each source file opens with a JSON comment holding the page's metadata,
   followed by the article body as HTML. The page chrome (head, header,
   footer, download CTA) comes from api/_page.js, the same code that renders
   the story pages, so the two never drift apart.
   ========================================================================== */

import { createRequire } from "node:module";
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { ORIGIN, esc, day, jsonLd, layout, cta } = require(join(root, "api/_page.js"));

const SRC = join(root, "content/blog");
// The story pages' closing line ("stories like this") doesn't fit a guide.
const CTA = {
  title: "Understand the news,<br />not just the headlines.",
  lede: "Implica picks the day's most important stories and explains each one: what happened, why it matters, and how it got here. Free to download.",
};
const OUT = join(root, "blog");
const META = /^\s*<!--([\s\S]*?)-->/;

function render(meta, body) {
  const path = `/blog/${meta.slug}`;
  const url = `${ORIGIN}${path}`;
  const image = `${ORIGIN}/assets/implica-cover.jpg`;
  const words = body.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 230));

  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    inLanguage: "en",
    headline: meta.title,
    description: meta.description,
    image: [image],
    datePublished: meta.published,
    dateModified: meta.modified || meta.published,
    wordCount: words,
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: "Implica", url: ORIGIN },
    publisher: {
      "@type": "Organization",
      name: "Implica",
      logo: { "@type": "ImageObject", url: `${ORIGIN}/assets/icon.png` },
    },
  };

  const head = `
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Implica" />
    <meta property="og:locale" content="en_GB" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:title" content="${esc(meta.title)}" />
    <meta property="og:description" content="${esc(meta.description)}" />
    <meta property="og:image" content="${esc(image)}" />
    <meta property="article:published_time" content="${esc(meta.published)}" />
    <meta property="article:modified_time" content="${esc(meta.modified || meta.published)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(meta.title)}" />
    <meta name="twitter:description" content="${esc(meta.description)}" />
    <meta name="twitter:image" content="${esc(image)}" />
    <script type="application/ld+json">${jsonLd(ld)}</script>`;

  const main = `
        <article class="wrap story blog">
          <div class="glow glow-story" aria-hidden="true"></div>
          <div class="story-col">
            <nav class="crumbs mono-label" aria-label="Breadcrumb">
              <a href="/">IMPLICA</a><span class="sep">/</span><a href="/blog">BLOG</a>
            </nav>
            <h1 class="story-h1">${esc(meta.h1 || meta.title)}</h1>
            <p class="story-standfirst">${esc(meta.standfirst)}</p>
            <div class="byline">
              <span>Updated <strong>${esc(day(meta.modified || meta.published))}</strong></span>
              <span>By <strong>Implica</strong></span>
              <span>${minutes} min read</span>
            </div>
            <div class="prose">
${body.trim()}
            </div>
          </div>
        </article>
${cta("en", CTA)}`;

  return layout({
    lang: "en",
    title: meta.title,
    description: meta.description,
    canonical: url,
    alternates: { en: url },
    head,
    main,
  });
}

function renderIndex(posts) {
  const url = `${ORIGIN}/blog`;
  const description =
    "Guides from Implica on the news apps, sources and habits that help you understand what's happening.";
  const items = posts
    .map(
      (m) =>
        `<li><a href="/blog/${esc(m.slug)}"><span class="mono-label">${esc(day(m.modified || m.published).toUpperCase())}</span><span class="t">${esc(m.h1 || m.title)}</span><span class="s">${esc(m.description)}</span></a></li>`,
    )
    .join("\n");
  const main = `
        <section class="wrap story">
          <div class="glow glow-story" aria-hidden="true"></div>
          <div class="story-col">
            <header class="stories-head">
              <h1 class="stories-title">Blog</h1>
              <p class="stories-lede">${esc(description)}</p>
            </header>
            <ul class="story-list">${items}</ul>
          </div>
        </section>
${cta("en", CTA)}`;
  const head = `
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Implica" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:title" content="Blog — Implica" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:image" content="${ORIGIN}/assets/implica-cover.jpg" />
    <meta name="twitter:card" content="summary_large_image" />`;
  return layout({
    lang: "en",
    title: "Blog — Implica",
    description,
    canonical: url,
    alternates: { en: url },
    head,
    main,
  });
}

mkdirSync(OUT, { recursive: true });
const drafts = process.argv.includes("--drafts");
const today = new Date().toISOString().slice(0, 10);
const sources = [];
for (const file of readdirSync(SRC).filter((f) => f.endsWith(".html")).sort()) {
  const text = readFileSync(join(SRC, file), "utf8");
  const match = text.match(META);
  if (!match) throw new Error(`${file}: missing the leading <!-- {json} --> metadata comment`);
  const meta = JSON.parse(match[1]);
  for (const key of ["slug", "title", "description", "standfirst", "published"]) {
    if (!meta[key]) throw new Error(`${file}: metadata is missing "${key}"`);
  }
  sources.push({ meta, body: text.slice(match[0].length) });
}

const isLive = ({ meta }) => drafts || meta.published <= today;
const scheduled = new Set(sources.filter((s) => !isLive(s)).map((s) => s.meta.slug));
const unlinkScheduled = (body) =>
  body.replace(/<a href="\/blog\/([a-z0-9-]+)">([\s\S]*?)<\/a>/g, (link, slug, text) =>
    scheduled.has(slug) ? text : link,
  );

const posts = [];
for (const { meta, body } of sources) {
  const file = join(OUT, `${meta.slug}.html`);
  if (scheduled.has(meta.slug)) {
    rmSync(file, { force: true });
    console.log(`scheduled for ${meta.published}: ${meta.slug}`);
    continue;
  }
  writeFileSync(file, render(meta, unlinkScheduled(body)));
  posts.push(meta);
  console.log(`blog/${meta.slug}.html`);
}
posts.sort((a, b) => (b.modified || b.published).localeCompare(a.modified || a.published));
writeFileSync(join(OUT, "index.html"), renderIndex(posts));
console.log("blog/index.html");

const manifest = [
  { path: "/blog", modified: posts.length ? posts[0].modified || posts[0].published : undefined },
  ...posts.map((m) => ({ path: `/blog/${m.slug}`, modified: m.modified || m.published })),
];
writeFileSync(join(root, "api/_blog.json"), JSON.stringify(manifest, null, 2) + "\n");
