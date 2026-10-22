/* ==========================================================================
   Implica — /sitemap.xml and /news-sitemap.xml

   The sitemap lists the site's own pages and every web article in every
   language, each translated pair linked both ways with hreflang so Google
   treats them as one page in two languages rather than as duplicates. The
   news sitemap lists only articles from the last two days, in Google's news
   format, which Google reads more often for fresh stories.
   ========================================================================== */

const { api, esc, articlePath, ORIGIN, CACHE_LIST } = require("./_page");
// Written by scripts/build-blog.mjs alongside the /blog pages it generates.
const BLOG = require("./_blog.json");

const SCOPE = "world";
const PAIRED = [{ en: "/", hu: "/hu" }, { en: "/stories", hu: "/hu/hirek" }];
const SINGLE = ["/privacy", "/terms"];
const NEWS_WINDOW_MS = 48 * 3600_000;

/** One <url> per language of a page; `paths` maps each language to its site path. */
function urls(paths, lastmod) {
  const langs = Object.keys(paths);
  const links =
    langs.length > 1
      ? [
          ...langs.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${ORIGIN}${esc(paths[l])}"/>`),
          paths.en ? `<xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}${esc(paths.en)}"/>` : "",
        ].join("")
      : "";
  return langs.map(
    (l) =>
      `  <url><loc>${ORIGIN}${esc(paths[l])}</loc>${lastmod && lastmod[l] ? `<lastmod>${esc(lastmod[l])}</lastmod>` : ""}${links}</url>`,
  );
}

module.exports = async (req, res) => {
  let result;
  try {
    result = await api(`/web/${SCOPE}/sitemap`);
  } catch {
    result = { status: 502 };
  }
  if (result.status !== 200) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).send("");
  }
  const articles = result.data;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", CACHE_LIST);

  if (req.query.type === "news") {
    const cutoff = Date.now() - NEWS_WINDOW_MS;
    const fresh = articles
      .filter((a) => new Date(a.publishedAt).getTime() >= cutoff)
      .flatMap((a) => [
        { lang: "en", slug: a.slug, title: a.title, publishedAt: a.publishedAt },
        ...Object.entries(a.translations || {}).map(([lang, t]) => ({
          lang,
          slug: t.slug,
          title: t.title,
          publishedAt: a.publishedAt,
        })),
      ]);
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${fresh
  .map(
    (a) => `  <url>
    <loc>${ORIGIN}${esc(articlePath(a.lang, SCOPE, a.slug))}</loc>
    <news:news>
      <news:publication><news:name>Implica</news:name><news:language>${a.lang}</news:language></news:publication>
      <news:publication_date>${esc(a.publishedAt)}</news:publication_date>
      <news:title>${esc(a.title || "")}</news:title>
    </news:news>
  </url>`,
  )
  .join("\n")}
</urlset>
`);
  }

  const lines = [
    ...PAIRED.flatMap((p) => urls(p)),
    ...SINGLE.flatMap((p) => urls({ en: p })),
    ...BLOG.flatMap((b) => urls({ en: b.path }, { en: b.modified })),
    ...articles.flatMap((a) => {
      const paths = { en: articlePath("en", SCOPE, a.slug) };
      const lastmod = { en: a.modifiedAt };
      for (const [lang, t] of Object.entries(a.translations || {})) {
        paths[lang] = articlePath(lang, SCOPE, t.slug);
        lastmod[lang] = t.modifiedAt;
      }
      return urls(paths, lastmod);
    }),
  ];
  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${lines.join("\n")}
</urlset>
`);
};
