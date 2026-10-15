<template>
  <v-card class="summary-strip" :style="{ '--strip-cols': items.length }">
    <div v-for="item in items" :key="item.label" class="summary-strip__item">
      <span class="summary-strip__icon">
        <v-icon size="18">{{ item.icon }}</v-icon>
      </span>
      <div class="min-w-0">
        <div class="text-caption text-medium-emphasis font-weight-medium">
          {{ item.label }}
        </div>
        <div
          class="summary-strip__value tabular-nums"
          :class="{ 'text-success': item.tone === 'positive', 'text-error': item.tone === 'negative' }"
        >
          {{ item.value }}
        </div>
        <div v-if="item.hint" class="text-caption text-medium-emphasis tabular-nums">
          {{ item.hint }}
        </div>
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
// Headline numbers in one bordered strip (dashboard, reports).
import type { SummaryItem } from "../utils/dashboard";

defineProps<{ items: SummaryItem[] }>();
</script>

<style scoped>
.min-w-0 {
  min-width: 0;
}
.summary-strip {
  display: grid;
  grid-template-columns: repeat(var(--strip-cols, 4), minmax(0, 1fr));
}
.summary-strip__item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
}
.summary-strip__item + .summary-strip__item {
  border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.summary-strip__icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgb(var(--v-theme-surface-light));
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.summary-strip__value {
  font-size: 26px;
  line-height: 34px;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
}
@media (max-width: 1100px) {
  .summary-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .summary-strip__item:nth-child(3) {
    border-left: 0;
  }
  .summary-strip__item:nth-child(n + 3) {
    border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }
}
@media (max-width: 600px) {
  .summary-strip {
    grid-template-columns: 1fr;
  }
  .summary-strip__item + .summary-strip__item {
    border-left: 0;
    border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }
}
</style>
