<script setup>
import gsap from "gsap";

// Route-change overlay over the whole viewport (navbar and footer included): bands in the
// destination's colour sweep in from the left, its name rises in the middle and a few petals ride the
// gust; once the new page is in place it all sweeps out to the right. app.vue calls the two exposed
// functions from <NuxtPage>'s transition hooks; the timelines live in utils/pageTransitionAnimations.js.

const BandCount = 4;
// Light tones so they read on every band colour.
const OverlayPetals = [
  { Size: 18, Tone: "#f5e6d8" },
  { Size: 24, Tone: "#f0d2bc" },
  { Size: 14, Tone: "#ffd9df" },
  { Size: 20, Tone: "#f5e6d8" },
  { Size: 16, Tone: "#f0d2bc" },
  { Size: 22, Tone: "#ffd9df" },
];

const Router = useRouter();
const IsPageCovered = useIsPageCovered();
const OverlayRef = ref(null);
// Starts on the fallback theme; each cover switches it to the destination page.
const PageTransitionTheme = shallowRef(getPageTransitionThemeByRouteName());
let OverlayTimeline = null;
// The done() of the Vue transition hook that is playing; Vue waits on it to swap or finish the page.
let PendingTransitionDone = null;
let IsOverlayShown = false;

const getIsReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const showOverlay = () => {
  gsap.set(OverlayRef.value, { visibility: "visible" });
  IsOverlayShown = true;
};

const hideOverlay = () => {
  gsap.set(OverlayRef.value, { visibility: "hidden" });
  IsOverlayShown = false;
  IsPageCovered.value = false;
};

// A click mid-transition starts a new hook: stop the running timeline and release Vue from the old one,
// so the overlay never waits on a hook that will not finish.
const finishRunningTransition = () => {
  OverlayTimeline?.kill();
  OverlayTimeline = null;
  const PendingDone = PendingTransitionDone;
  PendingTransitionDone = null;
  PendingDone?.();
};

const getOverlayParts = () => {
  const Overlay = OverlayRef.value;
  return {
    Overlay,
    Bands: Overlay.querySelectorAll(".page-transition-band"),
    Label: Overlay.querySelector(".page-transition-label"),
    Petals: Overlay.querySelectorAll(".page-transition-petal"),
  };
};

const playOverlayTimeline = (Timeline, done, onTimelineComplete) => {
  PendingTransitionDone = done;
  OverlayTimeline = Timeline.eventCallback("onComplete", () => {
    onTimelineComplete?.();
    finishRunningTransition();
  });
};

// Vue's onLeave: cover the old page, then let Vue swap in the new one.
const coverPageForNavigation = (done) => {
  finishRunningTransition();
  if (getIsReducedMotion()) {
    hideOverlay();
    return done();
  }
  // The route has already changed, so this is the destination.
  PageTransitionTheme.value = getPageTransitionThemeByRouteName(Router.currentRoute.value.name);
  IsPageCovered.value = true;
  const IsOverlayVisible = IsOverlayShown;
  if (!IsOverlayVisible) showOverlay();
  playOverlayTimeline(getPageCoverTimeline({ ...getOverlayParts(), IsOverlayVisible }), done);
};

// Vue's onEnter: the new page is in place (Nuxt scrolls it a frame later, still covered),
// so uncover it, then hide the overlay.
const revealPageAfterNavigation = (done) => {
  finishRunningTransition();
  if (getIsReducedMotion() || !IsOverlayShown) {
    hideOverlay();
    return done();
  }
  playOverlayTimeline(getPageRevealTimeline(getOverlayParts()), done, hideOverlay);
};

onBeforeUnmount(() => OverlayTimeline?.kill());

defineExpose({ coverPageForNavigation, revealPageAfterNavigation });
</script>

<template>
  <div
    ref="OverlayRef"
    class="page-transition-overlay"
    :style="{ '--page-transition-color': PageTransitionTheme.Color }"
    aria-hidden="true"
  >
    <div v-for="BandIndex in BandCount" :key="BandIndex" class="page-transition-band" />
    <div class="page-transition-label-mask">
      <p class="page-transition-label">{{ PageTransitionTheme.Label }}</p>
    </div>
    <span v-for="(Petal, Index) in OverlayPetals" :key="Index" class="page-transition-petal">
      <PetalShape :size="Petal.Size" :tone="Petal.Tone" />
    </span>
  </div>
</template>

<style scoped>
/* Hidden until a route change; while shown it covers the whole viewport and blocks every click. */
.page-transition-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  grid-template-rows: repeat(4, 1fr);
  overflow: hidden;
  visibility: hidden;
}
/* The 1px overlap hides hairline seams between bands at fractional heights. */
.page-transition-band {
  margin-bottom: -1px;
  background: var(--page-transition-color);
}
.page-transition-label-mask {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  overflow: hidden;
}
.page-transition-label {
  color: #f5f3ee;
  font-family: "Lato", system-ui, sans-serif;
  font-weight: 400;
  font-size: clamp(2.5rem, 9vw, 6.5rem);
  line-height: 1.2;
  white-space: nowrap;
}
.page-transition-petal {
  position: absolute;
  top: 0;
  left: 0;
}
.page-transition-petal svg {
  display: block;
}
</style>
