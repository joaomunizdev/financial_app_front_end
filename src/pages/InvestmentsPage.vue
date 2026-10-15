<template>
  <div class="d-flex flex-column ga-6">
    <PageHeader
      title="Investimentos"
      description="Sua carteira: aportes, resgates e o saldo atualizado de cada investimento."
    >
      <v-btn prepend-icon="mdi-plus" @click="openNew">Novo investimento</v-btn>
    </PageHeader>

    <v-sheet class="pa-3 d-flex flex-wrap align-center ga-3" color="surface" border>
      <v-text-field
        v-model="search"
        label="Buscar por nome ou instituição"
        hide-details
        prepend-inner-icon="mdi-magnify"
        style="min-width: 280px"
      />
      <v-select
        v-model="filterType"
        :items="INVESTMENT_TYPES"
        item-title="label"
        item-value="value"
        label="Tipo"
        clearable
        hide-details
        prepend-inner-icon="mdi-shape-outline"
        style="min-width: 240px"
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
        <template #item.type="{ item }">
          <span class="type-label">
            <span class="type-dot" :style="{ background: typeColor(item.type) }" />
            {{ investmentTypeInfo(item.type).label }}
          </span>
        </template>
        <template #item.institution="{ item }">{{ item.institution || "—" }}</template>
        <template #item.investedTotal="{ item }">
          <span class="tabular-nums">{{ toCurrencyBRL(item.investedTotal) }}</span>
        </template>
        <template #item.currentValue="{ item }">
          <span class="tabular-nums font-weight-medium">{{ toCurrencyBRL(item.currentValue) }}</span>
        </template>
        <template #item.actions="{ item }">
          <v-btn icon variant="text" aria-label="Movimentações" @click="openMovements(item)"
            ><v-icon>mdi-swap-vertical</v-icon></v-btn
          >
          <v-btn icon variant="text" aria-label="Editar" @click="edit(item)"
            ><v-icon>mdi-pencil</v-icon></v-btn
          >
          <v-btn icon variant="text" color="error" aria-label="Excluir" @click="remove(item)"
            ><v-icon>mdi-delete</v-icon></v-btn
          >
        </template>
        <template #no-data>
          <EmptyState
            v-if="hasFilters"
            :image="emptySearch"
            title="Nenhum investimento encontrado"
            description="Nada corresponde aos filtros escolhidos."
            action-text="Limpar filtros"
            action-icon="mdi-filter-remove-outline"
            @action="clearFilters"
          />
          <EmptyState
            v-else
            :image="emptyInvestments"
            title="Comece sua carteira"
            description="Cadastre seus investimentos e registre aportes, resgates e o saldo atual."
            action-text="Novo investimento"
            @action="openNew"
          />
        </template>
      </v-data-table-server>
    </v-card>

    <v-dialog v-model="open" max-width="520" :key="dialogKey">
      <v-card>
        <v-card-title>{{ form.id ? "Editar investimento" : "Novo investimento" }}</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="save">
            <v-text-field
              v-model="form.name"
              label="Nome"
              placeholder="Ex.: CDB 110% CDI, Tesouro Selic 2029"
              maxlength="120"
              :error-messages="errors.name"
            />
            <v-select
              v-model="form.type"
              :items="INVESTMENT_TYPES"
              item-title="label"
              item-value="value"
              label="Tipo"
              :error-messages="errors.type"
            />
            <v-text-field
              v-model="form.institution"
              label="Instituição (opcional)"
              placeholder="Banco ou corretora"
              maxlength="80"
              :error-messages="errors.institution"
            />
            <v-btn type="submit" :loading="saving" class="mt-2">Salvar</v-btn>
            <v-btn variant="text" class="mt-2 ml-2" @click="open = false">Cancelar</v-btn>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="movDlg.open" max-width="760">
      <v-card v-if="movDlg.investment">
        <v-card-title class="d-flex align-start justify-space-between ga-4">
          <div>
            <div>{{ movDlg.investment.name }}</div>
            <div class="text-body-2 text-medium-emphasis">
              {{ investmentTypeInfo(movDlg.investment.type).label }}
              <template v-if="movDlg.investment.institution">
                · {{ movDlg.investment.institution }}
              </template>
            </div>
          </div>
          <div class="text-right">
            <div class="text-caption text-medium-emphasis">Valor atual</div>
            <div class="text-h6 tabular-nums">{{ toCurrencyBRL(movDlg.investment.currentValue) }}</div>
          </div>
        </v-card-title>
        <v-card-text>
          <v-form class="mb-4" @submit.prevent="addMovement">
            <v-btn-toggle
              v-model="movForm.kind"
              mandatory
              divided
              variant="outlined"
              color="primary"
              density="comfortable"
              class="mb-4"
              aria-label="Tipo de movimentação"
            >
              <v-btn v-for="k in MOVEMENT_KINDS" :key="k.value" :value="k.value" :prepend-icon="k.icon">
                {{ k.label }}
              </v-btn>
            </v-btn-toggle>
            <p class="text-body-2 text-medium-emphasis mb-3">{{ kindHint }}</p>
            <div class="mov-form">
              <v-text-field
                v-model="movForm.amount"
                :label="movForm.kind === 'balance' ? 'Saldo na data (BRL)' : 'Valor (BRL)'"
                :error-messages="movErrors.amount"
                @update:modelValue="(v: string) => (movForm.amount = formatCurrencyOnType(v))"
              />
              <v-text-field
                v-model="movForm.date"
                label="Data"
                type="date"
                :max="todayLocalISO()"
                :error-messages="movErrors.date"
              />
              <v-btn type="submit" :loading="movDlg.saving" class="mov-form__submit">Adicionar</v-btn>
            </div>
          </v-form>

          <v-data-table
            :items="movDlg.movements"
            :headers="movementHeaders"
            :loading="movDlg.loading"
            density="compact"
            items-per-page="10"
          >
            <template #item.date="{ item }">{{ formatDateBR(item.date) }}</template>
            <template #item.kind="{ item }">{{ movementKindLabel(item.kind) }}</template>
            <template #item.amount="{ item }">
              <span class="tabular-nums">
                {{ item.kind === "withdrawal" ? "−" : "" }}{{ toCurrencyBRL(item.amount) }}
              </span>
            </template>
            <template #item.actions="{ item }">
              <v-btn
                icon
                size="small"
                variant="text"
                color="error"
                aria-label="Excluir movimentação"
                @click="removeMovement(item)"
                ><v-icon>mdi-delete</v-icon></v-btn
              >
            </template>
            <template #no-data>
              <div class="text-body-2 text-medium-emphasis py-4">
                Nenhuma movimentação ainda. Registre o primeiro aporte ou o saldo atual.
              </div>
            </template>
          </v-data-table>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" color="default" @click="movDlg.open = false">Fechar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import * as yup from "yup";
