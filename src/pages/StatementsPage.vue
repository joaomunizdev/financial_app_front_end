<template>
  <div class="d-flex flex-column ga-6">
    <div class="d-flex align-center justify-space-between">
      <div class="text-h5">Faturas</div>
    </div>

    <PeriodFilterBar
      :cards="creditCards"
      :months="MONTHS"
      :model-value-card-id="creditCardId"
      :model-value-year="year"
      :model-value-month="month"
      @update:cardId="(v) => (creditCardId = v)"
      @update:year="(v) => (year = v)"
      @update:month="(v) => (month = v)"
      @find="load"
      @generate="openGenerateDialog"
      @clear="clearFilters"
    />

    <v-card>
      <v-data-table
        :items="items"
        :headers="headers"
        :loading="loading"
        class="pa-2"
      >
        <template #item.period="{ item }">{{
          formatPeriod(item.year, item.month)
        }}</template>
        <template #item.card="{ item }">{{
          cardNickname(item.creditCardId)
        }}</template>
        <template #item.closingDate="{ item }">{{
          formatDateBR(item.closingDate)
        }}</template>
        <template #item.dueDate="{ item }">{{
          formatDateBR(item.dueDate)
        }}</template>
        <template #item.totalAmount="{ item }">{{
          toCurrencyBRL(item.totalAmount)
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
          <v-btn
            icon
            variant="text"
            aria-label="Ver detalhes"
            @click="view(item)"
            ><v-icon>mdi-eye</v-icon></v-btn
          >
          <!-- The icon shows the current state; the tooltip names the action. -->
          <v-tooltip
            :text="item.locked ? 'Reabrir fatura' : 'Fechar fatura'"
            location="top"
          >
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                icon
                variant="text"
                :aria-label="item.locked ? 'Reabrir fatura' : 'Fechar fatura'"
                @click="toggleLock(item)"
                ><v-icon>{{
                  item.locked
                    ? "mdi-lock-outline"
                    : "mdi-lock-open-variant-outline"
                }}</v-icon></v-btn
              >
            </template>
          </v-tooltip>
          <v-btn
            icon
            variant="text"
            color="success"
            aria-label="Registrar pagamento"
            @click="openPay(item)"
            ><v-icon>mdi-cash-check</v-icon></v-btn
          >
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="generateDlg.open" max-width="620">
      <v-card>
        <v-card-title>Gerar faturas</v-card-title>
        <v-card-text>
          <div class="d-flex align-center justify-space-between mb-1">
            <span class="text-body-2">Cartões</span>
            <v-btn size="small" variant="text" @click="toggleAllCards">
              {{ allCardsSelected ? "Limpar seleção" : "Selecionar todos" }}
            </v-btn>
          </div>
          <v-select
            v-model="generateDlg.creditCardIds"
            :items="creditCards"
            item-title="nickname"
            item-value="id"
            label="Cartões"
            multiple
            chips
            closable-chips
          />

          <v-text-field
            v-model.number="generateDlg.year"
            type="number"
            label="Ano"
            :min="MIN_YEAR"
            :max="MAX_YEAR"
          />

          <div class="d-flex align-center justify-space-between mb-1">
            <span class="text-body-2">Meses</span>
            <v-btn size="small" variant="text" @click="toggleAllMonths">
              {{ allMonthsSelected ? "Limpar seleção" : "Selecionar todos" }}
            </v-btn>
          </div>
          <v-select
            v-model="generateDlg.months"
            :items="MONTHS"
            item-title="label"
            item-value="value"
            label="Meses"
            multiple
            chips
            closable-chips
          />
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="generateDlg.open = false">Cancelar</v-btn>
          <v-btn
            color="primary"
            :loading="generateDlg.saving"
            :disabled="!generationTotal || !isValidYear(generateDlg.year)"
            @click="generate"
          >
            Gerar {{ generationTotal || "" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Detail dialog -->
    <v-dialog v-model="detailDlg.open" max-width="860">
      <v-card>
        <v-card-title>Fatura {{ detailTitle }}</v-card-title>
        <v-card-text>
          <v-form
            class="d-flex flex-wrap align-start ga-4 mb-4"
            @submit.prevent="saveDetail"
          >
            <v-text-field
              v-model="detailForm.closingDate"
              type="date"
              label="Fechamento"
              style="max-width: 200px"
            />
            <v-text-field
              v-model="detailForm.dueDate"
              type="date"
              label="Vencimento"
              style="max-width: 200px"
            />
            <v-text-field
              v-model="detailForm.adjustmentAmount"
              label="Ajuste (BRL)"
              hint="Negativo para créditos/estornos"
              persistent-hint
              style="max-width: 200px"
              :error-messages="detailErrors.adjustmentAmount"
              @update:model-value="
                (v) => (detailForm.adjustmentAmount = sanitizeCurrencyInput(v))
              "
            />
            <v-switch v-model="detailForm.locked" inset label="Fechada?" />
            <v-spacer />
            <v-btn
              type="submit"
              variant="tonal"
              prepend-icon="mdi-content-save"
              :loading="detailDlg.saving"
              :disabled="detailDlg.loading"
              >Salvar</v-btn
            >
          </v-form>

          <v-data-table
            :items="detailDlg.statement?.items ?? []"
            :headers="itemHeaders"
            :loading="detailDlg.loading"
          >
            <template #item.amount="{ item }">{{
              toCurrencyBRL(item.amount)
            }}</template>
          </v-data-table>

          <div class="d-flex justify-end mt-4">
            <div class="text-subtitle-2">
              Total:
              <strong>{{
                toCurrencyBRL(detailDlg.statement?.totalAmount ?? "0")
              }}</strong>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Pay dialog -->
    <v-dialog v-model="payDlg.open" max-width="520">
      <v-card>
        <v-card-title>Pagar fatura {{ payTitle }}</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="confirmPay">
            <v-text-field
              v-model="payForm.amount"
              label="Valor pago (BRL)"
              :error-messages="payErrors.amount"
              @update:model-value="
                (v) => (payForm.amount = formatCurrencyOnType(v))
              "
            />
            <v-text-field
              v-model="payForm.paidAt"
              type="date"
              label="Data de pagamento"
              :error-messages="payErrors.paidAt"
            />
            <v-btn type="submit" :loading="payDlg.saving">Confirmar</v-btn>
            <v-btn variant="text" class="ml-2" @click="payDlg.open = false"
              >Cancelar</v-btn
            >
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive } from "vue";
import * as yup from "yup";
import { isAxiosError } from "axios";
import http from "../plugins/http";
import PeriodFilterBar from "../components/PeriodFilterBar.vue";
import { useCurrency } from "../composables/useCurrency";
import { useFormErrors } from "../composables/useFormErrors";
import { moneyField } from "../schemas/money";
import { useToastStore } from "../stores/toast";
import { withDetail } from "../utils/api-error";
import {
  MONTHS,
  MIN_YEAR,
  MAX_YEAR,
  formatDateBR,
  formatPeriod,
  isValidYear,
  toDateInput,
  todayLocalISO,
} from "../utils/date";
import type { CreditCard, Statement } from "../types/domain";

