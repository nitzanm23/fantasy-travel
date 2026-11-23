/**
 * Fantasy Travel: opening screen timing.
 *
 * Loaded in <head> without `defer`, so `.is-loading` is set before the first paint and the
 * page never flashes. With JavaScript disabled the class is never added and the page shows
 * immediately. CSS failsafes in page-loader.css reveal the page even if this script fails.
 */

(() => {
  const LOADER_DURATION_MS = 3000;
  const root = document.documentElement;

  root.classList.add("is-loading");

  // A fixed timer, not the `load` event, so slow images cannot extend the intro.
  window.setTimeout(() => {
    root.classList.remove("is-loading");
    // Content was hidden while AOS measured positions; recalculate now that it is visible.
    window.AOS?.refreshHard?.();
  }, LOADER_DURATION_MS);
})();
