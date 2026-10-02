<script setup>
defineProps({
  writings: { type: Array, required: true },
});
</script>
<template>
  <CardSwap
    :count="writings.length"
    :card-distance="60"
    :vertical-distance="70"
    :delay="7500"
    :skew-amount="6"
    easing="elastic"
    :pause-on-hover="false"
  >
    <template v-for="(Writing, Index) in writings" :key="Writing.to" #[`card-${Index}`]>
      <a :href="Writing.to">
        <div class="card-content">
          <div class="card-inner">
            <p class="card-title">
              {{ Writing.label }}
            </p>
          </div>
        </div>
        <img
          v-if="Writing.image"
          :src="Writing.image"
          class="img"
          :alt="Writing.imageAlt ?? ''"
          width="300"
          height="300"
        />
      </a>
    </template>
  </CardSwap>
</template>
<style scoped>
.img {
  width: 100%;
  height: auto;
}
.card-content {
  border-bottom: 1px solid #e4e4e4;
  background: linear-gradient(to top, #333, #0b0b0b);
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: #f5f5f5;
}

.card-inner {
  margin: 0.5rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
}
</style>
