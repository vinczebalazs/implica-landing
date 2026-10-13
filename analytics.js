/* ==========================================================================
   Implica — PostHog analytics
   Same PostHog project (and reverse-proxied ingestion host) as implica-web,
   so pageviews on this static site land in the same dataset. No bundler
   here, so this is the standard snippet install rather than the npm package.
   ========================================================================== */

!function (t, e) {
  var o, n, p, r;
  e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) {
    function g(t, e) {
      var o = e.split(".");
      2 == o.length && (t = t[o[0]], e = o[1]);
      t[e] = function () {
        t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
      };
    }
    (p = t.createElement("script")).type = "text/javascript";
    p.crossOrigin = "anonymous";
    p.async = !0;
    p.src = s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js";
    (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r);
    var u = e;
    for (void 0 !== a ? u = e[a] = [] : a = "posthog", u.people = u.people || [],
      u.toString = function (t) {
        var e = "posthog";
        return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e;
      },
      u.people.toString = function () { return u.toString(1) + ".people (stub)"; },
      o = "init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),
      n = 0; n < o.length; n++) g(u, o[n]);
    e._i.push([i, s, a]);
  }, e.__SV = 1);
}(document, window.posthog || []);

posthog.init("phc_24Ns2up7p5rSlmBpACzKd66vBZ83Z6WMaUqPeLSC1hx", {
  api_host: "https://t.implica.app",
  person_profiles: "identified_only",
});

/* Human check for click counting. Email security scanners open newsletter links in a real
   browser on a server, so on paper a scanner's visit looks like a reader's. What they don't do
   is scroll, move a mouse, tap, or type. The first such input on a page sends one
   `visitor_interacted`, and a computer visit to /download counts as a real click only if the
   same visitor sends one afterwards. /download itself redirects before anyone can interact, so
   phone clicks are judged there instead (see `automation` in download.html). */
(function () {
  var EVENTS = ["pointermove", "pointerdown", "scroll", "keydown", "touchstart"];
  var sent = false;

  function onInteraction(event) {
    if (sent) return;
    sent = true;
    EVENTS.forEach(function (name) {
      window.removeEventListener(name, onInteraction, true);
    });
    posthog.capture("visitor_interacted", {
      interaction: event.type,
      automation: navigator.webdriver === true,
    });
  }

  EVENTS.forEach(function (name) {
    window.addEventListener(name, onInteraction, { capture: true, passive: true });
  });
})();
