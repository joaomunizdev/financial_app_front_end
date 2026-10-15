<template>
  <div class="d-flex flex-column ga-6">
    <PageHeader
      title="Resumo"
      :description="`${greeting()}. Aqui está o panorama das suas finanças.`"
    >
      <div class="d-flex align-center ga-2">
        <span class="text-body-2 text-medium-emphasis">Período</span>
        <v-select
          v-model="period"
          :items="periods"
          item-title="label"
          item-value="value"
          hide-details
          aria-label="Período dos gráficos"
          style="min-width: 200px"
        />
      </div>
    </PageHeader>

    <v-progress-linear v-if="loading" indeterminate color="primary" rounded />

    <v-card v-if="showOnboarding" class="onboarding pa-5">
      <img :src="onboardingImage" alt="" aria-hidden="true" class="onboarding__image" />
      <div class="onboarding__body">
        <div class="d-flex align-start justify-space-between ga-4">
          <div>
            <h2 class="section-title">Primeiros passos</h2>
            <p class="text-body-2 text-medium-emphasis">
              {{ stepsDone }} de {{ steps.length }} concluídos. Complete-os para ver seu Dashboard preenchido.
            </p>
          </div>
          <v-btn
            icon
            variant="text"
            size="small"
            color="default"
            aria-label="Dispensar primeiros passos"
            @click="dismissOnboarding"
          >
            <v-icon size="18">mdi-close</v-icon>
          </v-btn>
        </div>
        <v-progress-linear
          :model-value="(stepsDone / steps.length) * 100"
          color="primary"
          rounded
          height="6"
          class="my-4"
        />
        <ol class="onboarding__steps">
          <li v-for="(step, i) in steps" :key="step.key" class="onboarding__step">
            <v-icon :color="step.done ? 'success' : undefined" size="20" class="onboarding__check">
              {{ step.done ? "mdi-check-circle" : "mdi-circle-outline" }}
            </v-icon>
            <div class="flex-grow-1 min-w-0">
              <div class="text-body-2 font-weight-medium" :class="{ 'onboarding__done': step.done }">
                {{ i + 1 }}. {{ step.title }}
              </div>
              <div class="text-caption text-medium-emphasis">{{ step.description }}</div>
            </div>
            <v-btn
              v-if="!step.done"
              :to="step.to"
              size="small"
              :variant="step.key === nextStep?.key ? 'flat' : 'outlined'"
              :color="step.key === nextStep?.key ? 'primary' : 'default'"
            >
              Fazer agora
            </v-btn>
          </li>
        </ol>
      </div>
    </v-card>

    <v-card class="summary-strip">
      <div v-for="stat in stats" :key="stat.label" class="summary-strip__item">
        <span class="summary-strip__icon">
          <v-icon size="18">{{ stat.icon }}</v-icon>
        </span>
        <div class="min-w-0">
          <div class="text-caption text-medium-emphasis font-weight-medium">
            {{ stat.label }}
          </div>
          <div class="summary-strip__value tabular-nums">{{ stat.value }}</div>
          <div
            v-if="stat.hint"
            class="text-caption text-medium-emphasis tabular-nums"
          >
            {{ stat.hint }}
          </div>
        </div>
      </div>
    </v-card>

    <div class="analytics-grid">
        <v-card class="pa-5 h-100">
          <div class="d-flex align-start justify-space-between ga-4 mb-4">
            <div>
              <h2 class="section-title">Onde você mais gastou</h2>
              <p class="text-caption text-medium-emphasis">
                Gastos por categoria em {{ selected.label.toLowerCase() }}
              </p>
            </div>
            <v-btn id="link-all-categories" variant="text" size="small" to="/categories">
              Ver todas as categorias
            </v-btn>
          </div>
          <v-progress-linear v-if="categoriesLoading" indeterminate color="primary" />
          <BarList v-else :items="byCategory" :list-label="`Gastos por categoria em ${selected.label.toLowerCase()}`">
            <template #empty>
              Nenhuma fatura gerada para este período.
              <router-link id="link-dashboard-statements" to="/statements" class="text-primary">
                Ir para faturas
              </router-link>
            </template>
          </BarList>
        </v-card>
        <v-card class="pa-5 h-100">
          <div class="mb-2">
            <h2 class="section-title">Gastos por mês</h2>
            <p class="text-caption text-medium-emphasis">
              Últimos 6 meses, pelo total das faturas
            </p>
          </div>
          <MonthlySpendingChart :months="months" />
        </v-card>
    </div>

    <section>
      <div class="d-flex align-center justify-space-between mb-3">
        <h2 class="section-title">Seus cartões</h2>
        <v-btn variant="text" size="small" to="/credit-cards">Gerenciar</v-btn>
      </div>
      <div class="tile-grid">
        <v-card v-for="card in cards" :key="card.id" class="pa-5 card-tile">
          <div class="d-flex align-start justify-space-between ga-2">
            <div class="min-w-0">
              <div class="font-weight-medium text-truncate">{{ card.nickname }}</div>
              <div class="text-body-2 text-medium-emphasis tabular-nums">
                {{ card.brand }} •••• {{ card.last4 }}
              </div>
            </div>
            <v-chip
              size="small"
              variant="tonal"
              :color="card.cardType === 'debit' ? 'secondary' : 'primary'"
            >
              {{ card.cardType === "debit" ? "Débito" : "Crédito" }}
            </v-chip>
          </div>
          <div class="mt-5">
            <div class="text-caption text-medium-emphasis">Limite</div>
            <div class="tabular-nums">
              {{
                card.cardType === "debit"
                  ? "Sem limite"
                  : toCurrencyBRL(card.limitAmount ?? 0)
              }}
            </div>
          </div>
        </v-card>
        <router-link id="link-dashboard-add-card" to="/credit-cards" class="add-tile">
          <v-icon size="20">mdi-plus</v-icon>
          <span>Adicionar cartão</span>
        </router-link>
      </div>
    </section>

    <section>
      <div class="d-flex align-center justify-space-between mb-3">
        <h2 class="section-title">Responsáveis</h2>
        <v-btn variant="text" size="small" to="/tenants">Gerenciar</v-btn>
      </div>
      <div class="d-flex flex-wrap ga-2">
        <div v-for="tenant in tenants" :key="tenant.id" class="person-chip">
          <v-avatar size="24" color="primary" variant="tonal">
            <span class="text-caption font-weight-medium">{{
              tenant.name?.charAt(0)?.toUpperCase() || "?"
            }}</span>
          </v-avatar>
          <span class="text-body-2">{{ tenant.name }}</span>
        </div>
        <router-link
          id="link-dashboard-add-tenant"
          to="/tenants"
          class="person-chip person-chip--add"
          aria-label="Adicionar responsável"
        >
          <v-icon size="18">mdi-plus</v-icon>
        </router-link>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import http from "../plugins/http";