import { useTheme } from "vuetify";
import PageHeader from "../components/PageHeader.vue";
import EmptyState from "../components/EmptyState.vue";
import emptyInvestments from "../assets/empty/empty-investiments.webp";
import emptySearch from "../assets/empty/empty-search.webp";
import http from "../plugins/http";
import { useCurrency } from "../composables/useCurrency";
import { useFormErrors } from "../composables/useFormErrors";
import { useDebounced, usePagedList } from "../composables/usePagedList";
import { moneyField } from "../schemas/money";
import { useConfirmStore } from "../stores/confirm";
import { formatDateBR, todayLocalISO } from "../utils/date";
import {
  INVESTMENT_TYPES,
  MOVEMENT_KINDS,
  investmentTypeInfo,
  movementKindLabel,
} from "../utils/investments";
import type {
  Investment,
  InvestmentMovement,
  InvestmentType,
  MovementKind,
} from "../types/domain";

const { toCurrencyBRL, formatCurrencyOnType, toApiMoney } = useCurrency();
const confirm = useConfirmStore();
const theme = useTheme();

const search = ref("");
const searchTerm = useDebounced(search);
const filterType = ref<InvestmentType | null>(null);
const { items, total, loading, options, onOptions, reload } = usePagedList<Investment>(
  "/investments",
  () => ({ search: searchTerm.value.trim(), type: filterType.value })
);
const hasFilters = computed(() => !!search.value || !!filterType.value);
function clearFilters() {
  search.value = "";
  filterType.value = null;
}

const headers = [
  { title: "Nome", key: "name" },
  { title: "Tipo", key: "type" },
  { title: "Instituição", key: "institution" },
  { title: "Total aportado", key: "investedTotal", align: "end" as const, sortable: false },
  { title: "Valor atual", key: "currentValue", align: "end" as const, sortable: false },
  { title: "", key: "actions", align: "end" as const, sortable: false },
];

function typeColor(type: InvestmentType) {
  const info = investmentTypeInfo(type);
  return theme.global.current.value.dark ? info.dark : info.light;
}

// ---- Investment form ----

const open = ref(false);
const saving = ref(false);
const dialogKey = ref(0);
type FormT = { id: string; name: string; type: InvestmentType | null; institution: string };
const emptyForm = (): FormT => ({ id: "", name: "", type: null, institution: "" });
const form = reactive<FormT>(emptyForm());

const schema = yup.object({
  name: yup.string().trim().required("Nome é obrigatório").max(120, "Máximo de 120 caracteres"),
  type: yup.string().nullable().required("Escolha o tipo"),
  institution: yup.string().trim().max(80, "Máximo de 80 caracteres"),
});
const { errors, clearErrors, validateAll } = useFormErrors(schema, [
  "name",
  "type",
  "institution",
] as const);

