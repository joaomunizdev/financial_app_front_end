<template>
  <v-card class="pa-5">
    <div class="d-flex align-center justify-space-between mb-4">
      <h2 class="section-title">Investimentos</h2>
      <v-btn id="link-investments" variant="text" size="small" to="/investments">Ver carteira</v-btn>
    </div>

    <v-progress-linear v-if="loading && !summary" indeterminate color="primary" />

    <div v-else-if="!summary || summary.investmentsCount === 0" class="text-body-2 text-medium-emphasis">
      Cadastre seus investimentos para acompanhar o patrimônio e a distribuição da carteira.
      <v-btn class="ml-1" variant="text" size="small" to="/investments">Cadastrar investimento</v-btn>
    </div>

    <div v-else class="inv-grid">
      <div class="inv-total">
        <div>
          <div class="text-caption text-medium-emphasis font-weight-medium mb-1">
            Patrimônio investido
          </div>
          <div class="inv-total__value tabular-nums">{{ toCurrencyBRL(summary.totalValue) }}</div>
          <div class="text-caption tabular-nums inv-total__delta" :class="{ 'inv-total__delta--up': contributions > 0 }">
            <template v-if="contributions > 0">
              <v-icon size="14" icon="mdi-arrow-top-right" class="inv-total__arrow" />{{
                toCurrencyBRL(contributions)
              }}
              aportados em {{ monthName }}
            </template>
            <template v-else>Nenhum aporte em {{ monthName }}</template>
          </div>
          <div v-if="withdrawals > 0" class="text-caption text-medium-emphasis tabular-nums">
            {{ toCurrencyBRL(withdrawals) }} resgatados em {{ monthName }}
          </div>
        </div>

        <!-- Sparkline: value at each month's end (single series, last point marked). -->
        <svg
          :viewBox="`0 0 ${SW} ${SH}`"
          class="inv-spark"
          role="img"
          :aria-label="sparkLabel"
        >
          <polyline :points="sparkPoints.map((p) => `${p.x},${p.y}`).join(' ')" class="inv-spark__line" />
          <circle
            v-if="sparkPoints.length"
            :cx="sparkPoints[sparkPoints.length - 1].x"
            :cy="sparkPoints[sparkPoints.length - 1].y"
            r="4"
            class="inv-spark__dot"
          />
          <!-- Hit targets bigger than the marks, one per month. -->
          <rect
            v-for="(p, i) in sparkPoints"
            :key="i"
            :x="p.x - SW / (sparkPoints.length * 2)"
            y="0"
            :width="SW / sparkPoints.length"
            :height="SH"
            fill="transparent"
          >
            <title>{{ p.label }}: {{ toCurrencyBRL(p.value) }}</title>
          </rect>
        </svg>
      </div>

      <div>
        <div class="text-caption text-medium-emphasis font-weight-medium mb-2">Distribuição</div>
        <template v-if="segments.length">
          <div class="inv-bar mb-4" role="img" :aria-label="distributionLabel">
            <span
              v-for="s in segments"
              :key="s.type"
              class="inv-bar__seg"
              :style="{ width: `${s.share}%`, background: s.color }"
              :title="`${s.label}: ${toCurrencyBRL(s.value)} (${s.sharePct}%)`"
            />
          </div>
          <div class="inv-legend">
            <div v-for="s in segments" :key="s.type" class="inv-legend__row">
              <span class="inv-legend__dot" :style="{ background: s.color }" />
              <span class="inv-legend__label text-truncate">{{ s.label }}</span>
              <span class="font-weight-medium tabular-nums">{{ s.sharePct }}%</span>
              <span class="inv-legend__value text-medium-emphasis tabular-nums">{{ toCurrencyBRL(s.value) }}</span>
            </div>
          </div>
        </template>
        <div v-else class="text-body-2 text-medium-emphasis">Sem valor investido no fim deste mês.</div>
      </div>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useTheme } from "vuetify";
import { useCurrency } from "../composables/useCurrency";
import { investmentTypeInfo } from "../utils/investments";
import type { InvestmentsSummary } from "../types/domain";