const {
  toCurrencyBRL,
  toApiMoney,
  toDecimalBRL,
  formatCurrencyOnType,
  sanitizeCurrencyInput,
} = useCurrency();
const toast = useToastStore();

const creditCards = ref<CreditCard[]>([]);
const creditCardId = ref<string>("");
const items = ref<Statement[]>([]);
const loading = ref(false);

const now = new Date();
const year = ref(now.getFullYear());
const month = ref(now.getMonth() + 1);

const headers = [
  { title: "Período", key: "period" },
  { title: "Cartão", key: "card" },
  { title: "Fechamento", key: "closingDate" },
  { title: "Vencimento", key: "dueDate" },
  { title: "Total", key: "totalAmount", align: "end" as const },
  { title: "Status", key: "locked", align: "center" as const },
  { title: "Pagamento", key: "paid", align: "center" as const },
  { title: "", key: "actions", align: "end" as const, sortable: false },
];

function cardNickname(cardId: string) {
  return creditCards.value.find((c) => c.id === cardId)?.nickname ?? "—";
}

/**
 * With card + year + month the API returns a single statement or 404 when it doesn't exist;
 * otherwise it returns a list. Both are normalized to an array.
 */
async function fetchStatements(params: {
  year: number;
  month: number;
  creditCardId?: string;
}): Promise<Statement[]> {
  try {
    const { data } = await http.get<Statement[] | Statement>("/statements", {
      params,
      skipToast: true,
    });
    if (!data) return [];
    return Array.isArray(data) ? data : [data];
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 404) return [];
    toast.show({
      color: "error",
      message: withDetail("Não foi possível carregar as faturas.", e),
    });
    throw e;
  }
}

