<template>
  <div v-if="items.length" role="list" :aria-label="listLabel">
    <div
      v-for="item in items"
      :key="item.id"
      role="listitem"
      class="bar-row"
      :title="`${item.label}: ${format(item.total)} (${share(item.total)}%)`"
    >
      <span class="bar-row__label text-truncate">{{ item.label }}</span>
      <span class="bar-row__track">
        <span
          class="bar-row__bar"
          :style="{ width: `${(item.total / max) * 100}%` }"
        />
      </span>
      <span class="bar-row__value tabular-nums">
        {{ format(item.total) }}
        <span class="text-medium-emphasis">· {{ share(item.total) }}%</span>
      </span>
    </div>
  </div>
  <div v-else class="text-body-2 text-medium-emphasis py-6 text-center">
    <slot name="empty">Nenhum valor no período.</slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useCurrency } from "../composables/useCurrency";
import type { LabeledTotal } from "../utils/dashboard";

// Ranked horizontal bars in the single accent color, with value + share as
// direct labels (magnitude comparison: one hue, no legend needed).
const props = defineProps<{ items: LabeledTotal[]; listLabel: string }>();
const { toCurrencyBRL } = useCurrency();

const max = computed(() => Math.max(...props.items.map((i) => i.total), 1));
const sum = computed(() => props.items.reduce((acc, i) => acc + i.total, 0));

function format(v: number) {
  return toCurrencyBRL(v);
}
function share(v: number) {
  return sum.value ? Math.round((v / sum.value) * 100) : 0;
}
</script>

<style scoped>
.bar-row {
  display: grid;
  /* Fixed value column so every track ends at the same x. */
  grid-template-columns: minmax(72px, min(140px, 28%)) minmax(40px, 1fr) 136px;
  align-items: center;
  gap: 12px;
  padding: 5px 0;
  font-size: 13px;
}
.bar-row__label {
  color: rgba(var(--v-theme-on-surface), 0.75);
}
.bar-row__track {
  height: 10px;
  background: rgb(var(--v-theme-surface-light));
  border-radius: 0 4px 4px 0;
}
.bar-row__bar {
  display: block;
  height: 100%;
  min-width: 2px;
  background: rgb(var(--v-theme-primary));
  border-radius: 0 4px 4px 0;
}
.bar-row:hover .bar-row__bar {
  opacity: 0.85;
}
.bar-row__value {
  text-align: right;
  white-space: nowrap;
}
</style>