const props = defineProps<{
  summary: InvestmentsSummary | null;
  /** Selected month, e.g. "outubro". */
  monthName: string;
  loading?: boolean;
}>();

const { toCurrencyBRL } = useCurrency();
const theme = useTheme();

const contributions = computed(() => Number(props.summary?.contributions ?? 0));
const withdrawals = computed(() => Number(props.summary?.withdrawals ?? 0));

// ---- Sparkline ----
const SW = 160;
const SH = 40;
const PAD = 4;

function shortMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleString("pt-BR", { month: "short" }).replace(".", "");
}

const sparkPoints = computed(() => {
  const history = props.summary?.history ?? [];
  const values = history.map((h) => Number(h.value));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return history.map((h, i) => ({
    x: PAD + (i * (SW - PAD * 2)) / Math.max(history.length - 1, 1),
    // A flat series sits in the middle instead of on the floor.
    y: max === min ? SH / 2 : SH - PAD - ((Number(h.value) - min) / span) * (SH - PAD * 2),
    value: Number(h.value),
    label: `${shortMonth(h.year, h.month)}/${h.year}`,
  }));
});

const sparkLabel = computed(() => {
  const pts = sparkPoints.value;
  if (!pts.length) return "Patrimônio investido";
  return `Patrimônio investido nos últimos ${pts.length} meses: de ${toCurrencyBRL(pts[0].value)} a ${toCurrencyBRL(pts[pts.length - 1].value)}`;
});

// ---- Distribution ----
const segments = computed(() => {
  const rows = props.summary?.byType ?? [];
  const total = rows.reduce((sum, r) => sum + Number(r.value), 0);
  const dark = theme.global.current.value.dark;
  return rows.map((r) => {
    const info = investmentTypeInfo(r.type);
    const share = total ? (Number(r.value) / total) * 100 : 0;
    return {
      type: r.type,
      label: info.label,
      color: dark ? info.dark : info.light,
      value: Number(r.value),
      share,
      sharePct: Math.round(share),
    };
  });
});

const distributionLabel = computed(
  () => `Distribuição: ${segments.value.map((s) => `${s.label} ${s.sharePct}%`).join(", ")}`
);
</script>

<style scoped>
.inv-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  gap: 24px;
  align-items: center;
}
.inv-total {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding-right: 24px;
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.inv-total__value {
  font-size: 28px;
  line-height: 36px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.inv-total__delta {
  margin-top: 2px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.inv-total__arrow {
  margin-right: 2px;
  vertical-align: -2px;
}
/* Success ink with text contrast (≥ 4.5:1) on the card surface. */
.inv-total__delta--up {
  color: #047857;
}
.v-theme--darkMinimal .inv-total__delta--up {
  color: rgb(var(--v-theme-success));
}
.inv-spark {
  width: 120px;
  height: 40px;
  flex-shrink: 0;
  overflow: visible;
}
.inv-spark__line {
  fill: none;
  stroke: rgb(var(--v-theme-primary));
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.inv-spark__dot {
  fill: rgb(var(--v-theme-primary));
  stroke: rgb(var(--v-theme-surface));
  stroke-width: 2;
}
.inv-bar {
  display: flex;
  gap: 2px;
  height: 12px;
}
.inv-bar__seg {
  height: 100%;
  min-width: 2px;
}
.inv-bar__seg:first-child {
  border-radius: 4px 0 0 4px;
}
.inv-bar__seg:last-child {
  border-radius: 0 4px 4px 0;
}
.inv-bar__seg:only-child {
  border-radius: 4px;
}
.inv-legend {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 32px;
  font-size: 13px;
}
.inv-legend__row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.inv-legend__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.inv-legend__label {
  flex: 1;
  min-width: 0;
  color: rgba(var(--v-theme-on-surface), 0.75);
}
.inv-legend__value {
  width: 104px;
  text-align: right;
}
@media (max-width: 960px) {
  .inv-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .inv-total {
    padding-right: 0;
    border-right: 0;
  }
}
@media (max-width: 600px) {
  .inv-legend {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
