/* ==========================================================================
   Implica — story share pages

   implica-be hands the app a `shareUrl` of https://implica.app/story/{scope}/{eventId}
   (see briefing.dto.ts). Everything shared out of the app points here, so this
   route has two jobs:

     1. Serve the story's og: tags to the unfurler (iMessage, Slack, X, WhatsApp).
        The card image is rendered by the API at /og/{scope}/{eventId}.png and
        proxied through this domain — see the rewrite in vercel.json. The
        headline is drawn INTO that image, so no story text is fetched here:
        the page needs no API key and still unfurls if the API is unreachable.

     2. Send the human somewhere useful. iOS/Android open the app directly via
        the universal link (.well-known/apple-app-site-association matches the
        /story/:scope/:eventId pattern), so anyone who reaches this HTML does
        not have the app — route them to their store, same as /download.

   Reached via a rewrite, so scope and eventId arrive as query params.
   ========================================================================== */

const ORIGIN = "https://implica.app";

// 'world' for the global feed, or a locale the app round-trips ('hu-HU', 'en-HU').
// Case matters downstream: briefing.service resolveLocale() rejects anything but
// lowercase-lang/uppercase-region, so both halves pass through untouched.
const SCOPE = /^(world|[a-z]{2}-[A-Z]{2})$/;
// Code-minted 8 hex, per the Story schema. Identity keys on it, forever, and the
// lookup is an exact match — so this is passed through verbatim too.
const EVENT_ID = /^[0-9a-f]{8}$/;

const IOS_URL = "https://apps.apple.com/app/id6759221897";
const ANDROID_URL = "https://play.google.com/store/apps/details?id=com.flystraightai.implica";

function page(scope, eventId) {
  const url = `${ORIGIN}/story/${scope}/${eventId}`;
  const image = `${ORIGIN}/og/${scope}/${eventId}.png`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Implica — Today's stories, explained.</title>
    <!-- The share target, not a content page: implica-web owns organic search. -->
    <meta name="robots" content="noindex" />
    <meta name="theme-color" content="#08080a" />
    <link rel="icon" href="/assets/icon.png" type="image/png" />
    <link rel="apple-touch-icon" href="/assets/icon.png" />

    <!-- The headline lives inside the card image, so the text tags stay generic.
         The site-wide cover belongs to the homepage alone — never a story. -->
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Implica" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="Implica" />
    <meta property="og:description" content="Today's stories, explained." />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:secure_url" content="${image}" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="A story on Implica." />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Implica" />
    <meta name="twitter:description" content="Today's stories, explained." />
    <meta name="twitter:image" content="${image}" />
    <meta name="twitter:image:alt" content="A story on Implica." />

    <link rel="stylesheet" href="/styles.css" />

    <!-- Blocking, as early as possible, so the redirect fires before anything
         paints. Crawlers run no JS — they only ever see the tags above. -->
    <script src="/download.js"></script>
    <script>
      (function () {
        var stores = window.ImplicaStores;
        var platform = stores.detectPlatform();
        var dest =
          platform === "ios" ? stores.IOS_URL : platform === "android" ? stores.ANDROID_URL : "/";
        window.location.replace(dest);
      })();
    </script>
    <noscript><meta http-equiv="refresh" content="0; url=/" /></noscript>
  </head>
  <body id="top">
    <div class="page">
      <main id="main">
        <section class="redirect-screen">
          <img src="/assets/icon.png" alt="" width="56" height="56" class="redirect-icon" />
          <p class="redirect-text">Opening this story in Implica…</p>
          <div class="redirect-actions">
            <a class="btn btn-gold btn-lg" href="${IOS_URL}">Download for iPhone</a>
            <a class="btn btn-ghost btn-lg" href="${ANDROID_URL}">Get it on Android</a>
          </div>
          <a class="redirect-home" href="/">Or visit implica.app</a>
        </section>
      </main>
    </div>
  </body>
</html>
`;
}

const NOT_FOUND = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Story not found — Implica</title>
    <meta name="robots" content="noindex" />
    <meta name="theme-color" content="#08080a" />
    <link rel="icon" href="/assets/icon.png" type="image/png" />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body id="top">
    <div class="page">
      <main id="main">
        <section class="redirect-screen">
          <img src="/assets/icon.png" alt="" width="56" height="56" class="redirect-icon" />
          <p class="redirect-text">That story link doesn't look right.</p>
          <a class="redirect-home" href="/">Go to implica.app</a>
        </section>
      </main>
    </div>
  </body>
</html>
`;

module.exports = (req, res) => {
  const { scope, eventId } = req.query;

  // Anything that is not a well-formed story identity is a bad link, not a
  // missing story — the API is never asked, so it cannot be probed from here.
  if (!SCOPE.test(scope || "") || !EVENT_ID.test(eventId || "")) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=600");
    return res.status(404).send(NOT_FOUND);
  }

  // Stories are immutable and this page carries none of their text, so the
  // render only ever depends on the path. A deploy purges the edge cache.
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=600, s-maxage=31536000, immutable");
  return res.status(200).send(page(scope, eventId));
};
