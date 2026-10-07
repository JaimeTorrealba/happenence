<script setup>
const { data: ContentsPage } = await useAsyncData("contents-page", () =>
  queryCollection("pages").path("/contents").first(),
);

if (!ContentsPage.value) {
  throw createError({ statusCode: 404, statusMessage: "Contents page content not found", fatal: true });
}

const Writings = computed(() => ContentsPage.value?.links ?? []);

useSeoMeta({
  title: () => ContentsPage.value?.title,
  description: () => ContentsPage.value?.description,
  ogDescription: () => ContentsPage.value?.description,
});

useHead({
  link: [{ rel: "alternate", type: "text/markdown", href: "/raw/contents.md" }],
});

const ContentsTitleRef = ref(null);
useTitleReveal(ContentsTitleRef);
</script>

<template>
  <main id="main" class="contents-container">
    <ClientOnly>
      <SilkBackground />
    </ClientOnly>
    <div class="overflow-hidden">
      <h1 ref="ContentsTitleRef" class="contents-title reveal-title">{{ ContentsPage.title }}</h1>
    </div>
    <ContentRenderer :value="ContentsPage" />
    <div class="writings-wrapper">
      <ClientOnly>
        <AccordionGallery :items="Writings" />
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
  </main>
</template>

<style scoped>
.contents-container {
  width: 100%;
  max-width: 1344px;
  margin-inline: auto;
  padding-inline: 1rem;
}
.contents-title {
  font-size: 3rem;
  text-align: center;
  padding-bottom: 1rem;
}
.writings-wrapper {
  margin-top: 2rem;
}
</style>