import PageHeader from "../components/PageHeader.vue";
import BarList from "../components/BarList.vue";
import MonthlySpendingChart from "../components/MonthlySpendingChart.vue";
import { useCurrency } from "../composables/useCurrency";
import onboardingImage from "../assets/empty/onboarding.webp";
import {
  greeting,
  monthlyTotals,
  onboardingSteps,
  percentChange,
  periodOptions,
  topCategories,
} from "../utils/dashboard";
import type {
  CategoryTotal,
  CreditCard,
  Page,
  Purchase,
  Statement,
  Tenant,
} from "../types/domain";

const { toCurrencyBRL } = useCurrency();

const loading = ref(false);
const cards = ref<CreditCard[]>([]);
const tenants = ref<Tenant[]>([]);
const statements = ref<Statement[]>([]);
const purchaseCount = ref(0);
const loaded = ref(false);

const ONBOARDING_KEY = "financial-app-onboarding-dismissed";
const onboardingDismissed = ref(readDismissed());

function readDismissed(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return false;
  }
}

function dismissOnboarding() {
  onboardingDismissed.value = true;
  try {
    localStorage.setItem(ONBOARDING_KEY, "1");
  } catch {
    // Preference only; ignore storage errors.
  }
}

const steps = computed(() =>
  onboardingSteps({
    tenants: tenants.value.length,
    cards: cards.value.length,
    purchases: purchaseCount.value,
    statements: statements.value.length,
  })
);
const stepsDone = computed(() => steps.value.filter((s) => s.done).length);
const nextStep = computed(() => steps.value.find((s) => !s.done));
const showOnboarding = computed(
  () => loaded.value && !onboardingDismissed.value && stepsDone.value < steps.value.length
);

