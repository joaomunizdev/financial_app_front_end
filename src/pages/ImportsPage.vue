<template>
  <div class="d-flex flex-column ga-6">
    <PageHeader
      title="Importar extratos e faturas"
      description="Leia o extrato da conta ou a fatura do cartão, revise cada lançamento e importe só o que quiser."
    />

    <v-alert v-if="result" type="success" closable @click:close="result = null">
      {{ resultMessage }}
      <template #append>
        <v-btn variant="text" size="small" to="/purchases">Ver compras</v-btn>
        <v-btn v-if="result.incomes" variant="text" size="small" to="/income-sources">Ver rendas</v-btn>
      </template>
    </v-alert>

    <v-card class="pa-5">
      <v-form class="d-flex flex-column ga-4" @submit.prevent="readFile">
        <div>
          <div class="text-body-2 text-medium-emphasis mb-2">O que você vai importar?</div>
          <v-btn-toggle
            v-model="kind"
            mandatory
            divided
            variant="outlined"
            color="primary"
            density="comfortable"
            aria-label="Tipo de arquivo"
          >
            <v-btn value="statement" prepend-icon="mdi-bank-outline">Extrato da conta</v-btn>
            <v-btn value="invoice" prepend-icon="mdi-credit-card-outline">Fatura do cartão</v-btn>
          </v-btn-toggle>
        </div>
        <div class="upload-grid">
          <v-file-input
            v-model="file"
            label="Arquivo (PDF, OFX ou CSV)"
            accept=".pdf,.ofx,.csv,application/pdf,text/csv"
            prepend-icon=""
            prepend-inner-icon="mdi-paperclip"
            show-size
            :error-messages="fileError"
          />
          <v-select
            v-if="kind === 'invoice'"
            v-model="creditCardId"
            :items="creditCards"
            item-title="nickname"
            item-value="id"
            label="Cartão da fatura"
            prepend-inner-icon="mdi-credit-card-outline"
            :error-messages="cardError"
          />
        </div>
        <p class="text-caption text-medium-emphasis">
          Aceitos: {{ SUPPORTED_FORMATS[kind].join(" · ") }}. O arquivo é lido e descartado; só
          ficam os lançamentos que você confirmar.
        </p>
        <div>
          <v-btn type="submit" :loading="reading" prepend-icon="mdi-file-search-outline">Ler arquivo</v-btn>
        </div>
      </v-form>
    </v-card>

    <v-card v-if="preview" class="pa-5">
      <div class="d-flex flex-wrap align-start justify-space-between ga-4 mb-4">
        <div>
          <h2 class="section-title">
            {{ preview.kind === "invoice" ? "Fatura" : "Extrato" }} {{ preview.bankName }}
            <span class="text-medium-emphasis font-weight-regular">· {{ preview.format.toUpperCase() }}</span>
          </h2>
          <p class="text-body-2 text-medium-emphasis">
            <template v-if="preview.period">
              {{ formatDateBR(preview.period.from) }} a {{ formatDateBR(preview.period.to) }} ·
            </template>
            {{ preview.lines.length }} lançamentos lidos
          </p>
        </div>
        <div v-if="preview.kind === 'invoice'" class="text-right">
          <div class="text-caption text-medium-emphasis">Total de compras lido</div>
          <div class="text-h6 tabular-nums">{{ toCurrencyBRL(preview.readTotal) }}</div>
          <div v-if="preview.expectedTotal" class="text-caption" :class="totalMatches ? 'text-success' : 'text-warning'">
            <v-icon size="14" :icon="totalMatches ? 'mdi-check-circle-outline' : 'mdi-alert-outline'" />
            {{ totalMatches ? "Confere com a fatura" : `A fatura informa ${toCurrencyBRL(preview.expectedTotal)}` }}
          </div>
        </div>
      </div>

      <v-alert v-if="!preview.lines.length" type="info" class="mb-4">
        Nenhum lançamento encontrado nesse arquivo.
      </v-alert>

      <template v-else>
        <div class="defaults-row mb-4">
          <v-select
            v-model="defaultTenantId"
            :items="tenants"
            item-title="name"
            item-value="id"
            label="Responsável"
            hint="Vale para as linhas sem responsável escolhido."
            persistent-hint
            prepend-inner-icon="mdi-account-outline"
            :error-messages="tenantError"
          />
          <v-select
            v-if="preview.kind === 'statement'"
            v-model="paymentMethod"
            :items="DIRECT_METHODS"
            item-title="label"
            item-value="value"
            label="Compras do extrato como"
            prepend-inner-icon="mdi-wallet-outline"
          />
          <v-btn-toggle v-model="view" mandatory divided density="comfortable" variant="outlined" aria-label="Filtrar linhas">
            <v-btn value="all">Todas ({{ rows.length }})</v-btn>
            <v-btn value="import">A importar ({{ toImport.length }})</v-btn>
            <v-btn value="ignore">Ignoradas ({{ rows.length - toImport.length }})</v-btn>
          </v-btn-toggle>
        </div>

        <v-data-table
          :items="visibleRows"
          :headers="headers"
          item-value="key"
          density="compact"
          :items-per-page="25"
          class="import-table"
        >
          <template #item.action="{ item }">
            <v-select
              v-model="item.action"
              :items="actionOptions(item)"
              item-title="label"
              item-value="value"
              density="compact"
              hide-details
              aria-label="Ação"
              class="cell-action"
            />
          </template>
          <template #item.date="{ item }">
            <span class="tabular-nums text-no-wrap">{{ formatDateBR(item.date) }}</span>
          </template>
          <template #item.description="{ item }">
            <v-text-field
              v-model="item.description"
              density="compact"
              hide-details
              maxlength="255"
              :disabled="item.action === 'ignore'"
              aria-label="Descrição"
            />
            <div v-if="item.reason" class="text-caption text-medium-emphasis mt-1">
              <v-icon size="14" icon="mdi-information-outline" />
              {{ REASON_LABELS[item.reason] }}<template v-if="item.duplicateOf">: {{ item.duplicateOf }}</template>
            </div>
          </template>
          <template #item.installment="{ item }">
            <span class="tabular-nums">{{ item.installment ? `${item.installment.number}/${item.installment.total}` : "—" }}</span>
          </template>
          <template #item.amount="{ item }">
            <span class="tabular-nums text-no-wrap" :class="item.direction === 'credit' ? 'text-success' : ''">
              {{ item.direction === "credit" ? "+" : "−" }}{{ toCurrencyBRL(item.amount) }}
            </span>
          </template>
          <template #item.categoryId="{ item }">
            <CategorySelect
              v-if="item.action === 'purchase'"
              v-model="item.categoryId"
              :categories="categories"
              hide-details
              class="cell-select"
            />
            <span v-else class="text-medium-emphasis">—</span>
          </template>
          <template #item.tenantId="{ item }">
            <v-select
              v-if="item.action !== 'ignore'"
              v-model="item.tenantId"
              :items="tenants"
              item-title="name"
              item-value="id"
              :placeholder="defaultTenantName"
              persistent-placeholder
              density="compact"
              hide-details
              clearable
              aria-label="Responsável"
              class="cell-select"
            />
            <span v-else class="text-medium-emphasis">—</span>
          </template>
        </v-data-table>
      </template>

      <div class="d-flex flex-wrap justify-end ga-2 mt-4">
        <v-btn variant="text" color="default" @click="reset">Cancelar</v-btn>
        <v-btn :disabled="!toImport.length" :loading="confirming" prepend-icon="mdi-check" @click="confirmImport">
          Importar {{ toImport.length }} lançamento{{ toImport.length === 1 ? "" : "s" }}
        </v-btn>
      </div>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import PageHeader from "../components/PageHeader.vue";
