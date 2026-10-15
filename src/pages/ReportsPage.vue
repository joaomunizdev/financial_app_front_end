<template>
  <div class="d-flex flex-column ga-6">
    <PageHeader
      title="Relatórios"
      description="Totais consolidados por responsável no mês escolhido."
    >
        <v-btn
          prepend-icon="mdi-file-pdf-box"
          @click="openExportDialog"
        >
          Exportar PDF
        </v-btn>
        <v-btn
          variant="outlined"
          color="default"
          prepend-icon="mdi-refresh"
          :loading="loading"
          @click="fetchAll"
        >
          Atualizar
        </v-btn>
    </PageHeader>

    <FilterBar
      :months="MONTHS"
      :model-value-year="year"
      :model-value-month="month"
      @update:year="(v) => (year = v)"
      @update:month="(v) => (month = v)"
      @apply="fetchAll"
      @clear="clearFilter"
    />

    <v-row class="reports-stats-row">
      <v-col cols="12" md="4">
        <StatCard
          label="Total filtrado"
          :value="toCurrencyBRL(globalTotal)"
          icon="mdi-cash-multiple"
        />
      </v-col>
      <v-col cols="12" md="4">
        <StatCard
          label="Total de cartões"
          :value="cards.length.toString()"
          icon="mdi-credit-card-outline"
        />
      </v-col>
      <v-col cols="12" md="4">
        <StatCard
          label="Responsáveis"
          :value="tenants.length.toString()"
          icon="mdi-account-multiple-outline"
        />
      </v-col>
    </v-row>

    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        Totais por responsável
        <v-chip color="primary" variant="tonal" size="small">
          {{ formatPeriod(year, month) }}
        </v-chip>
      </v-card-title>
      <v-data-table
        :items="byTenant"
        :headers="headers"
        :loading="loading"
        class="pa-2"
      >
        <template #item.reportExpensesTotal="{ item }">{{
          toCurrencyBRL(item.reportExpensesTotal)
        }}</template>
        <template #no-data>
          <EmptyState
            :image="emptySearch"
            title="Sem dados neste mês"
            description="Os relatórios usam as faturas geradas do período."
            action-text="Ir para faturas"
            action-icon="mdi-file-document-outline"
            action-to="/statements"
          />
        </template>
      </v-data-table>
    </v-card>
    <v-dialog v-model="exportDlg.open" max-width="560">
      <v-card>
        <v-card-title>Exportar PDF mensal</v-card-title>
        <v-card-text>
          <div class="mb-3 text-body-2">
            Escolha os responsáveis e o período para gerar os relatórios.
          </div>
          <v-select
            v-model="exportDlg.tenantIds"
            :items="tenants"
            item-title="name"
            item-value="id"
            label="Responsáveis"
            prepend-inner-icon="mdi-account"
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
            label="Faturas (Períodos)"
            prepend-inner-icon="mdi-calendar-month-outline"
            :disabled="exportDlg.loading || exportDlg.periods.length === 0"
            multiple
            chips
            closable-chips
          />
          <div
            v-if="!exportDlg.loading && exportDlg.periods.length === 0"
            class="mt-2 text-medium-emphasis"
          >
            Nenhuma fatura encontrada. Gere uma fatura antes de exportar.
          </div>
          <div
            v-if="exportDlg.downloading && exportTotal > 1"
            class="mt-2 text-body-2"
          >
            Baixando {{ exportDlg.done }} de {{ exportTotal }}…
          </div>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="closeExportDialog">Cancelar</v-btn>
          <v-btn
            color="primary"
            :loading="exportDlg.downloading"
            :disabled="!exportDlg.periodIds.length || !exportDlg.tenantIds.length"
            @click="exportPdfReport"
            >Exportar {{ exportTotal || "" }}</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import PageHeader from "../components/PageHeader.vue";
import EmptyState from "../components/EmptyState.vue";
import emptySearch from "../assets/empty/empty-search.webp";
import { computed, onMounted, reactive, ref } from "vue";
import FilterBar from "../components/FilterBar.vue";
import StatCard from "../components/StatCard.vue";
import http from "../plugins/http";
import { useCurrency } from "../composables/useCurrency";
import { useToastStore } from "../stores/toast";
import { withDetail } from "../utils/api-error";
import {
  MONTHS,
  formatPeriod,
  isValidYear,
} from "../utils/date";
import type {
  CreditCard,
  Statement,
  Tenant,
  TenantReport,
} from "../types/domain";

