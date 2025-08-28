<template>
  <div class="d-flex flex-column gap-4">
    <div class="d-flex align-center justify-space-between">
      <div class="text-h5">Faturas</div>
      <div class="d-flex gap-2 align-center">
        <v-select
          v-model="creditCardId"
          :items="creditCards"
          item-title="nickname"
          item-value="id"
          label="Cartão"
          style="min-width: 260px"
        />
        <v-text-field
          v-model.number="year"
          type="number"
          label="Ano"
          style="max-width: 140px"
        />
        <v-select
          v-model.number="month"
          :items="months"
          item-title="label"
          item-value="value"
          label="Mês"
          style="max-width: 180px"
        />
        <v-btn prepend-icon="mdi-file-plus-outline" @click="generate"
          >Gerar fatura</v-btn
        >
      </div>
    </div>

    <v-card>
      <v-data-table
        :items="items"
        :headers="headers"
        :loading="loading"
        class="pa-2"
      >
        <template #item.period="{ item }"
          >{{ item.year }}-{{ String(item.month).padStart(2, "0") }}</template
        >
        <template #item.totalAmount="{ item }">{{
          currency(item.totalAmount)
        }}</template>
        <template #item.locked="{ item }">
          <v-chip
            :color="item.locked ? 'primary' : 'secondary'"
            variant="tonal"
            size="small"
          >
            {{ item.locked ? "Fechada" : "Aberta" }}
          </v-chip>
        </template>
        <template #item.paid="{ item }">
          <v-chip
            v-if="item.paidAt"
            color="success"
            variant="tonal"
            size="small"
            >Paga</v-chip
          >
          <span v-else>—</span>
        </template>
        <template #item.actions="{ item }">
          <v-btn icon variant="text" @click="view(item)"
            ><v-icon>mdi-eye</v-icon></v-btn
          >
          <v-btn icon variant="text" @click="toggleLock(item)"
            ><v-icon>{{
              item.locked ? "mdi-lock-open-variant-outline" : "mdi-lock-outline"
            }}</v-icon></v-btn
          >
          <v-btn icon variant="text" color="success" @click="openPay(item)"
            ><v-icon>mdi-cash-check</v-icon></v-btn
          >
        </template>
      </v-data-table>
    </v-card>

    <!-- View dialog -->
    <v-dialog v-model="openView" max-width="860">
      <v-card>
        <v-card-title>Fatura {{ detailTitle }}</v-card-title>
        <v-card-text>
          <div class="d-flex flex-wrap gap-4 mb-4">
            <v-text-field
              v-model="selected.closingDate"
              label="Fechamento (YYYY-MM-DD)"
              style="max-width: 240px"
            />
            <v-text-field
              v-model="selected.dueDate"
              label="Vencimento (YYYY-MM-DD)"
              style="max-width: 240px"
            />
            <v-text-field
              v-model="selected.adjustmentAmount"
              label="Ajuste (BRL)"
              style="max-width: 180px"
            />
            <v-switch v-model="selected.locked" inset label="Fechada?" />
            <v-spacer />
            <v-btn
              variant="tonal"
              prepend-icon="mdi-content-save"
              @click="saveSelected"
              >Salvar</v-btn
            >
          </div>

          <v-data-table
            :items="selected.items || []"
            :headers="itemHeaders"
            :loading="detailLoading"
          >
            <template #item.amount="{ item }">{{
              currency(item.amount)
            }}</template>
          </v-data-table>

          <div class="d-flex justify-end mt-4">
            <div class="text-subtitle-2">
              Total:
              <strong>{{ currency(selected.totalAmount || "0") }}</strong>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Pay dialog -->
    <v-dialog v-model="openPayDialog" max-width="520">
      <v-card>
        <v-card-title>Pagar fatura {{ detailTitle }}</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="confirmPay">
            <v-text-field v-model="pay.amount" label="Valor pago (BRL)" />
            <v-text-field
              v-model="pay.paidAt"
              label="Data de pagamento (YYYY-MM-DD)"
            />
            <v-btn type="submit" :loading="payLoading">Confirmar</v-btn>
            <v-btn variant="text" class="ml-2" @click="openPayDialog = false"
              >Cancelar</v-btn
            >
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { http } from "../stores/auth";

