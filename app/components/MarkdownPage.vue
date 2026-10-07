<script setup>
// Renders a plain Markdown page from /content (title + body), e.g. About and Legal.
const Props = defineProps({
  path: { type: String, required: true },
});

const { data: MarkdownDocument } = await useAsyncData(`markdown-page-${Props.path}`, () =>
  queryCollection("pages").path(Props.path).first(),
);

if (!MarkdownDocument.value) {
  throw createError({ statusCode: 404, statusMessage: "Page not found", fatal: true });
}

useSeoMeta({
  title: () => MarkdownDocument.value?.title,
  description: () => MarkdownDocument.value?.description,
  ogDescription: () => MarkdownDocument.value?.description,
});

useHead({
  link: [{ rel: "alternate", type: "text/markdown", href: `/raw${Props.path}.md` }],
});

const MarkdownTitleRef = ref(null);
useTitleReveal(MarkdownTitleRef);

const MarkdownBodyRef = ref(null);
useLinesReveal(MarkdownBodyRef, { delay: 0.25 });
</script>

<template>
  <main id="main" class="markdown-page-container">
    <div class="overflow-hidden">
      <h1 ref="MarkdownTitleRef" class="markdown-page-title reveal-title">{{ MarkdownDocument.title }}</h1>
    </div>
    <div ref="MarkdownBodyRef" class="reveal-lines">
      <ContentRenderer :value="MarkdownDocument" class="markdown-page-body" />
    </div>
  </main>
</template>

<style scoped>
.markdown-page-container {
  width: 100%;
  max-width: 1344px;
  margin-inline: auto;
  padding-inline: 1rem;
}
.markdown-page-title {
  font-size: 3rem;
  text-align: center;
  padding-bottom: 1rem;
}
.markdown-page-body {
  max-width: 672px;
  margin-inline: auto;
}
.markdown-page-body :deep(p) {
  padding-bottom: 1rem;
}
</style>