type ExportPeriod = { id: string; label: string; year: number; month: number };
type TenantReportRow = Omit<TenantReport, "reportExpensesTotal"> & {
  reportExpensesTotal: number;
};

const { toCurrencyBRL } = useCurrency();
const toast = useToastStore();

const loading = ref(false);
const cards = ref<CreditCard[]>([]);
const tenants = ref<Tenant[]>([]);
const byTenant = ref<TenantReportRow[]>([]);
const now = new Date();
const year = ref(now.getFullYear());
const month = ref(now.getMonth() + 1);

const exportDlg = reactive({
  open: false,
  tenantIds: [] as string[],
  periods: [] as ExportPeriod[],
  periodIds: [] as string[],
  loading: false,
  downloading: false,
  done: 0,
});

const headers = [
  { title: "Responsável", key: "tenantName" },
  { title: "Total", key: "reportExpensesTotal", align: "end" as const },
];

const exportTotal = computed(
  () => exportDlg.tenantIds.length * exportDlg.periodIds.length
);

// Sum of the visible rows (tenants with a non-zero total).
const globalTotal = computed(() =>
  byTenant.value.reduce((sum, item) => sum + item.reportExpensesTotal, 0)
);

async function loadCards() {
  cards.value = (await http.get<CreditCard[]>("/credit-cards")).data || [];
}

async function fetchAll() {
  if (!isValidYear(year.value)) return;
  loading.value = true;
  try {
    const params = { year: year.value, month: month.value };
    const [t, tn] = await Promise.all([
      http.get<TenantReport[]>("/reports/by-tenant", { params }),
      http.get<Tenant[]>("/tenants"),
    ]);
    // Kept numeric so the column sorts by value; formatted in the item slot.
    byTenant.value = (t.data || [])
      .map((x) => ({ ...x, reportExpensesTotal: Number(x.reportExpensesTotal || 0) }))
      .filter((x) => x.reportExpensesTotal !== 0);
    tenants.value = tn.data || [];
  } finally {
    loading.value = false;
  }
}

async function clearFilter() {
  year.value = now.getFullYear();
  month.value = now.getMonth() + 1;
  await fetchAll();
}

async function openExportDialog() {
  if (!tenants.value.length) {
    tenants.value = (await http.get<Tenant[]>("/tenants")).data || [];
  }
  exportDlg.open = true;
  exportDlg.tenantIds = [];
  exportDlg.periods = [];
  exportDlg.periodIds = [];
  await loadExportPeriods();
}

function closeExportDialog() {
  exportDlg.open = false;
  exportDlg.tenantIds = [];
  exportDlg.periods = [];
  exportDlg.periodIds = [];
}

/** Distinct MM/YYYY periods that have at least one statement (any card). */
async function loadExportPeriods() {
  exportDlg.loading = true;
  try {
    const { data } = await http.get<Statement[]>("/statements");
    const grouped = new Map<string, ExportPeriod>();
    for (const st of Array.isArray(data) ? data : []) {
      const key = formatPeriod(st.year, st.month);
      if (!grouped.has(key)) {
        grouped.set(key, {
          id: key,
          label: `Fatura - ${key}`,
          year: st.year,
          month: st.month,
        });
      }
    }
    exportDlg.periods = Array.from(grouped.values()).sort(
      (a, b) => b.year - a.year || b.month - a.month
    );
  } finally {
    exportDlg.loading = false;
  }
}

async function exportPdfReport() {
  const selectedPeriods = exportDlg.periods.filter((p) =>
    exportDlg.periodIds.includes(p.id)
  );
  const selectedTenants = tenants.value.filter((t) =>
    exportDlg.tenantIds.includes(t.id)
  );
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
          const resp = await http.get<BlobPart>(
            `/reports/tenants/${tenant.id}/monthly-pdf`,
            {
              params: { year: period.year, month: period.month },
              responseType: "blob",
              skipToast: true,
            }
          );
          const filename = `relatório_${slug(tenant.name)}_${period.year}-${String(
            period.month
          ).padStart(2, "0")}.pdf`;
          await downloadPdf(resp.data, filename);
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
    .replace(/[^\w\-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

onMounted(async () => {
  await loadCards();
  await fetchAll();
});
</script>

<style scoped>

.reports-stats-row {
  margin: 0;
}


.reports-stats-row :deep(.v-col) {
  padding-top: 12px;
  padding-bottom: 12px;
}

</style>
