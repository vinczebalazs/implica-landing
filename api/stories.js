/* ==========================================================================
   Implica — /stories and /hu/hirek, every web article, newest first, 20 a page.
   World is the only scope with web articles (owner, 2026-10-21).
   ========================================================================== */

const { api, listPage, messagePage, LANGS, CACHE_LIST, CACHE_MISS } = require("./_page");

const SCOPE = "world";
const PER_PAGE = 20;

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const lang = LANGS.includes(req.query.lang) ? req.query.lang : "en";
  const page = Math.max(1, Math.min(10000, parseInt(req.query.page, 10) || 1));

  let result;
  try {
    result = await api(
      `/web/${SCOPE}/articles?page=${page}&perPage=${PER_PAGE}${lang === "en" ? "" : `&lang=${lang}`}`,
    );
  } catch {
    result = { status: 502 };
  }
  if (result.status !== 200) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).send(messagePage("listDown", lang));
  }

  const list = result.data;
  if (page > list.totalPages) {
    res.setHeader("Cache-Control", CACHE_MISS);
    return res.status(404).send(messagePage("pageNotFound", lang));
  }
  res.setHeader("Cache-Control", CACHE_LIST);
  return res.status(200).send(listPage(list, SCOPE, lang));
};