async function load() {
  if (!isValidYear(year.value)) return;
  loading.value = true;
  try {
    items.value = await fetchStatements({
      year: year.value,
      month: month.value,
      ...(creditCardId.value ? { creditCardId: creditCardId.value } : {}),
    });
  } finally {
    loading.value = false;
  }
}

async function clearFilters() {
  creditCardId.value = "";
  year.value = now.getFullYear();
  month.value = now.getMonth() + 1;
  await load();
}

// ---- Generation ----

const generateDlg = reactive({
  open: false,
  creditCardIds: [] as string[],
  year: now.getFullYear(),
  months: [] as number[],
  saving: false,
});

const allCardsSelected = computed(
  () =>
    creditCards.value.length > 0 &&
    generateDlg.creditCardIds.length === creditCards.value.length
);
const allMonthsSelected = computed(
  () => generateDlg.months.length === MONTHS.length
);
const generationTotal = computed(
  () => generateDlg.creditCardIds.length * generateDlg.months.length
);

function openGenerateDialog() {
  generateDlg.creditCardIds = creditCardId.value ? [creditCardId.value] : [];
  generateDlg.year = year.value;
  generateDlg.months = [month.value];
  generateDlg.open = true;
}

function toggleAllCards() {
  generateDlg.creditCardIds = allCardsSelected.value
    ? []
    : creditCards.value.map((card) => card.id);
}

function toggleAllMonths() {
  generateDlg.months = allMonthsSelected.value
    ? []
    : MONTHS.map((item) => item.value);
}

async function generate() {
  if (!generationTotal.value || !isValidYear(generateDlg.year)) return;

  generateDlg.saving = true;
  const targetYear = generateDlg.year;
  const failures: string[] = [];
  let firstError: unknown = null;
  let created = 0;
  try {
    // One request at a time; a failure (e.g. statement already exists) must not stop the rest.
    for (const cardId of generateDlg.creditCardIds) {
      for (const m of generateDlg.months) {
        try {
          await http.post(
            "/statements",
            { creditCardId: cardId, year: targetYear, month: m },
            { skipToast: true }
          );
          created++;
        } catch (e) {
          firstError ??= e;
          failures.push(`${cardNickname(cardId)} ${formatPeriod(targetYear, m)}`);
        }
      }
    }

    if (failures.length === 0) {
      toast.show({ message: `${created} fatura(s) gerada(s) com sucesso.` });
    } else {
      toast.show({
        color: "error",
        timeout: 8000,
        message: withDetail(
          `${created} fatura(s) gerada(s); ${failures.length} falharam (${failures.join(", ")}).`,
          firstError
        ),
      });
    }

    const lists = await Promise.all(
      generateDlg.creditCardIds.flatMap((cardId) =>
        generateDlg.months.map((m) =>
          fetchStatements({ creditCardId: cardId, year: targetYear, month: m })
        )
      )
    );
    items.value = lists.flat();
    generateDlg.open = false;
  } finally {
    generateDlg.saving = false;
  }
}

// ---- Detail / edit ----

