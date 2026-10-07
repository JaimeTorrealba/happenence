<script setup>
defineProps({
  page: { type: Object, required: true },
});

const IntroTitleRef = ref(null);
useTitleReveal(IntroTitleRef, { delay: 0.3 });

const IntroBodyRef = ref(null);
useLinesReveal(IntroBodyRef, { delay: 0.5 });
</script>
<template>
  <div class="overflow-hidden">
    <h2 ref="IntroTitleRef" class="home-intro-title reveal-title">{{ page.title }}</h2>
  </div>
  <div ref="IntroBodyRef" class="reveal-lines">
    <ContentRenderer :value="page" class="home-intro-body" />
  </div>
</template>
<style scoped>
.home-intro-title {
  font-size: 2rem;
  text-align: center;
  padding-bottom: 1rem;
}
.home-intro-body :deep(p:last-of-type) {
  padding-block: 0.5rem;
}
</style>
