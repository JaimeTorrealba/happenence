<script setup>
const { data: HomePage } = await useAsyncData("home-page", () =>
  queryCollection("pages").path("/").first(),
);

if (!HomePage.value) {
  throw createError({ statusCode: 404, statusMessage: "Home page content not found", fatal: true });
}

useSeoMeta({
  description: () => HomePage.value?.description,
  ogDescription: () => HomePage.value?.description,
  ogType: "website",
  twitterCard: "summary_large_image",
});

// Point agents at the Markdown twin of this page (served by Nuxt Content's llms integration).
useHead({
  link: [{ rel: "alternate", type: "text/markdown", href: "/raw/index.md" }],
});

// Bound as a runtime URL (served from public/) so Vite does not try to bundle it.
const HomeLogoSrc = "/happenence-logo.svg";

const LogoTitleRef = ref(null);
useFadeIn(LogoTitleRef);
</script>

<template>
  <main id="main" class="home-container">
    <!-- The logo keeps the h1 so the page still has "Happenence" as its main heading -->
    <h1 ref="LogoTitleRef" class="home-title reveal-fade">
      <img :src="HomeLogoSrc" alt="Happenence" class="home-logo" width="324" height="68" />
    </h1>
    <div class="home-column"><HomeIntro :page="HomePage" /></div>
    <!-- The frame reserves the scene height in the SSR HTML so nothing jumps when the canvas mounts.
         Lazy- keeps three.js and the scene in their own chunk, fetched after the page has hydrated. -->
    <div class="home-scene">
      <div class="home-scene-frame">
        <ClientOnly><LazyHomeCherryTree /></ClientOnly>
      </div>
    </div>
  </main>
</template>

<style scoped>
.home-container {
  width: 100%;
  max-width: 1344px;
  margin-inline: auto;
  padding-inline: 1rem;
}
.home-title {
  font-size: 3rem;
  text-align: center;
  padding-bottom: 1rem;
}
.home-logo {
  width: min(560px, 100%);
  height: auto;
  margin-inline: auto;
}
.home-column {
  max-width: 672px;
  margin-inline: auto;
  padding: 0.75rem;
}
/* The camera has a fixed vertical field of view, so a scene that is too narrow for its height clips
   the tree's sides. That happens below 1100px in the split layout and below 560px stacked; only in
   those ranges does the height follow the width (the 853 x 800 px shape of the widest desktop
   column), so the scene keeps its shape and just gets smaller. */
.home-scene {
  container-type: inline-size;
}
.home-scene-frame {
  --home-scene-max-height: clamp(320px, 60vh, 640px);
  height: var(--home-scene-max-height);
}
@media (max-width: 559.98px), (min-width: 768px) and (max-width: 1099.98px) {
  .home-scene-frame {
    height: min(var(--home-scene-max-height), 100cqw * 15 / 16);
  }
}
@media (min-width: 768px) {
  .home-container {
    display: grid;
    /* minmax(0, …) lets the columns shrink below the canvas's pixel width when the window narrows */
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
    align-items: center;
    gap: 2rem;
  }
  /* The logo spans both columns so it sits centred above the split */
  .home-title {
    grid-column: 1 / -1;
  }
  .home-scene-frame {
    --home-scene-max-height: clamp(480px, 80vh, 800px);
  }
}
</style>
