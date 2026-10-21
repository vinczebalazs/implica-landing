/* ==========================================================================
   Implica — /sitemap.xml and /news-sitemap.xml

   The sitemap lists the site's own pages and every web article. The news
   sitemap lists only articles from the last two days, in Google's news
   format, which Google reads more often for fresh stories.
   ========================================================================== */

const { api, esc, ORIGIN, CACHE_LIST } = require("./_page");

const SCOPE = "world";
const STATIC = ["/", "/stories", "/privacy", "/terms"];
const NEWS_WINDOW_MS = 48 * 3600_000;

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
    const fresh = articles.filter((a) => new Date(a.publishedAt).getTime() >= cutoff);
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${fresh
  .map(
    (a) => `  <url>
    <loc>${ORIGIN}/${SCOPE}/${esc(a.slug)}</loc>
    <news:news>
      <news:publication><news:name>Implica</news:name><news:language>en</news:language></news:publication>
      <news:publication_date>${esc(a.publishedAt)}</news:publication_date>
      <news:title>${esc(a.title || "")}</news:title>
    </news:news>
  </url>`,
  )
  .join("\n")}
</urlset>
`);
  }

  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${STATIC.map((p) => `  <url><loc>${ORIGIN}${p === "/" ? "/" : p}</loc></url>`).join("\n")}
${articles
  .map((a) => `  <url><loc>${ORIGIN}/${SCOPE}/${esc(a.slug)}</loc><lastmod>${esc(a.modifiedAt)}</lastmod></url>`)
  .join("\n")}
</urlset>
`);
};
