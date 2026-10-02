<script setup>
import gsap from "gsap";

const { data: HomePage } = await useAsyncData("home-page", () =>
  queryCollection("pages").path("/").first(),
);

if (!HomePage.value) {
  throw createError({ statusCode: 404, statusMessage: "Home page content not found", fatal: true });
}

const Writings = computed(() => HomePage.value?.links ?? []);

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

const titleRef = ref(null);
onMounted(() => {
  gsap.from(titleRef.value, { y: -100, ease: "power2.out", duration: 1 });
});
</script>

<template>
  <main class="home-container">
    <div class="overflow-hidden">
      <h1 ref="titleRef" class="home-title">Happenence</h1>
    </div>
    <div class="home-columns">
      <div class="home-column"><HomeIntro :page="HomePage" /></div>
      <div class="home-column cards-wrapper">
        <ClientOnly>
          <Cards :writings="Writings" />
          <!-- Server-rendered list so crawlers and agents see the writing links -->
          <template #fallback>
            <nav aria-label="Writings">
              <ul>
                <li v-for="Writing in Writings" :key="Writing.to">
                  <a :href="Writing.to">{{ Writing.label }}</a>
                </li>
              </ul>
            </nav>
          </template>
        </ClientOnly>
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
  margin-top: 1rem;
  padding-bottom: 1rem;
}
.home-column {
  padding: 0.75rem;
}
.cards-wrapper {
  position: relative;
}
@media (min-width: 1024px) {
  .home-columns {
    display: flex;
    gap: 0.25rem;
  }
  .home-column {
    flex: 1 1 0;
  }
}
</style>
