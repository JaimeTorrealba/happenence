<script setup>
import gsap from "gsap";

// Bound as runtime URLs (served from public/) so Vite does not try to bundle them.
const FooterImages = {
  BranchLeft: "/images/footer/left-tree.svg",
  BranchRight: "/images/footer/right-tree.svg",
  Wordmark: "/happenence-logo.svg",
};

const FooterRef = ref(null);
const PetalsRef = ref(null);
let BranchesMatchMedia = null;
let BranchTimelines = [];
let IsFooterOffScreen = false;
let FooterVisibilityObserver = null;

// A soft gust: the branch bends (skew + tilt, pivoting at the trunk so the tips move most),
// springs back a little past rest, settles, then waits for the next gust.
// Direction mirrors the right branch so both droop the same way.
// Near the peak of the bend the gust shakes a few petals loose from that tree.
const getBranchBendTimeline = (Branch, Side, StartDelay) => {
  const Direction = Side === "left" ? 1 : -1;
  return gsap
    .timeline({ repeat: -1, repeatDelay: 1.5, delay: StartDelay })
    .call(() => PetalsRef.value?.releasePetalsFromSide(Side), null, 1.8)
    .to(Branch, { skewY: 3 * Direction, rotation: 1.2 * Direction, duration: 2.4, ease: "sine.inOut" }, 0)
    .to(Branch, { skewY: -1 * Direction, rotation: -0.4 * Direction, duration: 2, ease: "sine.inOut" })
    .to(Branch, { skewY: 0.6 * Direction, rotation: 0.2 * Direction, duration: 1.6, ease: "sine.inOut" })
    .to(Branch, { skewY: 0, rotation: 0, duration: 1.8, ease: "sine.inOut" });
};

onMounted(() => {
  const BranchLeft = FooterRef.value.querySelector(".footer-branch--left");
  const BranchRight = FooterRef.value.querySelector(".footer-branch--right");

  BranchesMatchMedia = gsap.matchMedia();
  BranchesMatchMedia.add("(prefers-reduced-motion: no-preference)", () => {
    BranchTimelines = [getBranchBendTimeline(BranchLeft, "left", 0), getBranchBendTimeline(BranchRight, "right", 1.4)];
    if (IsFooterOffScreen) setFooterMotionPaused(true);
    return () => (BranchTimelines = []);
  });

  FooterVisibilityObserver = new IntersectionObserver(([Entry]) => {
    IsFooterOffScreen = !Entry.isIntersecting;
    setFooterMotionPaused(IsFooterOffScreen);
  });
  FooterVisibilityObserver.observe(FooterRef.value);
});

// The gusts and idle petals loop forever, so they stop while the footer is off-screen
// instead of keeping GSAP's ticker busy on every page.
const setFooterMotionPaused = (IsPaused) => {
  BranchTimelines.forEach((Timeline) => (IsPaused ? Timeline.pause() : Timeline.resume()));
  PetalsRef.value?.setIdleDriftPaused(IsPaused);
};

onBeforeUnmount(() => {
  FooterVisibilityObserver?.disconnect();
  BranchesMatchMedia?.revert();
});
</script>

<template>
  <footer ref="FooterRef" class="site-footer">
    <FooterPetals ref="PetalsRef" />
    <span class="footer-branch footer-branch--left" aria-hidden="true">
      <img :src="FooterImages.BranchLeft" alt="" />
    </span>
    <span class="footer-branch footer-branch--right" aria-hidden="true">
      <img :src="FooterImages.BranchRight" alt="" />
    </span>
    <div class="footer-content">
      <NuxtLink to="/" class="footer-wordmark" aria-label="Happenence home">
        <img :src="FooterImages.Wordmark" alt="Happenence" width="324" height="68" />
      </NuxtLink>
      <NuxtLink to="/legal" class="footer-legal">Legal</NuxtLink>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 128px;
  padding: 1rem;
  background: #f5f3ee;
}
.footer-branch {
  position: absolute;
  top: 0;
}
.footer-branch img {
  height: 100%;
  width: auto;
}
.footer-branch--left {
  left: 0;
  height: 128px;
  transform-origin: left center;
}
.footer-branch--right {
  right: 0;
  height: 98px;
  transform-origin: right center;
}
.footer-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}
.footer-wordmark img {
  width: 320px;
  height: auto;
}
.footer-legal {
  /* Navbar brown: 5.2:1 on the footer background (#8a6a55 was 4.4:1, under AA for this small text) */
  color: #7c6052;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.footer-legal:hover,
.footer-legal:focus-visible {
  text-decoration: underline;
}
@media (max-width: 640px) {
  .footer-branch--left {
    height: 72px;
  }
  .footer-branch--right {
    height: 56px;
  }
  .footer-wordmark img {
    width: 200px;
  }
}
</style>
