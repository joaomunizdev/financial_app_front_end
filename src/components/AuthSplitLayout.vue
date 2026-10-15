<template>
  <div class="auth-split">
    <aside class="auth-split__visual" :style="{ backgroundImage: `url(${image})` }">
      <div class="auth-split__copy">
        <h2 class="auth-split__title">{{ title }}</h2>
        <p class="auth-split__description">{{ description }}</p>
      </div>
    </aside>

    <section class="auth-split__panel">
      <div class="auth-split__content">
        <div class="d-flex flex-column align-center ga-4 mb-8">
          <AppLogo />
          <div class="text-center">
            <h1 class="auth-split__heading">{{ heading }}</h1>
            <p v-if="subheading" class="text-body-2 text-medium-emphasis mt-1">
              {{ subheading }}
            </p>
          </div>
        </div>
        <slot />
        <div v-if="$slots.footer" class="text-body-2 text-medium-emphasis text-center mt-6">
          <slot name="footer" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import AppLogo from "./AppLogo.vue";

// Split auth card: illustration with a short message on the left (hidden on
// small screens), form on the right.
defineProps<{
  image: string;
  title: string;
  description: string;
  heading: string;
  subheading?: string;
}>();
</script>

<style scoped>
.auth-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 100%;
  max-width: 960px;
  min-height: 600px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
}
.auth-split__visual {
  position: relative;
  background-color: #4f46e5;
  background-size: cover;
  background-position: center bottom;
}
.auth-split__copy {
  position: absolute;
  inset: 32px 32px auto 32px;
  color: #ffffff;
}
.auth-split__title {
  font-size: 28px;
  line-height: 36px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.auth-split__description {
  margin-top: 12px;
  font-size: 14px;
  line-height: 20px;
  opacity: 0.9;
}
.auth-split__panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 32px;
}
.auth-split__content {
  width: 100%;
  max-width: 360px;
}
.auth-split__content :deep(a) {
  text-decoration: none;
}
.auth-split__content :deep(a:hover) {
  text-decoration: underline;
}
.auth-split__heading {
  font-size: 20px;
  line-height: 28px;
  font-weight: 600;
}
@media (max-width: 860px) {
  .auth-split {
    grid-template-columns: 1fr;
    min-height: 0;
    max-width: 440px;
  }
  .auth-split__visual {
    display: none;
  }
}
</style>
