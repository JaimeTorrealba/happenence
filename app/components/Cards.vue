<script setup></script>
<template>
  <CardSwap
    :card-distance="60"
    :vertical-distance="70"
    :delay="7500"
    :skew-amount="6"
    easing="elastic"
    :pause-on-hover="false"
  >
    <template #card-0>
      <a href="https://happenence.substack.com/p/the-distance-between-us">
        <div class="card-content">
          <div class="card-inner">
            <p class="is-size-6 has-text-weight-semibold has-text-white-ter">
              The distance between us
            </p>
          </div>
        </div>
      </a>
    </template>
    <template #card-1>
      <a
        href="https://happenence.substack.com/p/milk-sprays-the-mind-and-body-metamorphosis"
      >
        <div class="card-content">
          <div class="card-inner">
            <p class="is-size-6 has-text-weight-semibold has-text-white-ter">
              Milk sprays: the mind and body metamorphosis
            </p>
          </div>
        </div>
        <img
          src="/images/Milk_sprays.jpg"
          class="img"
          alt="Santiago city, Chile"
          width="300"
          height="300"
        />
      </a>
    </template>

    <template #card-2>
      <a href="https://happenence.substack.com/p/on-choosing-how-we-define-motherhood">
        <div class="card-content">
          <div class="card-inner">
            <p class="is-size-6 has-text-weight-semibold has-text-white-ter">
              On choosing how we define motherhood
            </p>
          </div>
        </div>
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

.card-inner {
  margin: 0.5rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
}
</style>
