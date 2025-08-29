<template>
  <div class="d-flex flex-column gap-4">
    <div class="d-flex align-center justify-space-between">
      <div class="text-h5">Assinaturas</div>
      <v-btn prepend-icon="mdi-plus" @click="openCreate">
        Nova assinatura
      </v-btn>
    </div>
    <v-row>
      <v-col cols="12"></v-col>
      <v-col cols="12"></v-col>
    </v-row>
    <v-sheet
      class="pa-3 rounded-xl d-flex flex-wrap align-center gap-3"
      color="surface"
      elevation="1"
    >
      <v-text-field
        v-model="search"
        label="Buscar por descrição"
        variant="outlined"
        density="comfortable"
        hide-details
        prepend-inner-icon="mdi-magnify"
        style="min-width: 280px"
      />
      <v-select
        v-model="filterCardId"
        :items="cards"
        item-title="nickname"
        item-value="id"
        label="Cartão"
        variant="outlined"
        density="comfortable"
        hide-details
        prepend-inner-icon="mdi-credit-card-outline"
        style="min-width: 240px"
      />
      <v-select
        v-model="filterActive"
        :items="activeOptions"
        item-title="label"
        item-value="value"
        label="Status"
        variant="outlined"
        density="comfortable"
        hide-details
        prepend-inner-icon="mdi-toggle-switch-outline"
        style="min-width: 180px"
      />
      <v-spacer />
      <v-btn variant="tonal" prepend-icon="mdi-filter" @click="applyFilters"
        >Aplicar</v-btn
      >
      <v-btn
        variant="text"
        prepend-icon="mdi-filter-remove-outline"
        @click="clearFilters"
        >Limpar</v-btn
      >
    </v-sheet>
    <v-row>
      <v-col cols="12"></v-col>
      <v-col cols="12"></v-col>
    </v-row>
    <v-card>
      <v-data-table
        :headers="headers"
        :items="filteredItems"
        :loading="loading"
        :search="search"
        class="pa-2"
      >
        <template #item.amount="{ item }">
          {{ currency(item.amount) }}
        </template>

        <template #item.active="{ item }">
          <v-chip
            size="small"
            :color="item.active ? 'primary' : 'secondary'"
            variant="tonal"
          >
            {{ item.active ? "Ativa" : "Inativa" }}
          </v-chip>
        </template>

        <template #item.card="{ item }">
          {{ cardNickname(item.creditCardId) }}
        </template>

        <template #item.tenant="{ item }">
          {{ tenantName(item.tenantId) }}
        </template>

        <template #item.actions="{ item }">
          <v-btn icon variant="text" @click="openEdit(item)"
            ><v-icon>mdi-pencil</v-icon></v-btn
          >
          <v-btn icon variant="text" color="error" @click="remove(item)"
            ><v-icon>mdi-delete</v-icon></v-btn
          >
        </template>

        <template #no-data>
          <div class="text-body-2 text-medium-emphasis pa-6 text-center">
            Nenhuma assinatura encontrada.
          </div>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="open" max-width="640">
      <v-card>
        <v-card-title>{{
          form.id ? "Editar assinatura" : "Nova assinatura"
        }}</v-card-title>
        <v-card-text>
          <v-form ref="formRef" @submit.prevent="save">
            <v-select
              v-model="form.creditCardId"
              :items="cards"
              item-title="nickname"
              item-value="id"
              label="Cartão"
              required
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-credit-card-outline"
            />
            <v-select
              v-model="form.tenantId"
              :items="tenants"
              item-title="name"
              item-value="id"
              label="Responsável"
              required
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-account-outline"
            />
            <v-text-field
              v-model.trim="form.description"
              label="Descrição"
              required
              variant="outlined"
              density="comfortable"
            />
            <v-text-field
              v-model="form.amount"
              label="Valor (BRL)"
              hint="Use ponto para decimais. Ex.: 49.90"
              persistent-hint
              required
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-currency-brl"
            />
            <v-switch v-model="form.active" inset label="Ativa?" class="mt-2" />
            <div class="mt-4">
              <v-btn type="submit" :loading="saving">Salvar</v-btn>
              <v-btn variant="text" class="ml-2" @click="open = false"
                >Cancelar</v-btn
              >
            </div>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { http } from "../stores/auth";

type Subscription = {
  id: string;
  creditCardId: string;
  description: string;
  amount: string;
  tenantId: string;
  active: boolean;
  createdAt?: string;
};

type Card = { id: string; nickname: string };

const loading = ref(false);
const saving = ref(false);
const open = ref(false);
const formRef = ref();

const items = ref<Subscription[]>([]);
const cards = ref<Card[]>([]);
const tenants = ref<any[]>([]);
const search = ref("");
const filterCardId = ref<string>("");
const filterActive = ref<boolean | null>(null);
const activeOptions = [
  { label: "Todas", value: null },
  { label: "Ativas", value: true },
  { label: "Inativas", value: false },
];

const headers = [
  { title: "Descrição", key: "description" },
  { title: "Valor", key: "amount", align: "end" as const },
  { title: "Cartão", key: "card" },
  { title: "Responsável", key: "tenant" },
  { title: "Status", key: "active", align: "center" as const },
  { title: "", key: "actions", align: "end" as const, sortable: false },
];

const form = reactive<Partial<Subscription>>({
  id: "",
  creditCardId: "",
  description: "",
  tenantId: "",
  amount: "",
  active: true,
});

function tenantName(tenantId: string) {
  const t = tenants.value.find((t) => t.id === tenantId);
  return t?.name ?? "—";
}

function currency(v: string | number) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function cardNickname(cardId: string) {
  const c = cards.value.find((c) => c.id === cardId);
  return c?.nickname ?? "—";
}

const filteredItems = computed(() => {
  let data = [...items.value];
  if (filterCardId.value)
    data = data.filter((i) => i.creditCardId === filterCardId.value);
  if (filterActive.value !== null)
    data = data.filter((i) => i.active === filterActive.value);
  return data;
});

function applyFilters() {

}

function clearFilters() {
  search.value = "";
  filterCardId.value = "";
  filterActive.value = null;
}

function openCreate() {
  Object.assign(form, {
    id: "",
    creditCardId: cards.value[0]?.id ?? "",
    tenantId: tenants.value[0]?.id ?? "",
    description: "",
    amount: "",
    active: true,
  });
  open.value = true;
}

function openEdit(it: Subscription) {
  Object.assign(form, it);
  open.value = true;
}

async function fetchAll() {
  loading.value = true;
  try {
    const [subs, cc, tn] = await Promise.all([
      http.get("/subscriptions"),
      http.get("/credit-cards"),
      http.get("/tenants"),
    ]);
    items.value = subs.data || [];
    cards.value = cc.data || [];
    tenants.value = tn.data || [];
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    const payload = {
      creditCardId: form.creditCardId,
      tenantId: form.tenantId,
      description: String(form.description || "").trim(),
      amount: String(form.amount || "0").replace(",", "."),
      active: !!form.active,
    };
    if (form.id) await http.patch(`/subscriptions/${form.id}`, payload);
    else await http.post("/subscriptions", payload);
    open.value = false;
    await fetchAll();
  } finally {
    saving.value = false;
  }
}

async function remove(it: Subscription) {
  await http.delete(`/subscriptions/${it.id}`);
  await fetchAll();
}

onMounted(fetchAll);
</script>
