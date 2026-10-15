<template>
  <div class="d-flex flex-column ga-6">
    <PageHeader
      title="Fontes de renda"
      description="Rendas fixas e pontuais usadas no saldo dos relatórios."
    >
      <v-btn prepend-icon="mdi-plus" @click="openNew">Nova fonte de renda</v-btn>
    </PageHeader>
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
        <template #item.tenantName="{ item }">
          {{ item.tenant?.name ?? "—" }}
        </template>
        <template #item.amount="{ item }">
          {{ toCurrencyBRL(item.amount) }}
        </template>
        <template #item.incomeType="{ item }">
          {{ incomeTypeLabel(item.incomeType) }}
        </template>
        <template #item.period="{ item }">
          <span class="tabular-nums">{{ periodLabel(item) }}</span>
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
            :image="emptyIncome"
            title="Cadastre suas rendas"
            description="Elas entram no saldo de cada responsável nos relatórios."
            action-text="Nova fonte de renda"
            @action="openNew"
          />
        </template>
      </v-data-table-server>
    </v-card>

    <v-dialog v-model="open" max-width="520" :key="dialogKey">
      <v-card>
        <v-card-title>{{
          form.id ? "Editar fonte de renda" : "Nova fonte de renda"
        }}</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="save">
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
            <v-text-field
              v-model="form.amount"
              label="Valor (BRL)"
              :error-messages="errors.amount"
              @update:modelValue="onAmountInput"
            />
            <v-select
              v-model="form.incomeType"
              :items="incomeTypes"
              item-title="label"
              item-value="value"
              label="Tipo de renda"
              :error-messages="errors.incomeType"
            />
            <v-text-field
              v-if="form.incomeType === 'one_time'"
              v-model="form.startDate"
              label="Data de recebimento"
              type="date"
              prepend-inner-icon="mdi-calendar"
              :error-messages="errors.startDate"
            />
            <div v-else class="d-flex flex-wrap ga-3">
              <v-text-field
                v-model="form.startDate"
                label="Início"
                type="date"
                prepend-inner-icon="mdi-calendar"
                hint="Opcional. Sem data, vale para todos os meses."
                persistent-hint
                clearable
                :error-messages="errors.startDate"
                style="min-width: 200px"
              />
              <v-text-field
                v-model="form.endDate"
                label="Fim"
                type="date"
                prepend-inner-icon="mdi-calendar"
                hint="Opcional. Sem data, não tem fim."
                persistent-hint
                clearable
                :error-messages="errors.endDate"
                style="min-width: 200px"
              />
            </div>
            <v-btn type="submit" :loading="saving" class="mt-2">Salvar</v-btn>
            <v-btn variant="text" class="mt-2 ml-2" @click="onCancel"
              >Cancelar</v-btn
            >
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import PageHeader from "../components/PageHeader.vue";
import EmptyState from "../components/EmptyState.vue";
import emptyIncome from "../assets/empty/empty-income.webp";
import { ref, reactive, onMounted, watch } from "vue";
import { usePagedList } from "../composables/usePagedList";
import http from "../plugins/http";
import * as yup from "yup";
import { useCurrency } from "../composables/useCurrency";
import { useFormErrors } from "../composables/useFormErrors";
import { moneyField } from "../schemas/money";
import { useConfirmStore } from "../stores/confirm";
import { formatDateBR, toDateInput, todayLocalISO } from "../utils/date";
import type {
  IncomeSource,
  IncomeType,
  SelectOption,
  Tenant,
} from "../types/domain";

const { toCurrencyBRL, formatCurrencyOnType, toApiMoney } = useCurrency();
const confirm = useConfirmStore();

const saving = ref(false);
const open = ref(false);
const dialogKey = ref(0);

const { items, total, loading, options, onOptions, reload } = usePagedList<IncomeSource>(
  "/income-sources"
);
const tenants = ref<Tenant[]>([]);
const incomeTypes: SelectOption<IncomeType>[] = [
  { label: "Fixa", value: "fixed" },
  { label: "Pontual", value: "one_time" },
];
const headers = [
  { title: "Responsável", key: "tenantName" },
  { title: "Descrição", key: "description" },
  { title: "Tipo", key: "incomeType" },
  { title: "Data", key: "period", sortable: false },
  { title: "Valor", key: "amount", align: "end" as const },
  { title: "", key: "actions", align: "end" as const, sortable: false },
];

