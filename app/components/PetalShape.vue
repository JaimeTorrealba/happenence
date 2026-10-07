<script setup>
// One petal, shared by the footer's falling petals and the page transition overlay.
defineProps({
  size: { type: Number, required: true },
  tone: { type: String, required: true },
});
</script>

<template>
  <svg viewBox="0 0 20 20" :width="size" :height="size">
    <path d="M10 1C15 4 18.5 10 14.5 16C11.5 20 6 19.5 4 15.5C1.5 10.5 4.5 3.5 10 1Z" :fill="tone" />
    <path d="M10 3.5C9 8 8.5 12 9 17" stroke="#8a4a2a" stroke-opacity="0.25" stroke-width="0.8" fill="none" />
  </svg>
</template>
