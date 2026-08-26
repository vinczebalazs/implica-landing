/* ==========================================================================
   Implica — smart download routing
   Detects iOS / Android via user agent and points store buttons at the
   correct app store. Mirrors the logic used on implica-web.
   ========================================================================== */

(function () {
  var IOS_URL = "https://apps.apple.com/app/id6759221897";
  var ANDROID_URL = "https://play.google.com/store/apps/details?id=com.flystraightai.implica";

  function detectPlatform() {
    var ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
    if (/Android/i.test(ua)) return "android";
    return "desktop";
  }

  // Exposed so other pages (e.g. /download, used for QR codes) can reuse the
  // same store URLs and platform detection without duplicating them.
  window.ImplicaStores = {
    IOS_URL: IOS_URL,
    ANDROID_URL: ANDROID_URL,
    detectPlatform: detectPlatform,
  };

  // Which store a resolved href points at, or null if it isn't a store link.
  // Matching on the destination rather than on `data-store` deliberately: it
  // also covers /download's hardcoded fallback buttons, and it ignores the
  // `data-store="auto"` CTAs that stay pointed at the in-page #get anchor on
  // desktop, which are not store taps.
  function storeFor(href) {
    if (!href) return null;
    if (href.indexOf("apps.apple.com") !== -1) return "ios";
    if (href.indexOf("play.google.com") !== -1) return "android";
    return null;
  }

  /* Tapping through to a store is the last thing we can observe before the
     visitor leaves for the App Store or Play. On iOS especially it is the only
     signal that ever links a marketing channel to an install: Apple reports
     downloads per campaign in aggregate and never tells the app which campaign
     a user came from, so this click and App Store Connect's download count are
     the two halves that have to be read side by side.

     Autocapture already records these clicks, but identifies them by DOM
     structure and label text, which breaks whenever the markup is touched.

     UTM parameters are deliberately NOT passed here — PostHog attaches the
     ones present in the current URL to every event it sends, so listing them
     again would only risk the two copies disagreeing. */
  document.addEventListener("click", function (event) {
    var target = event.target;
    var link = target && target.closest ? target.closest("a[href]") : null;
    if (!link) return;

    var store = storeFor(link.href);
    if (!store) return;

    if (typeof window.posthog === "undefined") return;

    // The navigation starts immediately, and PostHog's normal queue only makes
    // a best-effort flush on unload. sendBeacon hands the request to the
    // browser to deliver after the page is gone.
    window.posthog.capture(
      "store_link_clicked",
      { store: store, platform: detectPlatform() },
      { transport: "sendBeacon", send_instantly: true }
    );
  });

  document.addEventListener("DOMContentLoaded", function () {
    var platform = detectPlatform();

    // Buttons that are explicitly labeled for a given store always point
    // there, regardless of the visitor's own platform.
    document.querySelectorAll('[data-store="ios"]').forEach(function (el) {
      el.href = IOS_URL;
    });
    document.querySelectorAll('[data-store="android"]').forEach(function (el) {
      el.href = ANDROID_URL;
    });

    // Generic "get the app" CTAs route straight to the visitor's own store
    // when we can tell which platform they're on. On desktop there's no
    // single right answer, so those links fall back to the in-page download
    // section, where both stores are listed.
    var storeUrl = platform === "ios" ? IOS_URL : platform === "android" ? ANDROID_URL : null;
    if (storeUrl) {
      document.querySelectorAll('[data-store="auto"]').forEach(function (el) {
        el.href = storeUrl;
      });
    }
  });
})();
