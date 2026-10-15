<template>
  <div class="d-flex flex-column ga-6">
    <PageHeader
      title="Compras"
      description="Compras à vista e parceladas lançadas nos cartões."
    >
      <v-btn prepend-icon="mdi-plus" @click="openNew">Nova</v-btn>
    </PageHeader>
    <v-sheet
      class="pa-3 d-flex flex-wrap align-center ga-3"
      color="surface"
      border
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
      <CategorySelect
        v-model="filters.categoryId"
        :categories="categories"
        hide-details
        style="min-width: 240px"
      />
      <v-select
        v-model="filters.paymentMethod"
        :items="PAYMENT_METHODS"
        item-title="label"
        item-value="value"
        label="Forma de pagamento"
        clearable
        hide-details
        prepend-inner-icon="mdi-wallet-outline"
        style="min-width: 220px"
      />
    </v-sheet>
    <v-card>
      <v-data-table-server
        :items="items"
        :headers="headers"
        :loading="loading"
        :items-length="total"
        :page="options.page"
        :items-per-page="options.itemsPerPage"
        :sort-by="options.sortBy"
        @update:options="onOptions"
        class="pa-2"
      >
        <template #item.totalAmount="{ item }">{{
          toCurrencyBRL(item.totalAmount)
        }}</template>

        <template #item.purchaseDate="{ item }">{{
          formatDateBR(item.purchaseDate)
        }}</template>

        <template #item.card="{ item }">
          <span v-if="item.creditCardId">{{ cardNickname(item.creditCardId) }}</span>
          <v-chip v-else size="small" variant="tonal" color="default">
            {{ paymentMethodLabel(item.paymentMethod) }}
          </v-chip>
        </template>

        <template #item.tenant="{ item }">{{
          tenantName(item.tenantId)
        }}</template>

        <template #item.category="{ item }">
          <CategoryLabel :category="categoriesById.get(item.categoryId ?? '')" />
        </template>

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
        <template #no-data>
          <EmptyState
            v-if="hasFilters"
            :image="emptySearch"
            title="Nada encontrado com esses filtros"
            description="Tente outro cartão, responsável ou categoria."
            action-text="Limpar filtros"
            action-icon="mdi-filter-remove-outline"
            @action="clearFilters"
          />
          <EmptyState
            v-else
            :image="emptyPurchases"
            title="Nenhuma compra lançada"
            description="Lance compras à vista ou parceladas para montar suas faturas."
            action-text="Nova compra"
            @action="openNew"
          />
        </template>
      </v-data-table-server>
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
            :categories="categories"
            :loading="saving"
            @submit="save"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import PageHeader from "../components/PageHeader.vue";
import EmptyState from "../components/EmptyState.vue";
import emptyPurchases from "../assets/empty/empty-purchases.webp";
import emptySearch from "../assets/empty/empty-search.webp";
import { ref, reactive, computed, onMounted } from "vue";
import { usePagedList } from "../composables/usePagedList";
import http from "../plugins/http";
import PurchaseForm from "../components/PurchaseForm.vue";
import CategoryLabel from "../components/CategoryLabel.vue";
import CategorySelect from "../components/CategorySelect.vue";
import { categoryMap } from "../utils/categories";
import { PAYMENT_METHODS, paymentMethodLabel } from "../utils/payment";
import type { PurchaseFormValues } from "../schemas/purchaseSchema";
import { useCurrency } from "../composables/useCurrency";
import { useConfirmStore } from "../stores/confirm";
import { formatDateBR } from "../utils/date";
import type { Category, CreditCard, PaymentMethod, Purchase, Tenant } from "../types/domain";

const { toCurrencyBRL, toApiMoney } = useCurrency();
const confirm = useConfirmStore();

const saving = ref(false);
const open = ref(false);
const creditCards = ref<CreditCard[]>([]);
const tenants = ref<Tenant[]>([]);
const categories = ref<Category[]>([]);
const categoriesById = computed(() => categoryMap(categories.value));
const form = ref<Purchase | null>(null);
const filters = reactive<{
  creditCardId: string | null;
  tenantId: string | null;
  categoryId: string | null;
  paymentMethod: PaymentMethod | null;
}>({ creditCardId: null, tenantId: null, categoryId: null, paymentMethod: null });
const { items, total, loading, options, onOptions, reload } = usePagedList<Purchase>(
  "/purchases",
  () => ({ ...filters })
);

const headers = [
  { title: "Descrição", key: "description" },
  { title: "Data", key: "purchaseDate" },
  { title: "Pagamento", key: "card" },
  { title: "Responsável", key: "tenant" },
  {
    title: "Categoria",
    key: "category",
    value: (p: Purchase) => categoriesById.value.get(p.categoryId ?? "")?.name ?? "",
  },
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

const hasFilters = computed(
  () =>
    !!(filters.creditCardId || filters.tenantId || filters.categoryId || filters.paymentMethod)
);

function clearFilters() {
  filters.creditCardId = null;
  filters.tenantId = null;
  filters.categoryId = null;
  filters.paymentMethod = null;
}

function openNew() {
  form.value = null;
  open.value = true;
}

function edit(it: Purchase) {
  form.value = { ...it };
  open.value = true;
}

// Options for the filters, the form and the card/tenant/category columns.
async function fetchLookups() {
  const [c, t, cat] = await Promise.all([
    http.get<CreditCard[]>("/credit-cards"),
    http.get<Tenant[]>("/tenants"),
    http.get<Category[]>("/categories"),
  ]);
  creditCards.value = c.data || [];
  tenants.value = t.data || [];
  categories.value = cat.data || [];
}

async function save(values: PurchaseFormValues) {
  saving.value = true;
  try {
    const isCard = values.paymentMethod === "card";
    const isInstallment = isCard && !!values.isInstallment;
    const body = {
      paymentMethod: values.paymentMethod,
      creditCardId: isCard ? values.creditCardId : null,
      tenantId: values.tenantId,
      categoryId: values.categoryId || null,
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
    await reload();
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
  await reload();
}

onMounted(fetchLookups);
</script>
