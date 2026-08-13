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