import CategorySelect from "../components/CategorySelect.vue";
import http from "../plugins/http";
import { useCurrency } from "../composables/useCurrency";
import { useConfirmStore } from "../stores/confirm";
import { useToastStore } from "../stores/toast";
import { formatDateBR } from "../utils/date";
import { REASON_LABELS, SUPPORTED_FORMATS, importErrorMessage } from "../utils/imports";
import type {
  Category,
  CreditCard,
  ImportAction,
  ImportKind,
  ImportPreview,
  ImportPreviewLine,
  Tenant,
} from "../types/domain";

type Row = ImportPreviewLine & { action: ImportAction; tenantId: string | null };

const { toCurrencyBRL } = useCurrency();
const toast = useToastStore();
const confirm = useConfirmStore();

const DIRECT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "cash", label: "Dinheiro" },
] as const;

const kind = ref<ImportKind>("statement");
const file = ref<File | File[] | null>(null);
const creditCardId = ref<string | null>(null);
const fileError = ref("");
const cardError = ref("");
const reading = ref(false);

const preview = ref<ImportPreview | null>(null);
const rows = ref<Row[]>([]);
const view = ref<"all" | "import" | "ignore">("all");
const defaultTenantId = ref<string | null>(null);
const tenantError = ref("");
const paymentMethod = ref<"pix" | "cash">("pix");
const confirming = ref(false);
const result = ref<{ purchases: number; incomes: number; skipped: number } | null>(null);

const allCards = ref<CreditCard[]>([]);
// Invoices are imported into a credit card (installments need one).
const creditCards = computed(() => allCards.value.filter((c) => c.cardType === "credit"));
const tenants = ref<Tenant[]>([]);
const categories = ref<Category[]>([]);

const headers = [
  { title: "Ação", key: "action", sortable: false, width: 150 },
  { title: "Data", key: "date" },
  { title: "Descrição", key: "description", minWidth: 260 },
  { title: "Parcela", key: "installment", sortable: false },
  { title: "Valor", key: "amount", align: "end" as const, value: (r: Row) => Number(r.amount) },
  { title: "Categoria", key: "categoryId", sortable: false, minWidth: 230 },
  { title: "Responsável", key: "tenantId", sortable: false, minWidth: 180 },
];

