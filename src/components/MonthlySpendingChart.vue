<template>
  <div class="monthly-chart">
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="monthly-chart__svg"
      role="img"
      :aria-label="ariaLabel"
    >
      <g v-for="tick in ticks" :key="tick">
        <line
          :x1="LEFT"
          :x2="W - 4"
          :y1="y(tick)"
          :y2="y(tick)"
          class="monthly-chart__grid"
        />
        <text :x="LEFT - 8" :y="y(tick) + 4" text-anchor="end" class="monthly-chart__axis">
          {{ tickLabel(tick) }}
        </text>
      </g>
      <g v-for="(m, i) in months" :key="`${m.year}-${m.month}`">
        <path
          :d="columnPath(i, m.total)"
          :class="i === months.length - 1 ? 'monthly-chart__col--current' : 'monthly-chart__col'"
        />
        <!-- Hit target taller than the mark, for hover tooltips. -->
        <rect
          :x="colX(i) - 6"
          :y="TOP"
          :width="COL + 12"
          :height="H - TOP - BOTTOM"
          fill="transparent"
          @mouseenter="hover = i"
          @mouseleave="hover = null"
        />
        <text
          :x="colX(i) + COL / 2"
          :y="H - 8"
          text-anchor="middle"
          :class="i === months.length - 1 ? 'monthly-chart__month--current' : 'monthly-chart__month'"
        >
          {{ m.label }}
        </text>
        <text
          v-if="i === months.length - 1 && m.total > 0"
          :x="colX(i) + COL / 2"
          :y="y(m.total) - 8"
          text-anchor="middle"
          class="monthly-chart__value"
        >
          {{ toCurrencyBRL(m.total) }}
        </text>
      </g>
    </svg>
    <div
      v-if="hover !== null"
      class="monthly-chart__tooltip tabular-nums"
      :style="{ left: `${((colX(hover) + COL / 2) / W) * 100}%` }"
      role="tooltip"
    >
      {{ months[hover].label }}/{{ months[hover].year }}:
      {{ toCurrencyBRL(months[hover].total) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useCurrency } from "../composables/useCurrency";
import type { MonthTotal } from "../utils/dashboard";

// Emphasis form: the last (selected) month in the accent color, the others gray.
// Single y-axis, three recessive gridlines.
const props = defineProps<{ months: MonthTotal[] }>();
const { toCurrencyBRL } = useCurrency();

const W = 360;
const H = 200;
const TOP = 24;
const BOTTOM = 28;
const LEFT = 44;
const COL = 30;
const R = 4;

const hover = ref<number | null>(null);

const yMax = computed(() => {
  const max = Math.max(...props.months.map((m) => m.total), 0);
  if (max <= 0) return 1000;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  return Math.ceil(max / magnitude) * magnitude;
});
const ticks = computed(() => [0, yMax.value / 2, yMax.value]);

// Right padding leaves room for the value label above the last column.
const step = computed(() => (W - LEFT - 28) / Math.max(props.months.length, 1));

function y(v: number) {
  return TOP + (H - TOP - BOTTOM) * (1 - v / yMax.value);
}
function colX(i: number) {
  return LEFT + step.value * i + (step.value - COL) / 2;
}
function columnPath(i: number, value: number) {
  const x0 = colX(i);
  const yb = y(0);
  const yt = Math.min(y(value), yb - 2); // keep a visible stub for tiny values
  return `M${x0},${yb} V${yt + R} Q${x0},${yt} ${x0 + R},${yt} H${x0 + COL - R} Q${x0 + COL},${yt} ${x0 + COL},${yt + R} V${yb} Z`;
}
function tickLabel(v: number) {
  if (v === 0) return "0";
  return v >= 1000 ? `${(v / 1000).toLocaleString("pt-BR")} mil` : String(v);
}

const ariaLabel = computed(
  () =>
    "Gastos por mês: " +
    props.months.map((m) => `${m.label} ${toCurrencyBRL(m.total)}`).join(", ")
);
</script>

<style scoped>
.monthly-chart {
  position: relative;
}
.monthly-chart__svg {
  width: 100%;
  height: auto;
  display: block;
}
.monthly-chart__grid {
  stroke: rgba(var(--v-border-color), var(--v-border-opacity));
  stroke-width: 1;
}
.monthly-chart__axis,
.monthly-chart__month {
  font-size: 11px;
  fill: rgba(var(--v-theme-on-surface), 0.55);
}
.monthly-chart__month {
  font-size: 12px;
}
.monthly-chart__month--current {
  font-size: 12px;
  font-weight: 600;
  fill: rgb(var(--v-theme-on-surface));
}
.monthly-chart__col {
  fill: rgba(var(--v-theme-on-surface), 0.18);
}
.monthly-chart__col--current {
  fill: rgb(var(--v-theme-primary));
}
.monthly-chart__value {
  font-size: 12px;
  font-weight: 600;
  fill: rgb(var(--v-theme-on-surface));
}
.monthly-chart__tooltip {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
}
</style>
