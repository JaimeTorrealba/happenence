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
  <main class="home-container">
    <!-- The logo keeps the h1 so the page still has "Happenence" as its main heading -->
    <h1 ref="LogoTitleRef" class="home-title reveal-fade">
      <img :src="HomeLogoSrc" alt="Happenence" class="home-logo" />
    </h1>
    <div class="home-column"><HomeIntro :page="HomePage" /></div>
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
</style>
