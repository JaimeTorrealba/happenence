<script setup>
import "~/assets/main.css";

// Pages without their own title (like home) fall back to the brand name alone.
useHead({
  titleTemplate: (PageTitle) =>
    PageTitle && PageTitle !== "Happenence" ? `${PageTitle} · Happenence` : "Happenence",
});

// Share preview for every page. TODO: add public/og-image.png (1200 x 630) — until then the tag 404s.
useSeoMeta({
  ogImage: "/og-image.png",
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: "Happenence",
  twitterImage: "/og-image.png",
});

// Route changes play the overlay in PageTransitionOverlay.vue instead of a CSS transition: it covers
// the old page before Vue swaps it, then uncovers the new one. Nuxt merges these hooks over
// app.pageTransition in nuxt.config, keeping its own finish hook and scroll timing.
const PageTransitionOverlayRef = ref(null);
const PageTransitionHooks = {
  mode: "out-in",
  css: false,
  onLeave: (PageElement, done) => PageTransitionOverlayRef.value.coverPageForNavigation(done),
  onEnter: (PageElement, done) => PageTransitionOverlayRef.value.revealPageAfterNavigation(done),
};
</script>

<template>
  <a href="#main" class="skip-link">Skip to content</a>
  <!-- Tells screen readers the new page title after each client-side navigation -->
  <NuxtRouteAnnouncer />
  <SiteNavbar />
  <NuxtPage :transition="PageTransitionHooks" />
  <SiteFooter />
  <PageTransitionOverlay ref="PageTransitionOverlayRef" />
</template>

<style>
/* Off-screen until focused; then it sits above the navbar and the transition overlay */
.skip-link {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 100;
  padding: 0.5rem 1rem;
  background: #f5f3ee;
  color: #7c6052;
  border-radius: 4px;
  transform: translateY(-200%);
}
.skip-link:focus-visible {
  transform: none;
  outline: 2px solid #7c6052;
}
/* Navbar + page + footer fill at least the viewport; the footer sits at the bottom on short pages
   instead of a 100vh <main> pushing it (and a scrollbar) below the fold. */
#__nuxt {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}
#__nuxt > footer {
  margin-top: auto;
}
.overflow-hidden {
  overflow: hidden;
}
</style>
