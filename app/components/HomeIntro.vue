<script setup>
defineProps({
  page: { type: Object, required: true },
});

const IntroTitleRef = ref(null);
useTitleReveal(IntroTitleRef, { delay: 0.3 });
</script>
<template>
  <div class="overflow-hidden">
    <h2 ref="IntroTitleRef" class="home-intro-title reveal-title">{{ page.title }}</h2>
  </div>
  <ContentRenderer :value="page" class="home-intro-body" />
  <div v-if="page.buttonLink" class="home-intro-actions">
    <a :href="page.buttonLink" class="home-intro-button">{{ page.buttonText }}</a>
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
.home-intro-actions {
  display: flex;
  justify-content: center;
  padding-top: 3rem;
}
.home-intro-button {
  display: inline-flex;
  align-items: center;
  height: 2.5em;
  padding-inline: 3rem;
  border-radius: 0.375rem;
  background: #00d1b2;
  color: rgba(0, 0, 0, 0.7);
  transition: filter 0.15s ease;
}
.home-intro-button:hover {
  filter: brightness(0.95);
}
</style>
