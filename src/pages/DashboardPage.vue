<template>
  <div class="d-flex flex-column gap-4">
    <div class="d-flex align-center justify-space-between">
      <div class="text-h5">Resumo</div>
      <v-btn variant="tonal" prepend-icon="mdi-refresh" @click="fetchAll"
        >Atualizar</v-btn
      >
    </div>
    <v-row>
      <v-col cols="12"></v-col>
    </v-row>
    <v-row>
      <v-col cols="12" md="4"
        ><StatCard
          label="Total global"
          :value="currency(globalTotal)"
          icon="mdi-cash-multiple"
      /></v-col>
      <v-col cols="12" md="4"
        ><StatCard
          label="Cartões"
          :value="cards.length.toString()"
          icon="mdi-credit-card-outline"
      /></v-col>
      <v-col cols="12" md="4"
        ><StatCard
          label="Responsáveis"
          :value="tenants.length.toString()"
          icon="mdi-account-multiple-outline"
      /></v-col>
    </v-row>
    <v-row>
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
import http from "../plugins/http";
import StatCard from "../components/StatCard.vue";

const loading = ref(false);
const globalTotal = ref(0);
const byTenant = ref<any[]>([]);
const cards = ref<any[]>([]);
const tenants = ref<any[]>([]);

const headers = [
  { title: "Responsável", key: "tenantName" },
  { title: "Total", key: "total_amount", align: "end" },
];

function currency(v: string | number) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function fetchAll() {
  loading.value = true;
  try {
    const [g, t, c] = await Promise.all([
      http.get("/reports/global"),
      http.get("/reports/by-tenant"),
      http.get("/credit-cards"),
    ]);
    globalTotal.value = Number(
      g.data.total_amount || g.data?.total_amount || 0
    );
    byTenant.value = (t.data || []).map((x: any) => ({
      ...x,
      total_amount: currency(x.total_amount || x.total_amount),
    }));
    cards.value = c.data || [];
    const tn = await http.get("/tenants");
    tenants.value = tn.data || [];
  } finally {
    loading.value = false;
  }
}

onMounted(fetchAll);
</script>
