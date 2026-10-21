/* ==========================================================================
   Implica — /world/:slug, one long-form story page.
   Reached via a rewrite, so scope and slug arrive as query params.
   ========================================================================== */

const { api, articlePage, messagePage, CACHE_LIVE, CACHE_FROZEN, CACHE_MISS } = require("./_page");

const SCOPE = /^world$/;
const SLUG = /^[a-z0-9-]{1,100}$/;

module.exports = async (req, res) => {
  const { scope, slug } = req.query;
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (!SCOPE.test(scope || "") || !SLUG.test(slug || "")) {
    res.setHeader("Cache-Control", CACHE_MISS);
    return res.status(404).send(messagePage("Story not found", "We couldn't find that story."));
  }

  let result;
  try {
    result = await api(`/web/${scope}/articles/${slug}`);
  } catch {
    result = { status: 502 };
  }

  if (result.status === 404) {
    res.setHeader("Cache-Control", CACHE_MISS);
    return res.status(404).send(messagePage("Story not found", "We couldn't find that story."));
  }
  if (result.status !== 200) {
    res.setHeader("Cache-Control", "no-store");
    return res
      .status(503)
      .send(messagePage("Try again shortly", "This story didn't load. Please try again in a moment."));
  }

  res.setHeader("Cache-Control", result.data.frozen ? CACHE_FROZEN : CACHE_LIVE);
  return res.status(200).send(articlePage(result.data));
};
