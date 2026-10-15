<template>
  <div class="d-flex flex-column ga-6">
    <PageHeader
      title="Relatórios"
      description="Gastos, rendas e saldo de cada responsável no mês escolhido."
    >
      <v-btn prepend-icon="mdi-file-pdf-box" @click="openExportDialog">Exportar PDFs</v-btn>
    </PageHeader>

    <FilterBar
      :months="MONTHS"
      :model-value-year="year"
      :model-value-month="month"
      @update:year="(v) => (year = v)"
      @update:month="(v) => (month = v)"
      @apply="fetchAll"
      @clear="clearFilter"
    >
      <div>
        <v-select
          v-model="tenantId"
          :items="tenants"
          item-title="name"
          item-value="id"
          label="Responsável"
          placeholder="Todos"
          persistent-placeholder
          clearable
          hide-details
          prepend-inner-icon="mdi-account-outline"
        />
      </div>
    </FilterBar>

    <SummaryStrip :items="summary" />

    <div class="charts-grid">
      <v-card class="pa-5">
        <div class="mb-4">
          <h2 class="section-title">
            {{ selectedTenant ? "Composição das despesas" : "Despesas por responsável" }}
          </h2>
          <p class="text-caption text-medium-emphasis">
            {{ selectedTenant ? `${selectedTenant.name} em ${periodLabel}` : `Cartões, Pix e despesas fixas em ${periodLabel}` }}
          </p>
        </div>
        <BarList :items="expenseBars" :list-label="`Despesas em ${periodLabel}`">
          <template #empty>Nenhuma despesa neste mês.</template>
        </BarList>
      </v-card>
      <v-card class="pa-5">
        <div class="d-flex align-start justify-space-between ga-4 mb-4">
          <div>
            <h2 class="section-title">Gastos por categoria</h2>
            <p class="text-caption text-medium-emphasis">
              Faturas, Pix e dinheiro{{ selectedTenant ? ` de ${selectedTenant.name}` : "" }} em {{ periodLabel }}
            </p>
          </div>
          <v-btn variant="text" size="small" to="/categories">Categorias</v-btn>
        </div>
        <BarList :items="byCategoryBars" :list-label="`Gastos por categoria em ${periodLabel}`">
          <template #empty>Nenhum gasto categorizado neste mês.</template>
        </BarList>
      </v-card>
    </div>

    <v-card>
      <div class="d-flex align-center justify-space-between ga-4 px-5 pt-5">
        <h2 class="section-title">Resumo por responsável</h2>
        <v-chip color="primary" variant="tonal" size="small">{{ formatPeriod(year, month) }}</v-chip>
      </div>
      <v-data-table
        :items="visibleRows"
        :headers="headers"
        :loading="loading"
        :sort-by="[{ key: 'expenses', order: 'desc' }]"
        class="pa-2"
      >
        <template v-for="key in MONEY_COLUMNS" :key="key" #[`item.${key}`]="{ item }">
          <span class="tabular-nums">{{ toCurrencyBRL(item[key]) }}</span>
        </template>
        <template #item.balance="{ item }">
          <span class="tabular-nums font-weight-medium" :class="item.balance < 0 ? 'text-error' : 'text-success'">
            {{ toCurrencyBRL(item.balance) }}
          </span>
        </template>
        <template #item.actions="{ item }">
          <v-btn
            icon
            variant="text"
            :loading="downloadingTenant === item.tenantId"
            :aria-label="`Baixar PDF de ${item.tenantName}`"
            v-tooltip:start="'Baixar PDF'"
            @click="downloadOne(item)"
          >
            <v-icon>mdi-file-download-outline</v-icon>
          </v-btn>
        </template>
        <template v-if="visibleRows.length > 1" #body.append>
          <tr class="totals-row">
            <td>Total</td>
            <td v-for="key in MONEY_COLUMNS" :key="key" class="text-end tabular-nums">
              {{ toCurrencyBRL(totals[key]) }}
            </td>
            <td class="text-end tabular-nums" :class="totals.balance < 0 ? 'text-error' : 'text-success'">
              {{ toCurrencyBRL(totals.balance) }}
            </td>
            <td />
          </tr>
        </template>
        <template #no-data>
          <EmptyState
            :image="emptyReports"
            title="Sem dados neste mês"
            description="Gere as faturas do período ou lance compras, rendas e despesas fixas."
            action-text="Ir para faturas"
            action-icon="mdi-file-document-outline"
            action-to="/statements"
          />
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="exportDlg.open" max-width="560">
      <v-card>
        <v-card-title>Exportar PDFs mensais</v-card-title>
        <v-card-text>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Um PDF por responsável e mês, com os lançamentos, as rendas, as despesas fixas e o saldo.
          </p>
          <v-select
            v-model="exportDlg.tenantIds"
            :items="tenants"
            item-title="name"
            item-value="id"
            label="Responsáveis"
            prepend-inner-icon="mdi-account-outline"
            multiple
            chips
            closable-chips
          />
          <v-select
            v-model="exportDlg.periodIds"
            :items="exportDlg.periods"
            :loading="exportDlg.loading"
            item-title="label"
            item-value="id"
            label="Meses"
            prepend-inner-icon="mdi-calendar-month-outline"
            :disabled="exportDlg.loading || exportDlg.periods.length === 0"
            multiple
            chips
            closable-chips
          />
          <p v-if="!exportDlg.loading && exportDlg.periods.length === 0" class="text-body-2 text-medium-emphasis">
            Nenhuma fatura encontrada. Gere uma fatura antes de exportar.
          </p>
          <p v-if="exportDlg.downloading && exportTotal > 1" class="text-body-2 tabular-nums">
            Baixando {{ exportDlg.done }} de {{ exportTotal }}…
          </p>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" color="default" @click="closeExportDialog">Cancelar</v-btn>
          <v-btn
            :loading="exportDlg.downloading"
            :disabled="!exportDlg.periodIds.length || !exportDlg.tenantIds.length"
            @click="exportPdfReport"
          >
            Exportar {{ exportTotal || "" }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import PageHeader from "../components/PageHeader.vue";
import EmptyState from "../components/EmptyState.vue";
import SummaryStrip from "../components/SummaryStrip.vue";
import BarList from "../components/BarList.vue";
import FilterBar from "../components/FilterBar.vue";
import emptyReports from "../assets/empty/empty-investiments.webp";
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";
import http from "../plugins/http";
import { useCurrency } from "../composables/useCurrency";
import { useToastStore } from "../stores/toast";
import { withDetail } from "../utils/api-error";
import { MONTHS, formatPeriod, isValidYear } from "../utils/date";
import { topCategories, type LabeledTotal, type SummaryItem } from "../utils/dashboard";
import type { CategoryTotal, Statement, Tenant, TenantReport } from "../types/domain";

type ExportPeriod = { id: string; label: string; year: number; month: number };
/** Numeric per-tenant row (sortable); formatted in the item slots. */
type Row = {
  tenantId: string;
  tenantName: string;
  purchases: number;
  subscriptions: number;
  fixed: number;
  expenses: number;
  income: number;
  balance: number;
};
const MONEY_COLUMNS = ["purchases", "subscriptions", "fixed", "expenses", "income"] as const;

const { toCurrencyBRL } = useCurrency();
const toast = useToastStore();

const loading = ref(false);
const tenants = ref<Tenant[]>([]);
const rows = ref<Row[]>([]);
const categoryTotals = ref<CategoryTotal[]>([]);
const downloadingTenant = ref<string | null>(null);
/** Optional tenant filter (applies immediately; "Limpar" resets it). */
const tenantId = ref<string | null>(null);
const selectedTenant = computed(() => tenants.value.find((t) => t.id === tenantId.value) ?? null);
const visibleRows = computed(() =>
  tenantId.value ? rows.value.filter((r) => r.tenantId === tenantId.value) : rows.value
);

const now = new Date();
const year = ref(now.getFullYear());
const month = ref(now.getMonth() + 1);
// Period of the data on screen (the filter bar's fields only apply on "Aplicar").
const shown = reactive({ year: year.value, month: month.value });
const periodLabel = computed(() =>
  new Date(shown.year, shown.month - 1, 1).toLocaleString("pt-BR", { month: "long", year: "numeric" })
);

const headers = [
  { title: "Responsável", key: "tenantName" },
  { title: "Compras", key: "purchases", align: "end" as const },
  { title: "Assinaturas", key: "subscriptions", align: "end" as const },
  { title: "Despesas fixas", key: "fixed", align: "end" as const },
  { title: "Total de despesas", key: "expenses", align: "end" as const },
  { title: "Rendas", key: "income", align: "end" as const },
  { title: "Saldo", key: "balance", align: "end" as const },
  { title: "", key: "actions", align: "end" as const, sortable: false },
];

const totals = computed(() => {
  const sum = (k: keyof Omit<Row, "tenantId" | "tenantName">) =>
    Math.round(visibleRows.value.reduce((s, r) => s + r[k], 0) * 100) / 100;
  return {
    purchases: sum("purchases"),
    subscriptions: sum("subscriptions"),
    fixed: sum("fixed"),
    expenses: sum("expenses"),
    income: sum("income"),
    balance: sum("balance"),
  };
});

const summary = computed((): SummaryItem[] => {
  const t = totals.value;
  return [
    {
      label: "Total de despesas",
      value: toCurrencyBRL(t.expenses),
      icon: "mdi-receipt-text-outline",
      hint: `Cartões e Pix ${toCurrencyBRL(t.purchases + t.subscriptions)} · Fixas ${toCurrencyBRL(t.fixed)}`,
    },
    { label: "Rendas", value: toCurrencyBRL(t.income), icon: "mdi-cash-plus" },
    {
      label: "Saldo do mês",
      value: toCurrencyBRL(t.balance),
      icon: "mdi-scale-balance",
      tone: t.balance < 0 ? "negative" : "positive",
      hint: "Rendas menos despesas",
    },
    selectedTenant.value
      ? { label: "Responsável", value: selectedTenant.value.name, icon: "mdi-account-outline" }
      : {
          label: "Responsáveis com movimento",
          value: String(rows.value.length),
          icon: "mdi-account-multiple-outline",
          hint: `de ${tenants.value.length} cadastrados`,
        },
  ];
});

// All tenants: expenses per tenant. One tenant: what its expenses are made of.
const expenseBars = computed((): LabeledTotal[] => {
  if (selectedTenant.value) {
    const t = totals.value;
    return [
      { id: "purchases", label: "Compras", total: t.purchases },
      { id: "subscriptions", label: "Assinaturas", total: t.subscriptions },
      { id: "fixed", label: "Despesas fixas", total: t.fixed },
    ].filter((b) => b.total > 0);
  }
  return rows.value
    .filter((r) => r.expenses > 0)
    .map((r) => ({ id: r.tenantId, label: r.tenantName, total: r.expenses }))
    .sort((a, b) => b.total - a.total);
});
const byCategoryBars = computed(() => topCategories(categoryTotals.value));

function toRow(r: TenantReport): Row {
  const n = (v: string) => Number(v || 0);
  const purchases = n(r.purchasesTotal);
  const subscriptions = n(r.subscriptionsTotal);
  const fixed = n(r.fixedExpensesTotal);
  return {
    tenantId: r.tenantId,
    tenantName: r.tenantName,
    purchases,
    subscriptions,
    fixed,
    expenses: Math.round((purchases + subscriptions + fixed) * 100) / 100,
    income: n(r.incomeSourcesTotal),
    balance: n(r.accumulatedAmount),
  };
}

async function fetchAll() {
  if (!isValidYear(year.value)) return;
  loading.value = true;
  try {
    const params = { year: year.value, month: month.value };
    const [byTenant, , tn] = await Promise.all([
      http.get<TenantReport[]>("/reports/by-tenant", { params }),
      fetchCategories(params),
      http.get<Tenant[]>("/tenants"),
    ]);
    // Tenants without any movement in the month are left out.
    rows.value = (byTenant.data || [])
      .map(toRow)
      .filter((r) => r.purchases || r.subscriptions || r.fixed || r.income);
    tenants.value = tn.data || [];
    Object.assign(shown, params);
  } finally {
    loading.value = false;
  }
}

let categoriesRequest = 0;
async function fetchCategories(period: { year: number; month: number }) {
  const id = ++categoriesRequest;
  const params = { ...period, ...(tenantId.value ? { tenantId: tenantId.value } : {}) };
  const { data } = await http.get<CategoryTotal[]>("/reports/by-category", { params });
  // Only the latest request (period or tenant change) updates the chart.
  if (id === categoriesRequest) categoryTotals.value = data || [];
}

// The tenant filter applies at once: rows are filtered here, categories come from the API.
watch(tenantId, () => fetchCategories({ year: shown.year, month: shown.month }));

async function clearFilter() {
  year.value = now.getFullYear();
  month.value = now.getMonth() + 1;
  tenantId.value = null;
  await nextTick(); // let the tenant watcher run first, so the full reload is the latest request
  await fetchAll();
}

// ---- PDF export ----

const exportDlg = reactive({
  open: false,
  tenantIds: [] as string[],
  periods: [] as ExportPeriod[],
  periodIds: [] as string[],
  loading: false,
  downloading: false,
  done: 0,
});
const exportTotal = computed(() => exportDlg.tenantIds.length * exportDlg.periodIds.length);

async function openExportDialog() {
  if (!tenants.value.length) {
    tenants.value = (await http.get<Tenant[]>("/tenants")).data || [];
  }
  Object.assign(exportDlg, {
    open: true,
    tenantIds: tenantId.value ? [tenantId.value] : [],
    periods: [],
    periodIds: [],
  });
  await loadExportPeriods();
}

function closeExportDialog() {
  Object.assign(exportDlg, { open: false, tenantIds: [], periods: [], periodIds: [] });
}

/** Distinct months that have at least one statement (any card). */
async function loadExportPeriods() {
  exportDlg.loading = true;
  try {
    const { data } = await http.get<Statement[]>("/statements");
    const grouped = new Map<string, ExportPeriod>();
    for (const st of Array.isArray(data) ? data : []) {
      const key = formatPeriod(st.year, st.month);
      if (!grouped.has(key)) grouped.set(key, { id: key, label: key, year: st.year, month: st.month });
    }
    exportDlg.periods = Array.from(grouped.values()).sort((a, b) => b.year - a.year || b.month - a.month);
    // Suggest the month on screen.
    const current = formatPeriod(shown.year, shown.month);
    if (grouped.has(current)) exportDlg.periodIds = [current];
  } finally {
    exportDlg.loading = false;
  }
}

async function fetchPdf(tenant: { id: string; name: string }, y: number, m: number) {
  const resp = await http.get<BlobPart>(`/reports/tenants/${tenant.id}/monthly-pdf`, {
    params: { year: y, month: m },
    responseType: "blob",
    skipToast: true,
  });
  await downloadPdf(resp.data, `relatório_${slug(tenant.name)}_${y}-${String(m).padStart(2, "0")}.pdf`);
}

/** PDF of one table row, for the month on screen. */
async function downloadOne(row: Row) {
  downloadingTenant.value = row.tenantId;
  try {
    await fetchPdf({ id: row.tenantId, name: row.tenantName }, shown.year, shown.month);
  } catch (e) {
    toast.show({ color: "error", message: withDetail(`Não foi possível gerar o PDF de ${row.tenantName}.`, e) });
  } finally {
    downloadingTenant.value = null;
  }
}

async function exportPdfReport() {
  const selectedPeriods = exportDlg.periods.filter((p) => exportDlg.periodIds.includes(p.id));
  const selectedTenants = tenants.value.filter((t) => exportDlg.tenantIds.includes(t.id));
  if (!selectedPeriods.length || !selectedTenants.length) return;

  exportDlg.downloading = true;
  exportDlg.done = 0;
  const failures: string[] = [];
  let firstError: unknown = null;
  try {
    // Sequential on purpose: browsers may block many simultaneous downloads.
    for (const tenant of selectedTenants) {
      for (const period of selectedPeriods) {
        try {
          await fetchPdf(tenant, period.year, period.month);
        } catch (e) {
          firstError ??= e;
          failures.push(`${tenant.name} ${period.id}`);
        } finally {
          exportDlg.done++;
        }
      }
    }
    if (failures.length) {
      toast.show({
        color: "error",
        timeout: 8000,
        message: withDetail(
          `Não foi possível gerar ${failures.length} relatório(s): ${failures.join(", ")}.`,
          firstError
        ),
      });
    } else {
      toast.show({ message: `${exportDlg.done} relatório(s) exportado(s).` });
      closeExportDialog();
    }
  } finally {
    exportDlg.downloading = false;
  }
}

async function downloadPdf(data: BlobPart, filename: string) {
  const blob = new Blob([data], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  await new Promise((resolve) => setTimeout(resolve, 500));
  URL.revokeObjectURL(url);
}

function slug(s: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

onMounted(fetchAll);
</script>

<style scoped>
.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
}
@media (max-width: 1100px) {
  .charts-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
.totals-row td {
  font-weight: 600;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