const toImport = computed(() => rows.value.filter((r) => r.action !== "ignore"));
const visibleRows = computed(() =>
  view.value === "all"
    ? rows.value
    : rows.value.filter((r) => (view.value === "import" ? r.action !== "ignore" : r.action === "ignore"))
);
const defaultTenantName = computed(
  () => tenants.value.find((t) => t.id === defaultTenantId.value)?.name ?? "Escolha"
);
const totalMatches = computed(
  () => !!preview.value?.expectedTotal && Number(preview.value.expectedTotal) === Number(preview.value.readTotal)
);
const resultMessage = computed(() => {
  const r = result.value;
  if (!r) return "";
  const parts = [`${r.purchases} compra(s)`];
  if (r.incomes) parts.push(`${r.incomes} renda(s)`);
  const skipped = r.skipped ? ` ${r.skipped} já tinham sido importados e foram pulados.` : "";
  return `Importação concluída: ${parts.join(" e ")}.${skipped}`;
});

function actionOptions(row: Row) {
  const options: { value: ImportAction; label: string }[] = [{ value: "purchase", label: "Compra" }];
  if (preview.value?.kind === "statement") options.push({ value: "income", label: "Renda" });
  options.push({ value: "ignore", label: "Ignorar" });
  return row.direction === "credit" && preview.value?.kind === "invoice"
    ? options.filter((o) => o.value === "ignore")
    : options;
}

watch(kind, () => {
  preview.value = null;
  cardError.value = "";
});

function selectedFile(): File | null {
  const f = file.value;
  return Array.isArray(f) ? f[0] ?? null : f;
}

async function readFile() {
  fileError.value = "";
  cardError.value = "";
  const f = selectedFile();
  if (!f) {
    fileError.value = "Escolha um arquivo.";
    return;
  }
  if (kind.value === "invoice" && !creditCardId.value) {
    cardError.value = "Escolha o cartão da fatura.";
    return;
  }
  reading.value = true;
  result.value = null;
  try {
    const form = new FormData();
    form.append("kind", kind.value);
    if (kind.value === "invoice" && creditCardId.value) form.append("creditCardId", creditCardId.value);
    form.append("file", f);
    const { data } = await http.post<ImportPreview>("/imports/preview", form, { skipToast: true });
    preview.value = data;
    rows.value = data.lines.map((l) => ({ ...l, action: l.suggestedAction, tenantId: null }));
    view.value = "all";
  } catch (e) {
    preview.value = null;
    fileError.value = importErrorMessage(e, "Não foi possível ler o arquivo.");
  } finally {
    reading.value = false;
  }
}

function reset() {
  preview.value = null;
  rows.value = [];
  file.value = null;
}

async function confirmImport() {
  const p = preview.value;
  if (!p) return;
  tenantError.value = "";
  if (toImport.value.some((r) => !r.tenantId) && !defaultTenantId.value) {
    tenantError.value = "Escolha o responsável (ou um em cada linha).";
    return;
  }
  const ok = await confirm.ask({
    title: "Importar lançamentos",
    message: `Serão criados ${toImport.value.length} lançamento(s)${p.kind === "invoice" ? " no cartão escolhido" : ""}. Você pode editá-los ou excluí-los depois.`,
    confirmText: "Importar",
  });
  if (!ok) return;
  confirming.value = true;
  try {
    const { data } = await http.post<{ purchases: number; incomes: number; skipped: number }>(
      "/imports/confirm",
      {
        kind: p.kind,
        ...(p.kind === "invoice" ? { creditCardId: creditCardId.value } : {}),
        lines: toImport.value.map((r) => ({
          key: r.key,
          action: r.action,
          date: r.date,
          description: r.description.trim() || "Lançamento importado",
          amount: r.amount,
          installment: r.installment,
          tenantId: r.tenantId ?? defaultTenantId.value,
          categoryId: r.action === "purchase" ? r.categoryId : null,
          ...(p.kind === "statement" && r.action === "purchase" ? { paymentMethod: paymentMethod.value } : {}),
        })),
      },
      { skipToast: true }
    );
    result.value = data;
    toast.show({ message: resultMessage.value, color: "success" });
    reset();
  } catch (e) {
    toast.show({ color: "error", message: importErrorMessage(e, "Não foi possível importar.") });
  } finally {
    confirming.value = false;
  }
}

onMounted(async () => {
  const [cards, tns, cats] = await Promise.all([
    http.get<CreditCard[]>("/credit-cards"),
    http.get<Tenant[]>("/tenants"),
    http.get<Category[]>("/categories"),
  ]);
  allCards.value = cards.data || [];
  tenants.value = tns.data || [];
  categories.value = cats.data || [];
  if (tenants.value.length === 1) defaultTenantId.value = tenants.value[0].id;
});
</script>

<style scoped>
.upload-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px 16px;
}
.defaults-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, max-content));
  gap: 12px 16px;
  align-items: start;
}
.cell-action {
  min-width: 130px;
}
.cell-select {
  min-width: 210px;
}
.import-table :deep(td) {
  padding-top: 6px !important;
  padding-bottom: 6px !important;
  vertical-align: top;
}
</style>