const itemHeaders = [
  { title: "Descrição", key: "label" },
  { title: "Valor", key: "amount", align: "end" as const },
];

const detailDlg = reactive({
  open: false,
  loading: false,
  saving: false,
  statement: null as Statement | null,
});

const detailForm = reactive({
  closingDate: "",
  dueDate: "",
  adjustmentAmount: "",
  locked: false,
});

const detailSchema = yup.object({
  adjustmentAmount: moneyField({
    requiredMessage: "Informe o ajuste (0,00 se não houver)",
    allowNegative: true,
  }),
});
const {
  errors: detailErrors,
  clearErrors: clearDetailErrors,
  validateAll: validateDetail,
} = useFormErrors(detailSchema, ["adjustmentAmount"] as const);

const detailTitle = computed(() => {
  const st = detailDlg.statement;
  return st ? formatPeriod(st.year, st.month) : "";
});

function fillDetailForm(st: Statement) {
  detailDlg.statement = st;
  Object.assign(detailForm, {
    closingDate: toDateInput(st.closingDate),
    dueDate: toDateInput(st.dueDate),
    adjustmentAmount: toDecimalBRL(st.adjustmentAmount ?? "0"),
    locked: !!st.locked,
  });
}

async function view(st: Statement) {
  fillDetailForm(st);
  clearDetailErrors();
  detailDlg.open = true;
  detailDlg.loading = true;
  try {
    fillDetailForm((await http.get<Statement>(`/statements/${st.id}`)).data);
  } finally {
    detailDlg.loading = false;
  }
}

async function saveDetail() {
  const st = detailDlg.statement;
  if (!st) return;
  if (!(await validateDetail(detailForm))) return;

  detailDlg.saving = true;
  try {
    await http.patch(`/statements/${st.id}`, {
      closingDate: detailForm.closingDate || null,
      dueDate: detailForm.dueDate || null,
      locked: detailForm.locked,
      adjustmentAmount: toApiMoney(detailForm.adjustmentAmount),
    });
    // Re-read so items and totals reflect the backend recalculation.
    fillDetailForm((await http.get<Statement>(`/statements/${st.id}`)).data);
    await load();
  } finally {
    detailDlg.saving = false;
  }
}

async function toggleLock(st: Statement) {
  const { data: updated } = await http.patch<Statement>(`/statements/${st.id}`, {
    locked: !st.locked,
  });
  const idx = items.value.findIndex((x) => x.id === st.id);
  if (idx >= 0) items.value[idx] = { ...items.value[idx], ...updated };
}

// ---- Payment ----

const payDlg = reactive({
  open: false,
  saving: false,
  statement: null as Statement | null,
});
const payForm = reactive({ amount: "", paidAt: "" });

const paySchema = yup.object({
  amount: moneyField({ requiredMessage: "Informe o valor pago", positive: true }),
  paidAt: yup
    .string()
    .required("Informe a data de pagamento")
    .matches(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
});
const {
  errors: payErrors,
  clearErrors: clearPayErrors,
  validateAll: validatePay,
} = useFormErrors(paySchema, ["amount", "paidAt"] as const);

const payTitle = computed(() => {
  const st = payDlg.statement;
  return st ? formatPeriod(st.year, st.month) : "";
});

function openPay(st: Statement) {
  payDlg.statement = st;
  payForm.amount = toCurrencyBRL(st.totalAmount || "0");
  payForm.paidAt = todayLocalISO();
  clearPayErrors();
  payDlg.open = true;
}

async function confirmPay() {
  const st = payDlg.statement;
  if (!st) return;
  if (!(await validatePay(payForm))) return;

  payDlg.saving = true;
  try {
    await http.post(`/statements/${st.id}/pay`, {
      amount: toApiMoney(payForm.amount),
      paidAt: payForm.paidAt,
    });
    payDlg.open = false;
    await load();
  } finally {
    payDlg.saving = false;
  }
}

onMounted(async () => {
  creditCards.value = (await http.get<CreditCard[]>("/credit-cards")).data || [];
  await load();
});
</script>
