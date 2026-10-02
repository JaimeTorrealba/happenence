<script setup>
import "~/assets/main.css";

// Pages without their own title (like home) fall back to the brand name alone.
useHead({
  titleTemplate: (PageTitle) =>
    PageTitle && PageTitle !== "Happenence" ? `${PageTitle} · Happenence` : "Happenence",
});
</script>

<template>
  <NuxtPage />
  <SiteFooter />
</template>

<style>
.debug {
  border: 1px solid red;
}
main {
  min-height: 100vh;
}
.cards-wrapper {
  height: 50vh;
}
.overflow-hidden {
  overflow: hidden;
}
</style>