function onAmountInput(val: string) {
  form.amount = formatCurrencyOnType(val);
}

type FormT = {
  id: string;
  tenantId: string;
  description: string;
  amount: string;
  incomeType: IncomeType;
  startDate: string;
  endDate: string;
};

const emptyForm = (): FormT => ({
  id: "",
  tenantId: "",
  description: "",
  amount: "",
  incomeType: "fixed",
  startDate: "",
  endDate: "",
});

const form = reactive<FormT>(emptyForm());

const schema = yup.object({
  tenantId: yup.string().required("O responsável é obrigatório"),
  description: yup
    .string()
    .trim()
    .required("Descrição é obrigatória")
    .max(180, "Máximo de 180 caracteres"),
  amount: moneyField(),
  incomeType: yup
    .string()
    .oneOf(["fixed", "one_time"])
    .required("O tipo de renda é obrigatório"),
  // One-time income needs the day it is received; fixed income dates are optional.
  startDate: yup
    .string()
    .nullable()
    .test(
      "required-one-time",
      "Informe a data de recebimento",
      (v) => form.incomeType !== "one_time" || !!v
    ),
  endDate: yup
    .string()
    .nullable()
    .test(
      "after-start",
      "O fim deve ser igual ou depois do início",
      (v) => form.incomeType === "one_time" || !v || !form.startDate || v >= form.startDate
    ),
});

const { errors, clearErrors, validateAll } = useFormErrors(schema, [
  "tenantId",
  "description",
  "amount",
  "incomeType",
  "startDate",
  "endDate",
] as const);

function openNew() {
  Object.assign(form, emptyForm());
  form.startDate = form.incomeType === "one_time" ? todayLocalISO() : "";
  clearErrors();
  open.value = true;
}

function edit(it: IncomeSource) {
  Object.assign(form, {
    id: it.id,
    tenantId: it.tenantId ?? it.tenant?.id ?? "",
    description: it.description ?? "",
    amount: toCurrencyBRL(it.amount ?? "0"),
    incomeType: it.incomeType ?? "fixed",
    startDate: toDateInput(it.startDate),
    endDate: toDateInput(it.endDate),
  });
  clearErrors();
  open.value = true;
}

watch(open, (val) => {
  if (!val) {
    Object.assign(form, emptyForm());
    clearErrors();
    dialogKey.value++;
  }
});

function onCancel() {
  open.value = false;
}

function incomeTypeLabel(value: string) {
  return incomeTypes.find((type) => type.value === value)?.label ?? "—";
}

// One-time: the day received. Fixed: the validity window ("Sempre" when open on both ends).
function periodLabel(it: IncomeSource) {
  if (it.incomeType === "one_time") return it.startDate ? formatDateBR(it.startDate) : "—";
  if (it.startDate && it.endDate) return `${formatDateBR(it.startDate)} a ${formatDateBR(it.endDate)}`;
  if (it.startDate) return `Desde ${formatDateBR(it.startDate)}`;
  if (it.endDate) return `Até ${formatDateBR(it.endDate)}`;
  return "Sempre";
}

// A one-time income always has a date: suggest today when switching to it.
watch(
  () => form.incomeType,
  (type) => {
    if (type === "one_time" && !form.startDate) form.startDate = todayLocalISO();
  }
);

async function fetchTenants() {
  tenants.value = (await http.get<Tenant[]>("/tenants")).data || [];
}

async function save() {
  saving.value = true;
  try {
    if (!(await validateAll(form))) return;

    const body = {
      tenantId: form.tenantId,
      description: form.description.trim(),
      amount: toApiMoney(form.amount),
      incomeType: form.incomeType,
      startDate: form.startDate || null,
      endDate: form.incomeType === "fixed" ? form.endDate || null : null,
    };

    if (form.id) await http.patch(`/income-sources/${form.id}`, body);
    else await http.post("/income-sources", body);

    open.value = false;
    await reload();
  } finally {
    saving.value = false;
  }
}

async function remove(it: IncomeSource) {
  const confirmed = await confirm.ask({
    title: "Excluir fonte de renda",
    message: `Deseja excluir a fonte de renda "${it.description}"? Essa ação não pode ser desfeita.`,
  });
  if (!confirmed) return;
  await http.delete(`/income-sources/${it.id}`);
  await reload();
}

onMounted(fetchTenants);
</script>
