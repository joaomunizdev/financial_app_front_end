<template>
  <div class="dashboard-page">
    <v-sheet class="pa-6 rounded-xl dashboard-hero" color="surface" elevation="1">
      <div
        class="d-flex flex-column flex-md-row align-center gap-6 justify-space-between"
      >
        <div class="flex-grow-1">
          <div class="text-body-2 text-medium-emphasis mb-1">
            Total global atualizado
          </div>
          <div class="text-h3 font-weight-bold">
            {{ currency(globalTotal) }}
          </div>
          <div class="text-body-2 text-medium-emphasis">
            {{ lastUpdatedLabel }}
          </div>
        </div>
        <div class="flex-grow-1 w-100">
          <div class="text-body-2 text-medium-emphasis mb-1">
            Limite combinado
          </div>
          <div class="text-h5">{{ currency(totalLimit) }}</div>
          <v-progress-linear
            class="mt-2"
            rounded
            height="8"
            :model-value="utilization"
            color="primary"
          />
          <div class="text-body-2 text-medium-emphasis mt-1">
            Utilizado {{ utilization.toFixed(0) }}%
          </div>
        </div>
      </div>
    </v-sheet>

    <v-row class="dashboard-stats-row">
      <v-col cols="12" md="4">
        <StatCard
          label="Cartões ativos"
          :value="cards.length.toString()"
          icon="mdi-credit-card-multiple-outline"
        />
      </v-col>
      <v-col cols="12" md="4">
        <StatCard
          label="Responsáveis"
          :value="tenants.length.toString()"
          icon="mdi-account-group-outline"
        />
      </v-col>
      <v-col cols="12" md="4">
        <StatCard
          label="Limite combinado"
          :value="currency(totalLimit)"
          icon="mdi-wallet-outline"
        />
      </v-col>
    </v-row>

    <v-row class="dashboard-section-row">
      <v-col cols="12" md="8">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between">
            Cartões ativos
            <v-btn icon variant="text" @click="refresh" :loading="loading">
              <v-icon>mdi-refresh</v-icon>
            </v-btn>
          </v-card-title>
          <v-divider />
          <v-card-text>
            <v-list v-if="cards.length" lines="two">
              <v-list-item
                v-for="card in cards"
                :key="card.id"
                :title="card.nickname"
                :subtitle="cardSubtitle(card)"
              >
                <template #append>
                  <div class="text-right">
                    <div class="text-caption text-medium-emphasis">Limite</div>
                    <div class="text-body-2 font-weight-medium">
                      {{ currency(card.limitAmount || card.limitamount || 0) }}
                    </div>
                  </div>
                </template>
              </v-list-item>
            </v-list>
            <v-alert v-else type="info" variant="tonal">
              Cadastre seus cartões para começar a acompanhar.
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>Responsáveis</v-card-title>
          <v-divider />
          <v-card-text>
            <v-list v-if="tenants.length" density="comfortable">
              <v-list-item
                v-for="tenant in tenants"
                :key="tenant.id"
                :title="tenant.name"
                :subtitle="tenant.email || tenant.document || ''"
              >
                <template #prepend>
                  <v-avatar color="primary" variant="tonal">
                    <span class="font-weight-medium">
                      {{ tenant.name?.charAt(0)?.toUpperCase() || "?" }}
                    </span>
                  </v-avatar>
                </template>
              </v-list-item>
            </v-list>
            <v-alert v-else type="info" variant="tonal">
              Nenhum responsável cadastrado até o momento.
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { http } from "../stores/auth";
import StatCard from "../components/StatCard.vue";

const router = useRouter();
const loading = ref(false);
const cards = ref<any[]>([]);
const tenants = ref<any[]>([]);
const globalTotal = ref(0);
const lastUpdated = ref("");

const totalLimit = computed(() =>
  cards.value.reduce((sum, card) => {
    const limit = Number(card.limitAmount ?? card.limitamount ?? 0);
    return sum + (isNaN(limit) ? 0 : limit);
  }, 0)
);

const utilization = computed(() => {
  if (!totalLimit.value) return 0;
  return Math.min(100, (globalTotal.value / totalLimit.value) * 100);
});

const lastUpdatedLabel = computed(() =>
  lastUpdated.value
    ? `Atualizado em ${lastUpdated.value}`
    : "Carregando..."
);

function currency(v: string | number) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function cardSubtitle(card: any) {
  const suffix = card.last4 ? `Final ${card.last4}` : "";
  if (card.brand && suffix) return `${card.brand} • ${suffix}`;
  if (card.brand) return card.brand;
  return suffix || "Cartão cadastrado";
}

async function fetchDashboard() {
  loading.value = true;
  try {
    const [cardRes, tenantRes, globalRes] = await Promise.all([
      http.get("/credit-cards"),
      http.get("/tenants"),
      http.get("/reports/global"),
    ]);
    cards.value = cardRes.data || [];
    tenants.value = tenantRes.data || [];
    globalTotal.value = Number(
      globalRes.data.totalAmount ?? globalRes.data?.totalamount ?? 0
    );
    lastUpdated.value = new Date().toLocaleString("pt-BR");
  } finally {
    loading.value = false;
  }
}

function refresh() {
  fetchDashboard();
}

function goToReports() {
  router.push("/reports");
}

onMounted(fetchDashboard);
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.dashboard-hero {
  background: linear-gradient(
      145deg,
      rgba(var(--v-theme-primary), 0.2),
      rgba(var(--v-theme-secondary), 0.12)
    ),
    rgb(var(--v-theme-surface));
}

.dashboard-stats-row,
.dashboard-section-row {
  margin: 0;
}

.dashboard-stats-row :deep(.v-col),
.dashboard-section-row :deep(.v-col) {
  padding-top: 12px;
  padding-bottom: 12px;
}
</style>
