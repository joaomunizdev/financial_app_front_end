<template>
  <div class="dashboard-page">
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
import { http } from "../stores/auth";
import StatCard from "../components/StatCard.vue";

const loading = ref(false);
const cards = ref<any[]>([]);
const tenants = ref<any[]>([]);

const totalLimit = computed(() =>
  cards.value.reduce((sum, card) => {
    const limit = Number(card.limitAmount ?? card.limitamount ?? 0);
    return sum + (isNaN(limit) ? 0 : limit);
  }, 0)
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
    const [cardRes, tenantRes] = await Promise.all([
      http.get("/credit-cards"),
      http.get("/tenants"),
    ]);
    cards.value = cardRes.data || [];
    tenants.value = tenantRes.data || [];
  } finally {
    loading.value = false;
  }
}

function refresh() {
  fetchDashboard();
}

onMounted(fetchDashboard);
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 32px;
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
