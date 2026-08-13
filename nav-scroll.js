/* ==========================================================================
   Implica — header scroll fade
   As the page scrolls, the sticky header gradually gains a background so
   content passing underneath is hidden. At the very top the header stays
   transparent so the hero glow shows through.
   ========================================================================== */

(function () {
  var header = document.getElementById("primary-header");
  if (!header) return;

  // Distance (px) over which the header fades from transparent to solid.
  var FADE_DISTANCE = 120;
  var ticking = false;

  // Publish the header's measured height so the hero can size itself to the
  // remaining viewport (`100svh - var(--header-h)`) without hardcoding a value
  // that drifts whenever the header's padding or type changes.
  function measure() {
    document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
  }

  measure();
  if (window.ResizeObserver) new ResizeObserver(measure).observe(header);
  else window.addEventListener("resize", measure);

  function update() {
    var progress = Math.min(window.scrollY / FADE_DISTANCE, 1);
    header.style.setProperty("--hdr-progress", progress);
    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }

  update();
  window.addEventListener("scroll", onScroll, { passive: true });
})();
