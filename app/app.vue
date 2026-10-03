<script setup>
import "~/assets/main.css";

// Pages without their own title (like home) fall back to the brand name alone.
useHead({
  titleTemplate: (PageTitle) =>
    PageTitle && PageTitle !== "Happenence" ? `${PageTitle} · Happenence` : "Happenence",
});
</script>

<template>
  <SiteNavbar />
  <NuxtPage />
  <SiteFooter />
</template>

<style>
.debug {
  border: 1px solid red;
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
.cards-wrapper {
  height: 50vh;
}
.overflow-hidden {
  overflow: hidden;
}
</style>
