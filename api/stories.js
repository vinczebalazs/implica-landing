/* ==========================================================================
   Implica — /stories, every web article, newest first, 20 a page.
   World is the only scope with web articles (owner, 2026-10-21).
   ========================================================================== */

const { api, listPage, messagePage, CACHE_LIST, CACHE_MISS } = require("./_page");

const SCOPE = "world";
const PER_PAGE = 20;

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const page = Math.max(1, Math.min(10000, parseInt(req.query.page, 10) || 1));

  let result;
  try {
    result = await api(`/web/${SCOPE}/articles?page=${page}&perPage=${PER_PAGE}`);
  } catch {
    result = { status: 502 };
  }
  if (result.status !== 200) {
    res.setHeader("Cache-Control", "no-store");
    return res
      .status(503)
      .send(messagePage("Try again shortly", "Stories didn't load. Please try again in a moment."));
  }

  const list = result.data;
  if (page > list.totalPages) {
    res.setHeader("Cache-Control", CACHE_MISS);
    return res.status(404).send(messagePage("Page not found", "There are no stories on that page."));
  }
  res.setHeader("Cache-Control", CACHE_LIST);
  return res.status(200).send(listPage(list, SCOPE));
};
