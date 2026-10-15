<template>
  <div class="empty-state" :class="{ 'empty-state--compact': compact }">
    <img :src="image" alt="" aria-hidden="true" class="empty-state__image" />
    <h3 class="empty-state__title">{{ title }}</h3>
    <p v-if="description" class="empty-state__description">{{ description }}</p>
    <div v-if="actionText || $slots.actions" class="empty-state__actions">
      <slot name="actions">
        <v-btn
          color="primary"
          variant="flat"
          :prepend-icon="actionIcon"
          :to="actionTo"
          @click="emit('action')"
        >
          {{ actionText }}
        </v-btn>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

// Illustrated empty/error state: image (src/assets/empty), title, one line of
// guidance and the single next action. Use inside cards and table #no-data slots.
withDefaults(
  defineProps<{
    image: string;
    title: string;
    description?: string;
    actionText?: string;
    actionIcon?: string;
    actionTo?: RouteLocationRaw;
    compact?: boolean;
  }>(),
  { actionIcon: "mdi-plus" }
);
const emit = defineEmits<{ (e: "action"): void }>();
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px 16px;
}
.empty-state__image {
  width: 160px;
  height: 160px;
  object-fit: contain;
  margin-bottom: 16px;
}
.empty-state--compact {
  padding: 16px;
}
.empty-state--compact .empty-state__image {
  width: 112px;
  height: 112px;
  margin-bottom: 8px;
}
.empty-state__title {
  font-size: 15px;
  line-height: 22px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}
.empty-state__description {
  margin-top: 4px;
  max-width: 360px;
  font-size: 13px;
  line-height: 20px;
  color: rgba(var(--v-theme-on-surface), 0.66);
}
.empty-state__actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}
</style>
