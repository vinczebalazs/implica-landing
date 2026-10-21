/* ==========================================================================
   Implica — story pages, shared rendering

   The long-form web articles (implica-be WebArticleService, owner decision
   `web-articles`, 2026-10-21) are written by the worker and served as JSON by
   the API's public /web/:scope/... routes. These helpers turn that JSON into
   the site's markup. Files prefixed with "_" are not routes on Vercel.

   Every string from the API is model-written: it goes through esc() on the
   way out, without exception.
   ========================================================================== */

const ORIGIN = "https://implica.app";
const API = (process.env.IMPLICA_API_URL || "https://api.implica.app").replace(/\/+$/, "");
const IOS_URL = "https://apps.apple.com/app/id6759221897";
const ANDROID_URL = "https://play.google.com/store/apps/details?id=com.flystraightai.implica";

// Vercel's edge cache holds the finished HTML; browsers keep it 5 minutes at most, since a browser
// copy cannot be purged. A deploy purges the edge.
// - An article whose story is still in the app's feed can be rewritten by the next hourly run.
// - One whose story left the feed (`frozen`, decided by the API) never changes again; a week rather
//   than forever only so its "More from World" links stay reasonably fresh.
// - Lists and sitemaps announce new articles, so they stay short.
const CACHE_LIVE = "public, max-age=300, s-maxage=3600, stale-while-revalidate=600";
const CACHE_FROZEN = "public, max-age=300, s-maxage=604800, stale-while-revalidate=86400";
const CACHE_LIST = "public, max-age=300, s-maxage=600, stale-while-revalidate=600";
const CACHE_MISS = "public, max-age=60, s-maxage=60";

// Hungarian pages live under /hu (owner, 2026-10-21, `web-articles-hu`): world articles translated
// by the worker, with the site's own copy below. Privacy and terms stay English. No visitor is
// redirected by browser language; the nav's language link is the only switch.
const LANGS = ["en", "hu"];