function openNew() {
  Object.assign(form, emptyForm());
  clearErrors();
  open.value = true;
}

function edit(it: Investment) {
  Object.assign(form, {
    id: it.id,
    name: it.name,
    type: it.type,
    institution: it.institution ?? "",
  });
  clearErrors();
  open.value = true;
}

watch(open, (v) => {
  if (!v) {
    Object.assign(form, emptyForm());
    clearErrors();
    dialogKey.value++;
  }
});

async function save() {
  saving.value = true;
  try {
    if (!(await validateAll(form))) return;
    const body = {
      name: form.name.trim(),
      type: form.type,
      institution: form.institution.trim() || null,
    };
    if (form.id) await http.patch(`/investments/${form.id}`, body);
    else await http.post("/investments", body);
    open.value = false;
    await reload();
  } finally {
    saving.value = false;
  }
}

async function remove(it: Investment) {
  const confirmed = await confirm.ask({
    title: "Excluir investimento",
    message: `Deseja excluir "${it.name}" e todas as suas movimentações? Essa ação não pode ser desfeita.`,
  });
  if (!confirmed) return;
  await http.delete(`/investments/${it.id}`);
  await reload();
}

// ---- Movements ----

const movDlg = reactive({
  open: false,
  loading: false,
  saving: false,
  investment: null as Investment | null,
  movements: [] as InvestmentMovement[],
});
const movForm = reactive<{ kind: MovementKind; amount: string; date: string }>({
  kind: "contribution",
  amount: "",
  date: todayLocalISO(),
});
const movementHeaders = [
  { title: "Data", key: "date" },
  { title: "Movimentação", key: "kind" },
  { title: "Valor", key: "amount", align: "end" as const },
  { title: "", key: "actions", align: "end" as const, sortable: false },
];

const kindHint = computed(
  () =>
    ({
      contribution: "Dinheiro que você colocou no investimento.",
      withdrawal: "Dinheiro que você tirou do investimento.",
      balance:
        "O valor total informado pelo banco ou corretora nessa data (inclui rendimentos). Os aportes e resgates seguintes são somados a ele.",
    })[movForm.kind]
);

const movSchema = yup.object({
  amount: moneyField({}).test(
    "positive-unless-balance",
    "O valor deve ser maior que zero",
    (v) => movForm.kind === "balance" || Number(toApiMoney(v ?? "0")) > 0
  ),
  date: yup
    .string()
    .required("A data é obrigatória")
    .test("not-future", "A data não pode ser futura", (v) => !!v && v <= todayLocalISO()),
});
const {
  errors: movErrors,
  clearErrors: clearMovErrors,
  validateAll: validateMovement,
} = useFormErrors(movSchema, ["amount", "date"] as const);

async function loadMovements() {
  const inv = movDlg.investment;
  if (!inv) return;
  movDlg.loading = true;
  try {
    movDlg.movements = (await http.get<InvestmentMovement[]>(`/investments/${inv.id}/movements`)).data;
  } finally {
    movDlg.loading = false;
  }
}

/** Reloads the list and refreshes the dialog's investment (current value). */
async function refreshAfterMovement() {
  await Promise.all([loadMovements(), reload()]);
  const updated = items.value.find((i) => i.id === movDlg.investment?.id);
  if (updated) movDlg.investment = updated;
}

function openMovements(it: Investment) {
  Object.assign(movForm, { kind: "contribution", amount: "", date: todayLocalISO() });
  clearMovErrors();
  Object.assign(movDlg, { open: true, investment: it, movements: [] });
  void loadMovements();
}

async function addMovement() {
  const inv = movDlg.investment;
  if (!inv || !(await validateMovement(movForm))) return;
  movDlg.saving = true;
  try {
    await http.post(`/investments/${inv.id}/movements`, {
      kind: movForm.kind,
      amount: toApiMoney(movForm.amount),
      date: movForm.date,
    });
    movForm.amount = "";
    clearMovErrors();
    await refreshAfterMovement();
  } finally {
    movDlg.saving = false;
  }
}

async function removeMovement(mv: InvestmentMovement) {
  const inv = movDlg.investment;
  if (!inv) return;
  const confirmed = await confirm.ask({
    title: "Excluir movimentação",
    message: `Deseja excluir ${movementKindLabel(mv.kind).toLowerCase()} de ${toCurrencyBRL(mv.amount)} em ${formatDateBR(mv.date)}? Essa ação não pode ser desfeita.`,
  });
  if (!confirmed) return;
  await http.delete(`/investments/${inv.id}/movements/${mv.id}`);
  await refreshAfterMovement();
}
</script>

<style scoped>
.type-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.type-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.mov-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
}
.mov-form__submit {
  margin-top: 2px;
}
@media (max-width: 600px) {
  .mov-form {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
