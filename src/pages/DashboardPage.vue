<template>
  <div class="d-flex flex-column gap-4">
    <div class="d-flex align-center justify-space-between">
      <div class="text-h5">Resumo</div>
    </div>

    <FilterBar
      class="mt-2"
      :cards="cards"
      :statements="statements"
      :model-value-card-id="creditCardId"
      :model-value-statement-id="statementId"
      @update:cardId="onCardChange"
      @update:statementId="(v) => (statementId = v)"
      @apply="fetchAll"
      @clear="clearFilter"
    />
  </div>
  <div class="d-flex flex-column gap-4">
    <v-row>
      <v-col cols="12"></v-col>
      <v-col cols="12"></v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="4">
        <StatCard
          label="Total global"
          :value="currency(globalTotal)"
          icon="mdi-cash-multiple"
        />
      </v-col>
      <v-col cols="12" md="4">
        <StatCard
          label="Cartões"
          :value="cards.length.toString()"
          icon="mdi-credit-card-outline"
        />
      </v-col>
      <v-col cols="12" md="4">
        <StatCard
          label="Responsáveis"
          :value="tenants.length.toString()"
          icon="mdi-account-multiple-outline"
        />
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12"></v-col>
      <v-col cols="12"></v-col>
    </v-row>
    <v-card>
      <v-card-title class="text-subtitle-1"
        >Totais por responsável</v-card-title
      >
      <v-data-table
        :items="byTenant"
        :headers="headers"
        :loading="loading"
        class="pa-2"
      />
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { http } from "../stores/auth";
import StatCard from "../components/StatCard.vue";
import FilterBar from "../components/FilterBar.vue";

const loading = ref(false);
const globalTotal = ref(0);
const byTenant = ref<any[]>([]);
const cards = ref<any[]>([]);
const tenants = ref<any[]>([]);

const creditCardId = ref<string>("");
const statements = ref<any[]>([]);
const statementId = ref<string>("");

const headers = [
  { title: "Responsável", key: "tenantName" },
  { title: "Total", key: "totalAmount", align: "end" as const },
];

function currency(v: string | number) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function loadCards() {
  cards.value = (await http.get("/credit-cards")).data || [];
  if (!creditCardId.value && cards.value.length) {
    creditCardId.value = cards.value[0].id;
    await loadStatements();
  }
}

async function loadStatements() {
  statements.value = [];
  statementId.value = "";
  if (!creditCardId.value) return;
  const list =
    (
      await http.get("/statements", {
        params: { creditCardId: creditCardId.value },
      })
    ).data || [];
  statements.value = list.map((s: any) => ({
    ...s,
    periodLabel: `${String(s.month).padStart(2, "0")}/${s.year}`,
  }));
  if (statements.value.length) statementId.value = statements.value[0].id;
}

async function fetchAll() {
  loading.value = true;
  try {
    const params = statementId.value ? { statementId: statementId.value } : {};
    const [g, t, tn] = await Promise.all([
      http.get("/reports/global", { params }),
      http.get("/reports/by-tenant", { params }),
      http.get("/tenants"),
    ]);
    globalTotal.value = Number(g.data.totalAmount || g.data?.totalamount || 0);
    byTenant.value = (t.data || []).map((x: any) => ({
      ...x,
      totalAmount: currency(x.totalAmount || x.totalamount),
    }));
    tenants.value = tn.data || [];
  } finally {
    loading.value = false;
  }
}

async function onCardChange(v: string) {
  creditCardId.value = v;
  await loadStatements();
}

async function clearFilter() {
  statementId.value = "";
  await fetchAll();
}

onMounted(async () => {
  await loadCards();
  await fetchAll();
});
</script>