const T = {
  en: {
    locale: "en-GB",
    ogLocale: "en_GB",
    home: "/",
    list: "/stories",
    scopes: { world: { path: "world", name: "World" } },
    stories: "STORIES",
    privacy: "PRIVACY",
    terms: "TERMS",
    contact: "CONTACT",
    switchLabel: "EN",
    switchName: "English",
    getApp: "Get the app",
    skip: "Skip to content",
    homeLabel: "Implica — home",
    ctaTitle: "The short version of stories<br />like this, every day.",
    ctaLede:
      "Each story takes a minute to read. Ask a question or tap a name whenever you want to go deeper. Free to download.",
    appStoreKicker: "DOWNLOAD ON THE",
    appStoreName: "App Store",
    playKicker: "GET IT ON",
    playName: "Google Play",
    seeAll: "See all stories",
    notFound: ["Story not found", "We couldn't find that story."],
    pageNotFound: ["Page not found", "There are no stories on that page."],
    articleDown: ["Try again shortly", "This story didn't load. Please try again in a moment."],
    listDown: ["Try again shortly", "Stories didn't load. Please try again in a moment."],
    listH1: "The world's biggest stories, explained.",
    listLede: "What happened, why it matters, and the history behind it.",
    listDescription:
      "The world's biggest stories, explained: what happened, why it matters, and the history behind it.",
    listTitle: (page) => (page > 1 ? `Stories, page ${page}` : "Stories"),
    empty: "No stories yet. Check back soon.",
    newer: "Newer stories",
    older: "Older stories",
    pageOf: (page, total) => `PAGE ${page} OF ${total}`,
    shortAnswer: "THE SHORT ANSWER",
    inThisArticle: "IN THIS ARTICLE",
    whatHappened: "What happened",
    whyItMatters: "Why it matters",
    background: "The background",
    timeline: "Timeline",
    watchNext: "What to watch next",
    goodToKnow: "GOOD TO KNOW",
    sources: "Sources",
    moreFrom: (scope) => `More from ${scope}`,
    published: "Published",
    updated: "Updated",
    by: "By",
    sourceCount: (n) => `${n} sources`,
    minutes: (n) => `${n} min read`,
    method: (refs) =>
      `How this article was made: Implica's editorial system wrote it from the news reports above${
        refs ? `, with the background drawn from Wikipedia: ${refs}` : ""
      }.`,
  },
  hu: {
    locale: "hu-HU",
    ogLocale: "hu_HU",
    home: "/hu",
    list: "/hu/hirek",
    scopes: { world: { path: "hu/vilag", name: "Világ" } },
    stories: "HÍREK",
    privacy: "ADATVÉDELEM",
    terms: "FELTÉTELEK",
    contact: "KAPCSOLAT",
    switchLabel: "HU",
    switchName: "Magyar",
    getApp: "Letöltés",
    skip: "Ugrás a tartalomra",
    homeLabel: "Implica — kezdőlap",
    ctaTitle: "Az ilyen hírek röviden,<br />minden nap.",
    ctaLede:
      "Egy hír egy perc alatt elolvasható. Ha mélyebbre mennél, kérdezz, vagy koppints egy névre. Ingyenesen letölthető.",
    appStoreKicker: "LETÖLTÉS AZ",
    appStoreName: "App Store-ból",
    playKicker: "SZEREZD MEG:",
    playName: "Google Play",
    seeAll: "Az összes hír",
    notFound: ["A hír nem található", "Ezt a hírt nem találtuk."],
    pageNotFound: ["Az oldal nem található", "Ezen az oldalon nincsenek hírek."],
    articleDown: ["Próbáld újra kicsit később", "A hír nem töltődött be. Próbáld újra egy perc múlva."],
    listDown: ["Próbáld újra kicsit később", "A hírek nem töltődtek be. Próbáld újra egy perc múlva."],
    listH1: "A világ legfontosabb hírei, érthetően.",
    listLede: "Mi történt, miért számít, és mi áll mögötte.",
    listDescription:
      "A világ legfontosabb hírei, érthetően: mi történt, miért számít, és milyen előzmények állnak mögötte.",
    listTitle: (page) => (page > 1 ? `Hírek, ${page}. oldal` : "Hírek"),
    empty: "Még nincsenek hírek. Nézz vissza hamarosan.",
    newer: "Újabb hírek",
    older: "Korábbi hírek",
    pageOf: (page, total) => `${page}. OLDAL / ${total}`,
    shortAnswer: "RÖVIDEN",
    inThisArticle: "EBBEN A CIKKBEN",
    whatHappened: "Mi történt",
    whyItMatters: "Miért számít",
    background: "Az előzmények",
    timeline: "Idővonal",
    watchNext: "Mire érdemes figyelni",
    goodToKnow: "ÉRDEMES TUDNI",
    sources: "Források",
    moreFrom: () => "További világhírek",
    published: "Megjelent",
    updated: "Frissítve",
    by: "Szerző:",
    sourceCount: (n) => `${n} forrás`,
    minutes: (n) => `${n} perc olvasás`,
    method: (refs) =>
      `Hogyan készült ez a cikk: az Implica szerkesztőrendszere írta a fenti hírforrásokból${
        refs ? `, a hátteret az angol nyelvű Wikipédiából merítve: ${refs}` : ""
      }. A magyar szöveg az angol változat fordítása.`,
  },
};

const t = (lang) => T[lang] || T.en;

