/**
 * Fantasy Travel: page behavior.
 *
 * Hero slideshow (with pause control), navbar scroll and mobile menu state, footer year,
 * and AOS setup. Loaded with `defer`. Works without AOS; the slideshow and AOS both
 * respect `prefers-reduced-motion`.
 */

(() => {
  // --- Environment ---
  const motionPreference = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  // Lets CSS tell a no-JavaScript page apart (see PROGRESSIVE ENHANCEMENT in index.css).
  document.documentElement.classList.add("has-js");

  // --- Third-party Init ---
  if (window.AOS && typeof window.AOS.init === "function") {
    document.documentElement.classList.add("aos-enabled");
    window.AOS.init({
      disable: () => motionPreference.matches,
      duration: 700,
      easing: "ease-out-cubic",
      once: false,
      mirror: true,
      offset: 80,
    });
  }

  // --- Configuration ---
  const CONFIG = Object.freeze({
    SLIDER_IMAGES: Object.freeze([
      "img1.webp",
      "img2.webp",
      "img3.webp",
      "img4.webp",
      "img5.webp",
      "img6.webp",
    ]),
    SLIDER_INTERVAL_MS: 5000,
    NAVBAR_SCROLL_THRESHOLD: 188,
    GRID_STEP_DELAY_MS: 100,
    MOBILE_MENU_QUERY: "(max-width: 798px)", // Keep in sync with the breakpoint in index.css.
  });

  // --- DOM Cache ---
  const dom = Object.freeze({
    sliderImage: document.querySelector(".hero-section__background-image"),
    sliderGridItems: [...document.querySelectorAll(".hero-section__grid-item")],
    pauseButton: document.querySelector(".hero-section__pause"),
    navbar: document.querySelector(".navbar"),
    navbarToggle: document.querySelector(".navbar__toggle"),
    navbarLinks: [...document.querySelectorAll(".navbar__link")],
    copyrightLine: document.querySelector(".footer__copyright"),
    inertRegions: [...document.querySelectorAll(".skip-link, main, .footer")],
  });

  // --- State ---
  const state = {
    currentImageIndex: 0,
    isPaused: false,
    sliderTimer: undefined,
    // Incremented on cancel, so an in-flight transition can detect it is stale.
    transitionGeneration: 0,
    transitionTimers: new Set(),
  };

  // --- Hero Slider ---

  /**
   * Stops any wipe in progress and resets the grid panels to hidden.
   */
  function cancelTransition() {
    state.transitionGeneration += 1;
    state.transitionTimers.forEach((timer) => window.clearTimeout(timer));
    state.transitionTimers.clear();
    dom.sliderGridItems.forEach((item) => item.classList.add("is-hidden"));
  }

  /**
   * setTimeout that cancelTransition() can clear.
   *
   * @param {() => void} callback
   * @param {number} delay - milliseconds
   */
  function scheduleTransition(callback, delay) {
    const timer = window.setTimeout(() => {
      state.transitionTimers.delete(timer);
      callback();
    }, delay);
    state.transitionTimers.add(timer);
  }

  /**
   * Advances to the next hero image with the grid wipe: panels cover the image one by one,
   * the source is swapped while covered, then the panels uncover it in the same order.
   */
  async function changeSliderImage() {
    if (motionPreference.matches || document.hidden || !dom.sliderImage) return;

    const generation = state.transitionGeneration;
    const nextIndex =
      (state.currentImageIndex + 1) % CONFIG.SLIDER_IMAGES.length;
    const nextImage = new Image();
    nextImage.src = `./assets/images/${CONFIG.SLIDER_IMAGES[nextIndex]}`;

    // Decode before the wipe so a slow or failed request cannot reveal an empty background.
    try {
      await nextImage.decode();
    } catch {
      return;
    }
    if (generation !== state.transitionGeneration) return;

    dom.sliderGridItems.forEach((item, index) => {
      scheduleTransition(
        () => item.classList.remove("is-hidden"),
        index * CONFIG.GRID_STEP_DELAY_MS,
      );
    });

    const coverDelay =
      dom.sliderGridItems.length * CONFIG.GRID_STEP_DELAY_MS + 500;
    scheduleTransition(() => {
      state.currentImageIndex = nextIndex;
      dom.sliderImage.src = nextImage.src;
      dom.sliderGridItems.forEach((item, index) => {
        scheduleTransition(
          () => item.classList.add("is-hidden"),
          index * CONFIG.GRID_STEP_DELAY_MS,
        );
      });
    }, coverDelay);
  }

  /**
   * (Re)starts the slideshow interval only while it may run: not paused, motion allowed,
   * and the tab visible. Called on every change to any of those three conditions.
   */
  function syncSlideshow() {
    window.clearInterval(state.sliderTimer);
    cancelTransition();

    if (!state.isPaused && !motionPreference.matches && !document.hidden) {
      state.sliderTimer = window.setInterval(
        changeSliderImage,
        CONFIG.SLIDER_INTERVAL_MS,
      );
    }
  }

  function togglePause() {
    state.isPaused = !state.isPaused;
    dom.pauseButton.setAttribute("aria-pressed", String(state.isPaused));
    dom.pauseButton.textContent = state.isPaused
      ? "Resume slideshow"
      : "Pause slideshow";
    syncSlideshow();
  }

  // --- Navbar ---

  /**
   * While the mobile menu is open, removes everything outside the header from the tab
   * order, including the skip link, whose target would otherwise be inert.
   *
   * @param {boolean} isInert
   */
  function setPageInert(isInert) {
    dom.inertRegions.forEach((region) => {
      region.inert = isInert;
    });
  }

  function closeMobileMenu() {
    if (!dom.navbar || !dom.navbarToggle) return;

    dom.navbar.classList.remove("is-open");
    setPageInert(false);
    dom.navbarToggle.setAttribute("aria-expanded", "false");
    dom.navbarToggle.setAttribute("aria-label", "Open navigation menu");
  }

  function toggleMobileMenu() {
    if (!dom.navbar || !dom.navbarToggle) return;

    const isOpen = dom.navbar.classList.toggle("is-open");
    setPageInert(isOpen);

    dom.navbarToggle.setAttribute("aria-expanded", String(isOpen));
    dom.navbarToggle.setAttribute(
      "aria-label",
      isOpen ? "Close navigation menu" : "Open navigation menu",
    );
  }

  /**
   * Closes the menu and moves keyboard focus to the linked section, so focus does not
   * stay inside a menu that is about to be hidden.
   *
   * @param {HTMLAnchorElement} link
   */
  function handleNavLinkClick(link) {
    closeMobileMenu();

    const target = document.querySelector(link.hash);
    target?.setAttribute("tabindex", "-1");
    target?.focus({ preventScroll: true });
  }

  function handleScroll() {
    if (!dom.navbar) return;

    dom.navbar.classList.toggle(
      "is-scrolled",
      window.scrollY >= CONFIG.NAVBAR_SCROLL_THRESHOLD,
    );
  }

  function handleKeyDown(event) {
    if (event.key === "Escape" && dom.navbar?.classList.contains("is-open")) {
      closeMobileMenu();
      dom.navbarToggle?.focus();
    }
  }

  // --- Footer ---
  function renderFooterYear() {
    if (!dom.copyrightLine) return;

    const currentYear = new Date().getFullYear();
    const portfolioUrl = "https://nm-dev.com";

    dom.copyrightLine.innerHTML = `&copy; ${currentYear} Fantasy Travel. Built by <a href="${portfolioUrl}" target="_blank" rel="noopener noreferrer"><svg class="footer__icon" aria-hidden="true" focusable="false"><use href="#icon-code" /></svg> NM Dev.</a>`;
  }

  // --- AOS ---

  /**
   * Lazy images change the page height after AOS measured it, so recompute its offsets
   * whenever one finishes loading.
   */
  function refreshAOSOnImageLoad() {
    document.querySelectorAll("img").forEach((image) => {
      if (!image.complete) {
        image.addEventListener("load", () => window.AOS?.refreshHard?.(), {
          once: true,
        });
      }
    });
  }

  // --- Events ---
  function wireEvents() {
    window.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("keydown", handleKeyDown);

    dom.navbarToggle?.addEventListener("click", toggleMobileMenu);
    dom.navbarLinks.forEach((link) => {
      link.addEventListener("click", () => handleNavLinkClick(link));
    });
    // Leaving the mobile layout with the menu open would leave the page inert.
    window
      .matchMedia(CONFIG.MOBILE_MENU_QUERY)
      .addEventListener("change", closeMobileMenu);

    if (dom.pauseButton) {
      dom.pauseButton.hidden = false;
      dom.pauseButton.addEventListener("click", togglePause);
    }
    motionPreference.addEventListener("change", syncSlideshow);
    document.addEventListener("visibilitychange", syncSlideshow);
  }

  // --- Init ---
  function init() {
    refreshAOSOnImageLoad();
    handleScroll();
    renderFooterYear();
    wireEvents();
    syncSlideshow();
  }

  init();
})();
