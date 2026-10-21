/* ==========================================================================
   Implica — /world/:slug and /hu/vilag/:slug, one long-form story page.
   Reached via a rewrite, so scope, lang and slug arrive as query params.
   ========================================================================== */

const { api, articlePage, messagePage, LANGS, CACHE_LIVE, CACHE_FROZEN, CACHE_MISS } = require("./_page");

const SCOPE = /^world$/;
const SLUG = /^[a-z0-9-]{1,100}$/;

module.exports = async (req, res) => {
  const { scope, slug } = req.query;
  const lang = LANGS.includes(req.query.lang) ? req.query.lang : "en";
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (!SCOPE.test(scope || "") || !SLUG.test(slug || "")) {
    res.setHeader("Cache-Control", CACHE_MISS);
    return res.status(404).send(messagePage("notFound", lang));
  }

  let result;
  try {
    result = await api(`/web/${scope}/articles/${slug}${lang === "en" ? "" : `?lang=${lang}`}`);
  } catch {
    result = { status: 502 };
  }

  if (result.status === 404) {
    res.setHeader("Cache-Control", CACHE_MISS);
    return res.status(404).send(messagePage("notFound", lang));
  }
  if (result.status !== 200) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).send(messagePage("articleDown", lang));
  }

  res.setHeader("Cache-Control", result.data.frozen ? CACHE_FROZEN : CACHE_LIVE);
  return res.status(200).send(articlePage({ ...result.data, lang }));
};
