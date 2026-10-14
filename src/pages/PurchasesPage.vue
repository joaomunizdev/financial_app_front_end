<template>
  <div class="d-flex flex-column ga-6">
    <div class="d-flex align-center justify-space-between">
      <div class="text-h5">Compras</div>
      <v-btn prepend-icon="mdi-plus" @click="openNew">Nova</v-btn>
    </div>
    <v-sheet
      class="pa-3 rounded-xl d-flex flex-wrap align-center ga-3"
      color="surface"
      elevation="1"
    >
      <v-select
        v-model="filters.creditCardId"
        :items="creditCards"
        item-title="nickname"
        item-value="id"
        label="Cartão"
        clearable
        hide-details
        prepend-inner-icon="mdi-credit-card-outline"
        style="min-width: 240px"
      />
      <v-select
        v-model="filters.tenantId"
        :items="tenants"
        item-title="name"
        item-value="id"
        label="Responsável"
        clearable
        hide-details
        prepend-inner-icon="mdi-account-outline"
        style="min-width: 240px"
      />
    </v-sheet>
    <v-card>
      <v-data-table
        :items="items"
        :headers="headers"
        :loading="loading"
        class="pa-2"
      >
        <template #item.totalAmount="{ item }">{{
          toCurrencyBRL(item.totalAmount)
        }}</template>

        <template #item.purchaseDate="{ item }">{{
          formatDateBR(item.purchaseDate)
        }}</template>

        <template #item.card="{ item }">{{
          cardNickname(item.creditCardId)
        }}</template>

        <template #item.tenant="{ item }">{{
          tenantName(item.tenantId)
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
          <v-btn icon variant="text" aria-label="Editar" @click="edit(item)"
            ><v-icon>mdi-pencil</v-icon></v-btn
          >
          <v-btn
            icon
            variant="text"
            color="error"
            aria-label="Excluir"
            @click="remove(item)"
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
import { ref, reactive, onMounted, watch } from "vue";
import http from "../plugins/http";
import PurchaseForm from "../components/PurchaseForm.vue";
import type { PurchaseFormValues } from "../schemas/purchaseSchema";
import { useCurrency } from "../composables/useCurrency";
import { useConfirmStore } from "../stores/confirm";
import { formatDateBR } from "../utils/date";
import type { CreditCard, Purchase, Tenant } from "../types/domain";

const { toCurrencyBRL, toApiMoney } = useCurrency();
const confirm = useConfirmStore();

const loading = ref(false);
const saving = ref(false);
const open = ref(false);
const items = ref<Purchase[]>([]);
const creditCards = ref<CreditCard[]>([]);
const tenants = ref<Tenant[]>([]);
const form = ref<Purchase | null>(null);
const filters = reactive<{
  creditCardId: string | null;
  tenantId: string | null;
}>({ creditCardId: null, tenantId: null });

const headers = [
  { title: "Descrição", key: "description" },
  { title: "Data", key: "purchaseDate" },
  { title: "Cartão", key: "card" },
  { title: "Responsável", key: "tenant" },
  { title: "Valor", key: "totalAmount", align: "end" as const },
  { title: "Parcelada", key: "isInstallment", align: "center" as const },
  { title: "Parcelas", key: "installments", align: "center" as const },
  { title: "", key: "actions", align: "end" as const, sortable: false },
];

function cardNickname(cardId: string) {
  return creditCards.value.find((c) => c.id === cardId)?.nickname ?? "—";
}

function tenantName(tenantId: string) {
  return tenants.value.find((t) => t.id === tenantId)?.name ?? "—";
}

function openNew() {
  form.value = null;
  open.value = true;
}

function edit(it: Purchase) {
  form.value = { ...it };
  open.value = true;
}

async function fetchAll() {
  loading.value = true;
  try {
    const [c, t] = await Promise.all([
      http.get<CreditCard[]>("/credit-cards"),
      http.get<Tenant[]>("/tenants"),
    ]);
    creditCards.value = c.data || [];
    tenants.value = t.data || [];
    await loadPurchases();
  } finally {
    loading.value = false;
  }
}

async function loadPurchases() {
  loading.value = true;
  try {
    const params: Record<string, string> = {};
    if (filters.creditCardId) params.creditCardId = filters.creditCardId;
    if (filters.tenantId) params.tenantId = filters.tenantId;
    const { data } = await http.get<Purchase[]>("/purchases", { params });
    items.value = data || [];
  } finally {
    loading.value = false;
  }
}

watch(() => [filters.creditCardId, filters.tenantId], loadPurchases);

async function save(values: PurchaseFormValues) {
  saving.value = true;
  try {
    const isInstallment = !!values.isInstallment;
    const body = {
      creditCardId: values.creditCardId,
      tenantId: values.tenantId,
      description: values.description.trim(),
      purchaseDate: values.purchaseDate,
      totalAmount: toApiMoney(values.totalAmount),
      isInstallment,
      installmentsTotal: isInstallment ? values.installmentsTotal : null,
      installmentsPaid: isInstallment ? values.installmentsPaid ?? 0 : 0,
    };

    if (values.id) await http.patch(`/purchases/${values.id}`, body);
    else await http.post("/purchases", body);
    open.value = false;
    form.value = null;
    await loadPurchases();
  } finally {
    saving.value = false;
  }
}

async function remove(it: Purchase) {
  const confirmed = await confirm.ask({
    title: "Excluir compra",
    message: `Deseja excluir a compra "${it.description}"? Essa ação não pode ser desfeita.`,
  });
  if (!confirmed) return;
  await http.delete(`/purchases/${it.id}`);
  await loadPurchases();
}

onMounted(fetchAll);
</script>
