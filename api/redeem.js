/* ==========================================================================
   Implica — promo code redeem links

   Redemption itself is entirely in-app (implica-be's grant call needs the RevenueCat SDK's
   subscriber id, which only exists on-device), so a `https://implica.app/redeem-code?code=XYZ`
   link has exactly one job for anyone who reaches this HTML: iOS/Android with the app installed
   open it directly via the universal link (.well-known/apple-app-site-association matches the
   /redeem-code pattern) and never see this page at all. Anyone who does land here does not have
   the app — send them to their store, same as /download and /story.

   There is no deferred deep linking here (no Branch/AppsFlyer-style attribution SDK in this repo
   or implica-app) — the code in the URL does not survive the trip through the App/Play Store. A
   reader who installs from this page will need to tap the link again, or re-enter the code by
   hand from redeem-code.tsx's manual field, once the app is open.
   ========================================================================== */

const CODE = /^[a-zA-Z0-9_-]{1,64}$/;

const IOS_URL = "https://apps.apple.com/app/id6759221897";
const ANDROID_URL = "https://play.google.com/store/apps/details?id=com.flystraightai.implica";

function page(code) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Redeem your code — Implica</title>
    <meta name="robots" content="noindex" />
    <meta name="theme-color" content="#08080a" />
    <link rel="icon" href="/assets/icon.png" type="image/png" />
    <link rel="apple-touch-icon" href="/assets/icon.png" />
    <link rel="stylesheet" href="/styles.css" />

    <!-- Blocking, as early as possible, so the redirect fires before anything paints. -->
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
          <p class="redirect-text">Get Implica to redeem code ${code}.</p>
          <div class="redirect-actions">
            <a class="btn btn-gold btn-lg" href="${IOS_URL}">Download for iPhone</a>
            <a class="btn btn-ghost btn-lg" href="${ANDROID_URL}">Get it on Android</a>
          </div>
          <a class="redirect-home" href="/">Or visit implica.app</a>
        </section>
      </main>
    </div>

    <style>
      .redirect-screen {
        min-height: 100svh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 20px;
        padding: 40px;
        text-align: center;
      }
      .redirect-icon {
        border-radius: 22%;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
      }
      .redirect-text {
        font-family: var(--sans);
        color: var(--muted);
        font-size: 15px;
      }
      .redirect-actions {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 8px;
      }
      .redirect-home {
        margin-top: 12px;
        font-family: var(--mono);
        font-size: 13px;
        color: var(--dim);
        text-decoration: underline;
        text-underline-offset: 3px;
      }
      .redirect-home:hover {
        color: var(--muted);
      }
    </style>
  </body>
</html>
`;
}

const NOT_FOUND = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Code not found — Implica</title>
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
          <p class="redirect-text">That redeem link doesn't look right.</p>
          <a class="redirect-home" href="/">Go to implica.app</a>
        </section>
      </main>
    </div>

    <style>
      .redirect-screen {
        min-height: 100svh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 20px;
        padding: 40px;
        text-align: center;
      }
      .redirect-icon {
        border-radius: 22%;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
      }
      .redirect-text {
        font-family: var(--sans);
        color: var(--muted);
        font-size: 15px;
      }
      .redirect-home {
        margin-top: 12px;
        font-family: var(--mono);
        font-size: 13px;
        color: var(--dim);
        text-decoration: underline;
        text-underline-offset: 3px;
      }
      .redirect-home:hover {
        color: var(--muted);
      }
    </style>
  </body>
</html>
`;

module.exports = (req, res) => {
  const { code } = req.query;

  if (!CODE.test(code || "")) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=600");
    return res.status(404).send(NOT_FOUND);
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // Unlike /story, this isn't immutable content keyed by an id — it's just a redirect shell, so
  // no long-lived edge cache is worth the deploy-purge coordination /story relies on.
  res.setHeader("Cache-Control", "public, max-age=600");
  return res.status(200).send(page(code.toUpperCase()));
};