const now = new Date();
const periods = periodOptions(now.getFullYear(), now.getMonth() + 1);
const period = ref(periods[0].value);
const selected = computed(
  () => periods.find((p) => p.value === period.value) ?? periods[0]
);

const months = computed(() =>
  monthlyTotals(statements.value, selected.value.year, selected.value.month)
);
const categoryTotals = ref<CategoryTotal[]>([]);
const categoriesLoading = ref(false);
const byCategory = computed(() => topCategories(categoryTotals.value));

async function fetchCategoryTotals() {
  categoriesLoading.value = true;
  try {
    const { year, month } = selected.value;
    const { data } = await http.get<CategoryTotal[]>("/reports/by-category", {
      params: { year, month },
    });
    categoryTotals.value = data || [];
  } finally {
    categoriesLoading.value = false;
  }
}
watch(period, fetchCategoryTotals);

const totalLimit = computed(() =>
  cards.value
    .filter((c) => c.cardType !== "debit")
    .reduce((sum, c) => sum + Number(c.limitAmount ?? 0), 0)
);

const stats = computed(() => {
  const [prev, current] = months.value.slice(-2);
  const change = percentChange(current.total, prev.total);
  return [
    { label: "Cartões cadastrados", value: String(cards.value.length), icon: "mdi-credit-card-outline" },
    { label: "Responsáveis", value: String(tenants.value.length), icon: "mdi-account-multiple-outline" },
    { label: "Limite combinado", value: toCurrencyBRL(totalLimit.value), icon: "mdi-wallet-outline" },
    {
      label: "Gastos no mês",
      value: toCurrencyBRL(current.total),
      icon: "mdi-receipt-text-outline",
      hint:
        change === null
          ? undefined
          : `${change > 0 ? "+" : ""}${change}% vs. ${prev.label}`,
    },
  ];
});

async function fetchDashboard() {
  loading.value = true;
  try {
    const [cardRes, tenantRes, statementRes, purchaseRes] = await Promise.all([
      http.get<CreditCard[]>("/credit-cards"),
      http.get<Tenant[]>("/tenants"),
      http.get<Statement[]>("/statements"),
      // Only the count matters (onboarding): one page carries the total.
      http.get<Page<Purchase>>("/purchases", { params: { page: 1, pageSize: 1 } }),
    ]);
    cards.value = cardRes.data || [];
    tenants.value = tenantRes.data || [];
    statements.value = Array.isArray(statementRes.data) ? statementRes.data : [];
    purchaseCount.value = purchaseRes.data?.total ?? 0;
    loaded.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchDashboard();
  fetchCategoryTotals();
});
</script>

<style scoped>
.min-w-0 {
  min-width: 0;
}
.summary-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
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

.onboarding {
  display: flex;
  gap: 24px;
  align-items: center;
}
.onboarding__image {
  width: 168px;
  height: 168px;
  object-fit: contain;
  flex-shrink: 0;
}
.onboarding__body {
  flex: 1;
  min-width: 0;
}
.onboarding__steps {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 24px;
}
.onboarding__step {
  display: flex;
  align-items: center;
  gap: 12px;
}
.onboarding__check {
  color: rgba(var(--v-theme-on-surface), 0.4);
}
.onboarding__done {
  color: rgba(var(--v-theme-on-surface), 0.55);
  text-decoration: line-through;
}
@media (max-width: 900px) {
  .onboarding__image {
    display: none;
  }
  .onboarding__steps {
    grid-template-columns: minmax(0, 1fr);
  }
}

.analytics-grid {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: 24px;
}
@media (max-width: 1280px) {
  .analytics-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.tile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
.add-tile {
  min-height: 140px;
  border: 1px dashed rgba(var(--v-border-color), 0.24);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  text-decoration: none;
  font-size: 14px;
  transition: background-color 150ms ease-out, color 150ms ease-out;
}
.add-tile:hover {
  background: rgb(var(--v-theme-surface-light));
  color: rgb(var(--v-theme-primary));
}

.person-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 14px 0 8px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 999px;
  background: rgb(var(--v-theme-surface));
}
.person-chip--add {
  width: 40px;
  padding: 0;
  justify-content: center;
  border-style: dashed;
  color: rgba(var(--v-theme-on-surface), 0.6);
  text-decoration: none;
}
.person-chip--add:hover {
  color: rgb(var(--v-theme-primary));
}
</style>
