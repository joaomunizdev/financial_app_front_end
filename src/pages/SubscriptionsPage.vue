<template>
  <div class="d-flex flex-column ga-6">
    <PageHeader
      title="Assinaturas"
      description="Cobranças recorrentes incluídas nas faturas dos cartões."
    >
      <v-btn prepend-icon="mdi-plus" @click="openCreate">
        Nova assinatura
      </v-btn>
    </PageHeader>
    <v-sheet
      class="pa-3 d-flex flex-wrap align-center ga-3"
      color="surface"
      border
    >
      <v-text-field
        v-model="search"
        label="Buscar por descrição"
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
        clearable
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
        hide-details
        prepend-inner-icon="mdi-toggle-switch-outline"
        style="min-width: 180px"
      />
      <CategorySelect
        v-model="filterCategoryId"
        :categories="categories"
        hide-details
        style="min-width: 220px"
      />
      <v-spacer />
      <v-btn
        variant="text"
        prepend-icon="mdi-filter-remove-outline"
        @click="clearFilters"
        >Limpar</v-btn
      >
    </v-sheet>
    <v-card>
      <v-data-table
        :headers="headers"
        :items="filteredItems"
        :loading="loading"
        :search="search"
        class="pa-2"
      >
        <template #item.amount="{ item }">
          {{ toCurrencyBRL(item.amount) }}
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

        <template #item.category="{ item }">
          <CategoryLabel :category="categoriesById.get(item.categoryId ?? '')" />
        </template>

        <template #item.actions="{ item }">
          <v-btn icon variant="text" aria-label="Editar" @click="openEdit(item)"
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

        <template #no-data>
          <EmptyState
            v-if="hasFilters"
            :image="emptySearch"
            title="Nenhuma assinatura encontrada"
            description="Nada corresponde aos filtros escolhidos."
            action-text="Limpar filtros"
            action-icon="mdi-filter-remove-outline"
            @action="clearFilters"
          />
          <EmptyState
            v-else
            :image="emptySubscriptions"
            title="Nenhuma assinatura cadastrada"
            description="Cobranças recorrentes entram automaticamente nas faturas."
            action-text="Nova assinatura"
            @action="openCreate"
          />
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="open" max-width="640">
      <v-card>
        <v-card-title>{{
          form.id ? "Editar assinatura" : "Nova assinatura"
        }}</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="save">
            <v-select
              v-model="form.creditCardId"
              :items="cards"
              item-title="nickname"
              item-value="id"
              label="Cartão"
              prepend-inner-icon="mdi-credit-card-outline"
              :error-messages="errors.creditCardId"
            />
            <v-select
              v-model="form.tenantId"
              :items="tenants"
              item-title="name"
              item-value="id"
              label="Responsável"
              prepend-inner-icon="mdi-account-outline"
              :error-messages="errors.tenantId"
            />
            <v-text-field
              v-model="form.description"
              label="Descrição"
              maxlength="180"
              :error-messages="errors.description"
            />
            <CategorySelect v-model="form.categoryId" :categories="categories" />
            <v-text-field
              v-model="form.amount"
              label="Valor (BRL)"
              prepend-inner-icon="mdi-currency-brl"
              :error-messages="errors.amount"
              @update:modelValue="onAmountInput"
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
import PageHeader from "../components/PageHeader.vue";
import EmptyState from "../components/EmptyState.vue";
import CategoryLabel from "../components/CategoryLabel.vue";
import CategorySelect from "../components/CategorySelect.vue";
import { categoryMap } from "../utils/categories";
import emptySubscriptions from "../assets/empty/empty-subscriptions.webp";
import emptySearch from "../assets/empty/empty-search.webp";
import { ref, reactive, computed, onMounted, watch } from "vue";
import http from "../plugins/http";
import * as yup from "yup";
import { useCurrency } from "../composables/useCurrency";
import { useFormErrors } from "../composables/useFormErrors";
import { moneyField } from "../schemas/money";
import { useConfirmStore } from "../stores/confirm";
import type {
  Category,
  CreditCard,
  SelectOption,
  Subscription,
  Tenant,
} from "../types/domain";

const { toCurrencyBRL, formatCurrencyOnType, toApiMoney } = useCurrency();
const confirm = useConfirmStore();

const loading = ref(false);
const saving = ref(false);
const open = ref(false);

