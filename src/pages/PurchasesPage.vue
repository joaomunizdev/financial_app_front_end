<template>
  <div class="d-flex flex-column gap-4">
    <div class="d-flex align-center justify-space-between">
      <div class="text-h5">Compras</div>
      <div class="d-flex gap-2">
        <v-btn prepend-icon="mdi-plus" @click="open = true">Nova</v-btn>
      </div>
    </div>
    <v-row>
      <v-col cols="12"></v-col>
      <v-col cols="12"></v-col>
    </v-row>
    <v-card>
      <v-data-table
        :items="items"
        :headers="headers"
        :loading="loading"
        class="pa-2"
      >
        <template #item.totalAmount="{ item }">{{
          currency(item.totalAmount)
        }}</template>
        <template #item.isInstallment="{ item }">
          <v-chip
            :color="item.isInstallment ? 'primary' : 'secondary'"
            variant="tonal"
            size="small"
          >
            {{ item.isInstallment ? "Sim" : "Não" }}
          </v-chip>
        </template>
        <template #item.installments="{ item }">
          <span v-if="item.isInstallment"
            >{{ item.installmentsPaid }}/{{ item.installmentsTotal }}</span
          >
          <span v-else>—</span>
        </template>
        <template #item.actions="{ item }">
          <v-btn icon variant="text" @click="edit(item)"
            ><v-icon>mdi-pencil</v-icon></v-btn
          >
          <v-btn icon variant="text" color="error" @click="remove(item)"
            ><v-icon>mdi-delete</v-icon></v-btn
          >
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="open" max-width="720">
      <v-card>
        <v-card-title>{{
          form?.id ? "Editar compra" : "Nova compra"
        }}</v-card-title>
        <v-card-text>
          <PurchaseForm
            :model-value="form"
            :credit-cards="creditCards"
            :tenants="tenants"
            :loading="saving"
            @submit="save"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import http from "../plugins/http";
import PurchaseForm from "../components/PurchaseForm.vue";

const loading = ref(false);
const saving = ref(false);
const open = ref(false);
const items = ref<any[]>([]);
const creditCards = ref<any[]>([]);
const tenants = ref<any[]>([]);
const form = ref<any | null>(null);
const filters = ref({ creditCardId: "", tenantId: "" });

const headers = [
  { title: "Descrição", key: "description" },
  { title: "Data", key: "purchaseDate" },
  { title: "Valor", key: "totalAmount", align: "end" },
  { title: "Parcelada", key: "isInstallment", align: "center" },
  { title: "Parcelas", key: "installments", align: "center" },
  { title: "", key: "actions", align: "end", sortable: false },
];

function currency(v: string) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function edit(it: any) {
  form.value = { ...it };
  open.value = true;
}

async function fetchAll() {
  loading.value = true;
  try {
    const [c, t] = await Promise.all([
      http.get("/credit-cards"),
      http.get("/tenants"),
    ]);
    creditCards.value = c.data || [];
    tenants.value = t.data || [];
    await loadPurchases();
  } finally {
    loading.value = false;
  }
}

async function loadPurchases() {
  const params: any = {};
  if (filters.value.creditCardId)
    params.creditCardId = filters.value.creditCardId;
  if (filters.value.tenantId) params.tenantId = filters.value.tenantId;
  const { data } = await http.get("/purchases", { params });
  items.value = data || [];
}

async function save(payload: any) {
  saving.value = true;
  try {
    if (payload.id) await http.patch(`/purchases/${payload.id}`, payload);
    else await http.post("/purchases", payload);
    open.value = false;
    form.value = null;
    await loadPurchases();
  } finally {
    saving.value = false;
  }
}

async function remove(it: any) {
  await http.delete(`/purchases/${it.id}`);
  await loadPurchases();
}

onMounted(fetchAll);
</script>