const creditCards = ref<any[]>([]);
const creditCardId = ref<string>("");
const items = ref<any[]>([]);
const loading = ref(false);

const now = new Date();
const year = ref(now.getFullYear());
const month = ref(now.getMonth() + 1);
const months = Array.from({ length: 12 }, (_, i) => ({
  label: new Date(2000, i, 1).toLocaleString("pt-BR", { month: "long" }),
  value: i + 1,
}));

const headers = [
  { title: "Período", key: "period" },
  { title: "Fechamento", key: "closingDate" },
  { title: "Vencimento", key: "dueDate" },
  { title: "Total", key: "totalAmount", align: "end" },
  { title: "Status", key: "locked", align: "center" },
  { title: "Pagamento", key: "paid", align: "center" },
  { title: "", key: "actions", align: "end", sortable: false },
];

function currency(v: string | number) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function fetchCards() {
  creditCards.value = (await http.get("/credit-cards")).data || [];
  if (!creditCardId.value && creditCards.value.length)
    creditCardId.value = creditCards.value[0].id;
}

async function load() {
  if (!creditCardId.value) return;
  loading.value = true;
  try {
    items.value =
      (
        await http.get("/statements", {
          params: { creditCardId: creditCardId.value },
        })
      ).data || [];
  } finally {
    loading.value = false;
  }
}

async function generate() {
  if (!creditCardId.value) return;
  await http.post("/statements", {
    creditCardId: creditCardId.value,
    year: year.value,
    month: month.value,
  });
  await load();
}

// Detail
const openView = ref(false);
const detailLoading = ref(false);
const selected = ref<any>({});
const itemHeaders = [
  { title: "Descrição", key: "label" },
  { title: "Valor", key: "amount", align: "end" },
];
const detailTitle = computed(() =>
  selected.value?.year
    ? `${selected.value.year}-${String(selected.value.month).padStart(2, "0")}`
    : ""
);

async function view(st: any) {
  detailLoading.value = true;
  try {
    selected.value = (await http.get(`/statements/${st.id}`)).data;
    openView.value = true;
  } finally {
    detailLoading.value = false;
  }
}

async function saveSelected() {
  if (!selected.value?.id) return;
  const body: any = {
    closingDate: selected.value.closingDate || null,
    dueDate: selected.value.dueDate || null,
    locked: !!selected.value.locked,
    adjustmentAmount: selected.value.adjustmentAmount ?? "0.00",
  };
  selected.value = (
    await http.patch(`/statements/${selected.value.id}`, body)
  ).data;
  await load();
}

async function toggleLock(st: any) {
  const updated = (
    await http.patch(`/statements/${st.id}`, { locked: !st.locked })
  ).data;
  const idx = items.value.findIndex((x) => x.id === st.id);
  if (idx >= 0) items.value[idx] = updated;
}

// Pay
const openPayDialog = ref(false);
const pay = ref({ amount: "", paidAt: "" });
const payLoading = ref(false);

function openPay(st: any) {
  selected.value = st;
  pay.value.amount = st.totalAmount || "0.00";
  pay.value.paidAt = new Date().toISOString().slice(0, 10);
  openPayDialog.value = true;
}

async function confirmPay() {
  payLoading.value = true;
  try {
    await http.post(`/statements/${selected.value.id}/pay`, {
      amount: pay.value.amount,
      paidAt: pay.value.paidAt,
    });
    openPayDialog.value = false;
    await load();
  } finally {
    payLoading.value = false;
  }
}

onMounted(async () => {
  await fetchCards();
  await load();
});
</script>