const items = ref<Subscription[]>([]);
const cards = ref<CreditCard[]>([]);
const tenants = ref<Tenant[]>([]);
const categories = ref<Category[]>([]);
const categoriesById = computed(() => categoryMap(categories.value));
const search = ref("");
const filterCategoryId = ref<string | null>(null);
const filterCardId = ref<string | null>(null);
const filterActive = ref<boolean | null>(null);
const activeOptions: SelectOption<boolean | null>[] = [
  { label: "Todas", value: null },
  { label: "Ativas", value: true },
  { label: "Inativas", value: false },
];

const headers = [
  { title: "Descrição", key: "description" },
  { title: "Valor", key: "amount", align: "end" as const },
  { title: "Cartão", key: "card" },
  { title: "Responsável", key: "tenant" },
  {
    title: "Categoria",
    key: "category",
    value: (s: Subscription) => categoriesById.value.get(s.categoryId ?? "")?.name ?? "",
  },
  { title: "Status", key: "active", align: "center" as const },
  { title: "", key: "actions", align: "end" as const, sortable: false },
];

type FormT = {
  id: string;
  creditCardId: string;
  tenantId: string;
  categoryId: string | null;
  description: string;
  amount: string;
  active: boolean;
};

const form = reactive<FormT>({
  id: "",
  creditCardId: "",
  tenantId: "",
  categoryId: null,
  description: "",
  amount: "",
  active: true,
});

const schema = yup.object({
  creditCardId: yup.string().required("O cartão é obrigatório"),
  tenantId: yup.string().required("O responsável é obrigatório"),
  description: yup
    .string()
    .trim()
    .required("Descrição é obrigatória")
    .max(180, "Máximo de 180 caracteres"),
  amount: moneyField(),
});

const { errors, clearErrors, validateAll } = useFormErrors(schema, [
  "creditCardId",
  "tenantId",
  "description",
  "amount",
] as const);

function onAmountInput(val: string) {
  form.amount = formatCurrencyOnType(val);
}

function tenantName(tenantId: string | null) {
  return tenants.value.find((t) => t.id === tenantId)?.name ?? "—";
}

function cardNickname(cardId: string) {
  return cards.value.find((c) => c.id === cardId)?.nickname ?? "—";
}

const filteredItems = computed(() => {
  let data = [...items.value];
  if (filterCardId.value)
    data = data.filter((i) => i.creditCardId === filterCardId.value);
  if (filterActive.value !== null)
    data = data.filter((i) => i.active === filterActive.value);
  if (filterCategoryId.value)
    data = data.filter((i) => i.categoryId === filterCategoryId.value);
  return data;
});

const hasFilters = computed(
  () =>
    !!search.value ||
    !!filterCardId.value ||
    filterActive.value !== null ||
    !!filterCategoryId.value
);

function clearFilters() {
  search.value = "";
  filterCardId.value = null;
  filterActive.value = null;
  filterCategoryId.value = null;
}

function openCreate() {
  Object.assign(form, {
    id: "",
    creditCardId: cards.value[0]?.id ?? "",
    tenantId: tenants.value[0]?.id ?? "",
    // Most recurring charges are subscriptions; the user can change it.
    categoryId:
      categories.value.find((c) => c.isDefault && c.name === "Assinaturas")?.id ?? null,
    description: "",
    amount: "",
    active: true,
  });
  clearErrors();
  open.value = true;
}

function openEdit(it: Subscription) {
  Object.assign(form, {
    id: it.id,
    creditCardId: it.creditCardId,
    tenantId: it.tenantId ?? "",
    categoryId: it.categoryId ?? null,
    description: it.description ?? "",
    amount: toCurrencyBRL(it.amount ?? "0"),
    active: it.active,
  });
  clearErrors();
  open.value = true;
}

watch(open, (v) => {
  if (!v) clearErrors();
});

async function fetchAll() {
  loading.value = true;
  try {
    const [subs, cc, tn, cat] = await Promise.all([
      http.get<Subscription[]>("/subscriptions"),
      http.get<CreditCard[]>("/credit-cards"),
      http.get<Tenant[]>("/tenants"),
      http.get<Category[]>("/categories"),
    ]);
    categories.value = cat.data || [];
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
    if (!(await validateAll(form))) return;

    const payload = {
      creditCardId: form.creditCardId,
      tenantId: form.tenantId,
      categoryId: form.categoryId,
      description: form.description.trim(),
      amount: toApiMoney(form.amount),
      active: form.active,
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
  const confirmed = await confirm.ask({
    title: "Excluir assinatura",
    message: `Deseja excluir a assinatura "${it.description}"? Essa ação não pode ser desfeita.`,
  });
  if (!confirmed) return;
  await http.delete(`/subscriptions/${it.id}`);
  await fetchAll();
}

onMounted(fetchAll);
</script>