/** The site path of an article: "/world/<slug>", "/hu/vilag/<slug>". */
function articlePath(lang, scope, slug) {
  const s = t(lang).scopes[scope];
  return `/${s ? s.path : scope}/${slug}`;
}

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** "20 Oct 2026", "2026. okt. 20."; empty for anything unparseable. */
function day(value, lang = "en") {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(t(lang).locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** JSON for a <script> block: "</" would end the block early. */
function jsonLd(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

async function api(path) {
  const res = await fetch(`${API}${path}`, { headers: { accept: "application/json" } });
  if (res.status === 404) return { status: 404 };
  if (!res.ok) return { status: 502 };
  return { status: 200, data: await res.json() };
}

const APPLE_ICON = `<svg class="btn-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z"></path></svg>`;
const PLAY_ICON = `<svg class="btn-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3.62,1.71L13.05,11.14L3.63,20.56C3.24,20.32 3,19.9 3,19.42V2.85C3,2.38 3.24,1.96 3.62,1.71M14.11,12.2L16.5,14.59L5.5,20.84L14.11,12.2M17.77,9.1L20.16,10.44C20.68,10.73 21,11.28 21,11.87C21,12.47 20.68,13 20.16,13.31L17.79,14.65L15.17,12.03L17.77,9.1M5.5,2.96L16.5,9.21L14.15,11.09L5.5,2.96Z"></path></svg>`;

// Owner's copy, 2026-10-21; the Hungarian is its translation.
function cta(lang) {
  const c = t(lang);
  return `
        <section class="cta-outer story-cta" id="get">
          <div class="wrap cta">
            <div class="glow glow-cta" aria-hidden="true"></div>
            <div class="cta-inner">
              <h2 class="cta-title">${c.ctaTitle}</h2>
              <p class="cta-lede">${esc(c.ctaLede)}</p>
              <div class="store-buttons">
                <a class="btn btn-gold btn-store" href="${IOS_URL}" data-store="ios">
                  ${APPLE_ICON}
                  <span class="store-label"><span class="store-kicker">${esc(c.appStoreKicker)}</span><span class="store-name">${esc(c.appStoreName)}</span></span>
                </a>
                <a class="btn btn-ghost btn-store" href="${ANDROID_URL}" data-store="android">
                  ${PLAY_ICON}
                  <span class="store-label"><span class="store-kicker store-kicker-dim">${esc(c.playKicker)}</span><span class="store-name">${esc(c.playName)}</span></span>
                </a>
              </div>
            </div>
          </div>
        </section>`;
}

/**
 * The whole document: head, header, main, footer. `head` and `main` are already-escaped HTML.
 * `alternates` maps each language this page exists in to its absolute URL; the nav's language link
 * goes to the other language's version, or to its stories list when there is none.
 */
function layout({ lang = "en", title, description, canonical, head = "", main, robots, alternates }) {
  const c = t(lang);
  const other = lang === "en" ? "hu" : "en";
  const switchTo = ((alternates && alternates[other]) || t(other).list).replace(ORIGIN, "");
  const hreflang =
    alternates && Object.keys(alternates).length > 1
      ? [
          ...Object.entries(alternates).map(
            ([l, href]) => `<link rel="alternate" hreflang="${esc(l)}" href="${esc(href)}" />`,
          ),
          alternates.en ? `<link rel="alternate" hreflang="x-default" href="${esc(alternates.en)}" />` : "",
        ].join("\n    ")
      : "";
  return `<!doctype html>
<html lang="${esc(lang)}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="/analytics.js"></script>
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    ${robots ? `<meta name="robots" content="${esc(robots)}" />` : ""}
    ${canonical ? `<link rel="canonical" href="${esc(canonical)}" />` : ""}
    ${hreflang}
    <meta name="theme-color" content="#08080a" />
    <meta name="apple-itunes-app" content="app-id=6759221897" />
    <link rel="icon" href="/assets/favicon.ico" type="image/x-icon" />
    <link rel="apple-touch-icon" href="/assets/icon.png" />
    ${head}
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&amp;family=Libre+Franklin:wght@400;500;600;700&amp;family=JetBrains+Mono:wght@400;500;600&amp;display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body id="top">
    <a class="skip-link" href="#main">${esc(c.skip)}</a>
    <div class="page">
      <header class="site-header is-solid">
        <div class="wrap header-inner">
          <a class="logo" href="${c.home}" aria-label="${esc(c.homeLabel)}">
            <img src="/assets/logo.svg" alt="Implica" width="112" height="25" />
          </a>
          <nav class="nav" id="primary-nav" aria-label="Primary">
            <a class="nav-link" href="${c.list}">${esc(c.stories)}</a>
            <a class="nav-link" href="${esc(switchTo)}" hreflang="${other}" lang="${other}" title="${esc(t(other).switchName)}">${esc(t(other).switchLabel)}</a>
          </nav>
          <a class="btn btn-gold btn-sm header-cta" href="#get" data-store="auto">${esc(c.getApp)}</a>
        </div>
      </header>
      <main id="main">${main}
      </main>
      <footer class="site-footer">
        <div class="wrap footer-inner">
          <img class="footer-logo" src="/assets/logo.svg" alt="Implica" width="96" height="21" />
          <span class="mono-label copyright">© ${new Date().getUTCFullYear()} IMPLICA</span>
          <nav class="footer-links" aria-label="Footer">
            <a href="${c.list}">${esc(c.stories)}</a>
            <a href="/privacy" hreflang="en">${esc(c.privacy)}</a>
            <a href="/terms" hreflang="en">${esc(c.terms)}</a>
            <a class="footer-email" href="mailto:hello@implica.app">HELLO@IMPLICA.APP</a>
            <a class="footer-contact" href="mailto:hello@implica.app">${esc(c.contact)}</a>
          </nav>
        </div>
      </footer>
    </div>
    <script src="/download.js"></script>
  </body>
</html>
`;
}

/** A noindex page for a miss or an outage; `key` names a [heading, text] pair in T. */
function messagePage(key, lang = "en") {
  const c = t(lang);
  const [heading, text] = c[key];
  return layout({
    lang,
    title: `${heading} — Implica`,
    description: text,
    robots: "noindex",
    main: `
        <section class="wrap story-message">
          <h1 class="stories-title">${esc(heading)}</h1>
          <p class="stories-lede">${esc(text)}</p>
          <a class="btn btn-ghost btn-sm" href="${c.list}">${esc(c.seeAll)}</a>
        </section>`,
  });
}

const paragraphs = (list) => (list || []).map((p) => `<p>${esc(p)}</p>`).join("\n");
const points = (list) =>
  list && list.length
    ? `<ul class="bullets">${list
        .map((p) => `<li><strong>${esc(p.lead)}</strong> ${esc(p.text)}</li>`)
        .join("")}</ul>`
    : "";

function articlePage(a) {
  const lang = LANGS.includes(a.lang) ? a.lang : "en";
  const c = t(lang);
  const scopeName = (c.scopes[a.scope] || {}).name || a.scope;
  const path = (slug) => articlePath(lang, a.scope, slug);
  const url = `${ORIGIN}${path(a.slug)}`;
  const alternates = Object.fromEntries(
    Object.entries(a.alternates || { [lang]: a.slug })
      .filter(([l]) => LANGS.includes(l))
      .map(([l, slug]) => [l, `${ORIGIN}${articlePath(l, a.scope, slug)}`]),
  );
  const image = `${ORIGIN}/og/${a.scope}/${a.eventId}.png`;
  const updated =
    a.modifiedAt && a.publishedAt && new Date(a.modifiedAt) - new Date(a.publishedAt) > 3600_000;
  const minutes = Math.max(1, Math.round((a.wordCount || 0) / 230));
  const timelineTitle = `${c.timeline}: ${a.timelineHeading || ""}`.replace(/: $/, "");

  const toc = [
    ["what-happened", c.whatHappened, (a.whatHappened || []).length],
    ["why-it-matters", c.whyItMatters, (a.whyItMatters || []).length || (a.stakes || []).length],
    ["background", a.backgroundHeading || c.background, (a.background || []).length],
    ...(a.explainers || []).map((x, i) => [`explainer-${i + 1}`, x.heading, 1]),
    ["timeline", timelineTitle, (a.timeline || []).length],
    ["watch", c.watchNext, (a.watchNext || []).length],
  ].filter(([, , n]) => n);

  const timeline = (a.timeline || [])
    .map((era, ei, eras) => {
      const entries = era.entries
        .map((e, i) => {
          const now = ei === eras.length - 1 && i === era.entries.length - 1;
          const text = e.slug
            ? `<a href="${esc(path(e.slug))}">${esc(e.text)}</a>`
            : esc(e.text);
          return `<li class="${now ? "now" : e.key ? "key" : ""}"><time datetime="${esc(e.isoDate)}">${esc(e.date)}</time><p>${text}</p></li>`;
        })
        .join("");
      return `<p class="era">${esc(String(era.label).toUpperCase())}</p><ol class="tl">${entries}</ol>`;
    })
    .join("\n");

  const sources = (a.sources || [])
    .map(
      (s) =>
        `<li><a href="${esc(s.url)}" rel="noopener" target="_blank">${esc(s.publisher)}</a><span class="mono-label">${esc(day(s.date, lang).toUpperCase())}</span></li>`,
    )
    .join("");

  const refs = a.references || [];
  const method = c.method(
    refs
      .map((r) => `<a href="${esc(r.url)}" rel="noopener" target="_blank">${esc(r.title)}</a>`)
      .join(", "),
  );

  const related = (a.related || [])
    .map(
      (r) =>
        `<li><a href="${esc(path(r.slug))}"><span class="mono-label">${esc(day(r.publishedAt, lang).toUpperCase())}${r.category ? ` · ${esc(String(r.category).toUpperCase())}` : ""}</span><span class="t">${esc(r.title)}</span></a></li>`,
    )
    .join("");

  const ld = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    inLanguage: lang,
    headline: a.title,
    description: a.description,
    image: [image],
    datePublished: a.publishedAt,
    dateModified: a.modifiedAt || a.publishedAt,
    articleSection: scopeName,
    wordCount: a.wordCount,
    isAccessibleForFree: true,
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: "Implica", url: ORIGIN },
    publisher: {
      "@type": "Organization",
      name: "Implica",
      logo: { "@type": "ImageObject", url: `${ORIGIN}/assets/icon.png` },
    },
    citation: (a.sources || []).map((s) => s.url),
  };

  const head = `
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Implica" />
    <meta property="og:locale" content="${c.ogLocale}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:title" content="${esc(a.title)}" />
    <meta property="og:description" content="${esc(a.description)}" />
    <meta property="og:image" content="${esc(image)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="article:published_time" content="${esc(a.publishedAt)}" />
    <meta property="article:modified_time" content="${esc(a.modifiedAt || a.publishedAt)}" />
    <meta property="article:section" content="${esc(scopeName)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(a.title)}" />
    <meta name="twitter:description" content="${esc(a.description)}" />
    <meta name="twitter:image" content="${esc(image)}" />
    <script type="application/ld+json">${jsonLd(ld)}</script>`;

  const main = `
        <article class="wrap story">
          <div class="glow glow-story" aria-hidden="true"></div>
          <div class="story-col">
            <nav class="crumbs mono-label" aria-label="Breadcrumb">
              <a href="${c.list}">${esc(c.stories)}</a><span class="sep">/</span><span>${esc(scopeName.toUpperCase())}</span>${a.category ? `<span class="sep">/</span><span>${esc(String(a.category).toUpperCase())}</span>` : ""}
            </nav>
            <h1 class="story-h1">${esc(a.title)}</h1>
            <p class="story-standfirst">${esc(a.standfirst)}</p>
            <div class="byline">
              <span>${esc(c.published)} <strong>${esc(day(a.publishedAt, lang))}</strong></span>
              ${updated ? `<span>${esc(c.updated)} <strong>${esc(day(a.modifiedAt, lang))}</strong></span>` : ""}
              <span>${esc(c.by)} <strong>Implica</strong></span>
              <span>${esc(c.sourceCount((a.sources || []).length))}</span>
              <span>${esc(c.minutes(minutes))}</span>
            </div>

            <section class="answer" aria-labelledby="short-answer">
              <p class="eyebrow eyebrow-gold" id="short-answer"><span class="dot dot-gold"></span>${esc(c.shortAnswer)}</p>
              <p>${esc(a.shortAnswer)}</p>
            </section>

            <nav class="toc" aria-label="${esc(c.inThisArticle)}">
              <p class="eyebrow eyebrow-ice"><span class="dot dot-ice"></span>${esc(c.inThisArticle)}</p>
              <ol>${toc.map(([id, label]) => `<li><a href="#${id}">${esc(label)}</a></li>`).join("")}</ol>
            </nav>

            <div class="prose">
              <h2 id="what-happened">${esc(c.whatHappened)}</h2>
              ${paragraphs(a.whatHappened)}
              ${
                (a.whyItMatters || []).length || (a.stakes || []).length
                  ? `<h2 id="why-it-matters">${esc(c.whyItMatters)}</h2>${paragraphs(a.whyItMatters)}${points(a.stakes)}`
                  : ""
              }
              <h2 id="background">${esc(a.backgroundHeading || c.background)}</h2>
              ${(a.background || []).map((s) => `<h3>${esc(s.heading)}</h3>${paragraphs(s.paragraphs)}`).join("\n")}
              ${
                a.goodToKnow
                  ? `<div class="callout"><p class="eyebrow eyebrow-ice"><span class="dot dot-ice"></span>${esc(c.goodToKnow)}</p><p>${esc(a.goodToKnow)}</p></div>`
                  : ""
              }
              ${(a.explainers || []).map((s, i) => `<h2 id="explainer-${i + 1}">${esc(s.heading)}</h2>${paragraphs(s.paragraphs)}`).join("\n")}
              ${(a.timeline || []).length ? `<h2 id="timeline">${esc(timelineTitle)}</h2><div class="timeline">${timeline}</div>` : ""}
              ${(a.watchNext || []).length ? `<h2 id="watch">${esc(c.watchNext)}</h2>${points(a.watchNext)}` : ""}
              ${sources ? `<h2 id="sources">${esc(c.sources)}</h2><ul class="sources">${sources}</ul>` : ""}
              <p class="method">${method}</p>
              ${related ? `<h2 id="related">${esc(c.moreFrom(scopeName))}</h2><ul class="related">${related}</ul>` : ""}
            </div>
          </div>
        </article>
${cta(lang)}`;

  return layout({
    lang,
    title: `${a.title} — Implica`,
    description: a.description,
    canonical: url,
    alternates,
    head,
    main,
  });
}

function listPage(list, scope, lang = "en") {
  const c = t(lang);
  const page = list.page;
  const at = (l, n) => `${t(l).list}${n > 1 ? `?page=${n}` : ""}`;
  const canonical = `${ORIGIN}${at(lang, page)}`;
  // Page N of one language is not a translation of page N of the other once their totals differ,
  // so only the first pages are paired.
  const alternates = page === 1 ? Object.fromEntries(LANGS.map((l) => [l, `${ORIGIN}${t(l).list}`])) : undefined;
  const items = list.articles
    .map(
      (a) =>
        `<li><a href="${esc(articlePath(lang, scope, a.slug))}"><span class="mono-label">${esc(day(a.publishedAt, lang).toUpperCase())}${a.category ? ` · ${esc(String(a.category).toUpperCase())}` : ""}</span><span class="t">${esc(a.title)}</span><span class="s">${esc(a.summary)}</span></a></li>`,
    )
    .join("\n");
  const newer = page > 1 ? `<a class="btn btn-ghost btn-sm" rel="prev" href="${at(lang, page - 1)}">${esc(c.newer)}</a>` : "<span></span>";
  const older = page < list.totalPages ? `<a class="btn btn-ghost btn-sm" rel="next" href="${at(lang, page + 1)}">${esc(c.older)}</a>` : "<span></span>";

  const main = `
        <section class="wrap story">
          <div class="glow glow-story" aria-hidden="true"></div>
          <div class="story-col">
            <header class="stories-head">
              <h1 class="stories-title">${esc(c.listH1)}</h1>
              <p class="stories-lede">${esc(c.listLede)}</p>
            </header>
            ${items ? `<ul class="story-list">${items}</ul>` : `<p class="stories-empty">${esc(c.empty)}</p>`}
            ${list.totalPages > 1 ? `<nav class="pager" aria-label="Pages">${newer}<span class="mono-label">${esc(c.pageOf(page, list.totalPages))}</span>${older}</nav>` : ""}
          </div>
        </section>
${cta(lang)}`;

  return layout({
    lang,
    title: `${c.listTitle(page)} — Implica`,
    description: c.listDescription,
    canonical,
    alternates,
    main,
  });
}

module.exports = {
  ORIGIN,
  LANGS,
  articlePath,
  CACHE_LIVE,
  CACHE_FROZEN,
  CACHE_LIST,
  CACHE_MISS,
  api,
  esc,
  day,
  articlePage,
  listPage,
  messagePage,
};
