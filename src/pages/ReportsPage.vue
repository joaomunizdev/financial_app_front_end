<template>
  <div class="reports-page">
    <div class="d-flex flex-wrap align-center justify-space-between gap-2 mt-2">
      <div>
        <div class="text-h5">Relatórios</div>
        <div class="text-body-2 text-medium-emphasis">
          Filtre por mês e ano para analisar os valores consolidados.
        </div>
      </div>
      <div class="reports-actions">
        <v-btn
          color="primary"
          prepend-icon="mdi-calendar-clock-outline"
          variant="tonal"
          @click="openInstallmentsDialog"
        >
          Parcelas futuras
        </v-btn>
        <v-btn
          color="primary"
          prepend-icon="mdi-file-pdf-box"
          variant="flat"
          @click="openExportDialog"
        >
          Exportar PDF Completo
        </v-btn>
        <v-btn
          variant="tonal"
          prepend-icon="mdi-refresh"
          :loading="loading"
          @click="fetchAll"
        >
          Atualizar
        </v-btn>
      </div>
    </div>

    <FilterBar
      class="mt-2"
      :months="months"
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
          :value="currency(globalTotal)"
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

    <v-card class="reports-table-card">
      <v-card-title class="d-flex align-center justify-space-between">
        Totais por responsável
        <v-chip color="primary" variant="tonal" size="small">
          {{ String(month).padStart(2, "0") }}/{{ year }}
        </v-chip>
      </v-card-title>
      <v-data-table
        :items="byTenant"
        :headers="headers"
        :loading="loading"
        class="pa-2"
      />
    </v-card>
    <v-dialog v-model="installmentsDlg.open" max-width="560">
      <v-card>
        <v-card-title>Parcelas futuras</v-card-title>
        <v-card-text>
          <v-select
            v-model="installmentsDlg.creditCardId"
            :items="cards"
            item-title="nickname"
            item-value="id"
            label="Cartão"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-credit-card-outline"
          />
          <v-select
            v-model="installmentsDlg.tenantId"
            :items="tenants"
            item-title="name"
            item-value="id"
            label="Responsável"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-account-outline"
          />
          <v-row>
            <v-col cols="12" sm="6">
              <v-text-field
                v-model.number="installmentsDlg.year"
                type="number"
                label="Ano"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
            <v-col cols="12" sm="6">
              <v-select
                v-model.number="installmentsDlg.month"
                :items="months"
                item-title="label"
                item-value="value"
                label="Mês"
                variant="outlined"
                density="comfortable"
              />
            </v-col>
          </v-row>
          <v-sheet
            v-if="installmentsDlg.totalAmount !== null"
            class="pa-4 rounded-lg text-center"
            color="surface-variant"
          >
            <div class="text-caption text-medium-emphasis">Total</div>
            <div class="text-h5">{{ currency(installmentsDlg.totalAmount) }}</div>
          </v-sheet>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="installmentsDlg.open = false">Fechar</v-btn>
          <v-btn
            color="primary"
            :loading="installmentsDlg.loading"
            :disabled="!installmentsDlg.creditCardId || !installmentsDlg.tenantId"
            @click="fetchInstallmentsTotal"
          >
            Consultar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-account"
            multiple
            chips
            closable-chips
          />
          <v-select
            v-model="exportDlg.statementIds"
            :items="exportDlg.statements"
            :loading="exportDlg.loading"
            item-title="label"
            item-value="id"
            label="Faturas (Períodos)"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-calendar-month-outline"
            :disabled="exportDlg.loading || exportDlg.statements.length === 0"
            multiple
            chips
            closable-chips
          />
          <div
            v-if="!exportDlg.loading && exportDlg.statements.length === 0"
            class="mt-2 text-medium-emphasis"
          >
            Nenhuma fatura encontrada. Gere uma fatura antes de exportar.
          </div>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="closeExportDialog">Cancelar</v-btn>
          <v-btn
            color="primary"
            :loading="exportDlg.downloading"
            :disabled="!exportDlg.statementIds.length || !exportDlg.tenantIds.length"
            @click="exportPdfReport"
            >Exportar {{ exportTotal || "" }}</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import FilterBar from "../components/FilterBar.vue";
import StatCard from "../components/StatCard.vue";
import { http } from "../stores/auth";

const loading = ref(false);
const cards = ref<any[]>([]);
const tenants = ref<any[]>([]);
const byTenant = ref<any[]>([]);
const globalTotal = ref(0);
const now = new Date();
const year = ref(now.getFullYear());
const month = ref(now.getMonth() + 1);
const months = Array.from({ length: 12 }, (_, i) => ({
  label: new Date(2000, i, 1).toLocaleString("pt-BR", { month: "long" }),
  value: i + 1,
}));

const installmentsDlg = reactive({
  open: false,
  creditCardId: "",
  tenantId: "",
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  totalAmount: null as string | null,
  loading: false,
});

const exportDlg = reactive<{
  open: boolean;
  tenantIds: string[];
  statements: Array<{ id: string; label: string; year: number; month: number }>;
  statementIds: string[];
  loading: boolean;
  downloading: boolean;
}>({
  open: false,
  tenantIds: [],
  statements: [],
  statementIds: [],
  loading: false,
  downloading: false,
});

const headers = [
  { title: "Responsável", key: "tenantName" },
  { title: "Total", key: "reportExpensesTotal", align: "end" as const },
];

const exportTotal = computed(
  () => exportDlg.tenantIds.length * exportDlg.statementIds.length
);

function currency(v: string | number) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function loadCards() {
  cards.value = (await http.get("/credit-cards")).data || [];
}

async function fetchAll() {
  loading.value = true;
  try {
    const params = { year: year.value, month: month.value };
    const [t, tn] = await Promise.all([
      http.get("/reports/by-tenant", { params }),
      http.get("/tenants"),
    ]);
    const filtered = (t.data || []).filter(
      (x: any) => Number(x.reportExpensesTotal || 0) !== 0
    );
    byTenant.value = filtered.map((x: any) => ({
      ...x,
      reportExpensesTotal: currency(x.reportExpensesTotal || 0),
    }));
    globalTotal.value = filtered.reduce(
      (sum: number, item: any) => sum + Number(item.reportExpensesTotal || 0),
      0
    );
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

function openInstallmentsDialog() {
  installmentsDlg.creditCardId = cards.value[0]?.id || "";
  installmentsDlg.tenantId = tenants.value[0]?.id || "";
  installmentsDlg.year = year.value;
  installmentsDlg.month = month.value;
  installmentsDlg.totalAmount = null;
  installmentsDlg.open = true;
}

async function fetchInstallmentsTotal() {
  installmentsDlg.loading = true;
  try {
    const { data } = await http.get("/reports/installments-total", {
      params: {
        creditCardId: installmentsDlg.creditCardId,
        tenantId: installmentsDlg.tenantId,
        year: installmentsDlg.year,
        month: installmentsDlg.month,
      },
    });
    installmentsDlg.totalAmount = data?.totalAmount || "0.00";
  } finally {
    installmentsDlg.loading = false;
  }
}

async function openExportDialog() {
  if (!tenants.value.length) {
    tenants.value = (await http.get("/tenants")).data || [];
  }
  exportDlg.open = true;
  exportDlg.tenantIds = [];
  exportDlg.statements = [];
  exportDlg.statementIds = [];
  await loadExportStatements();
}

function closeExportDialog() {
  exportDlg.open = false;
  exportDlg.tenantIds = [];
  exportDlg.statements = [];
  exportDlg.statementIds = [];
}

async function loadExportStatements() {
  exportDlg.loading = true;
  try {
    if (!cards.value.length) {
      const res = await http.get("/credit-cards");
      cards.value = res.data || [];
    }
    const lists = await Promise.all(
      cards.value.map(async (card: any) => {
        const { data } = await http.get("/statements", {
          params: { creditCardId: card.id },
        });
        return (Array.isArray(data) ? data : []).map((s: any) => ({
          year: s.year,
          month: s.month,
        }));
      })
    );
    const grouped = new Map<string, { id: string; label: string; year: number; month: number }>();
    lists.flat().forEach((stmt) => {
      const key = `${String(stmt.month).padStart(2, "0")}/${stmt.year}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          id: key,
          label: `Fatura - ${key}`,
          year: stmt.year,
          month: stmt.month,
        });
      }
    });
    exportDlg.statements = Array.from(grouped.values()).sort((a, b) =>
      b.year - a.year || b.month - a.month
    );
  } finally {
    exportDlg.loading = false;
  }
}

async function exportPdfReport() {
  if (!exportDlg.statementIds.length || !exportDlg.tenantIds.length) return;
  exportDlg.downloading = true;
  try {
    const selectedStatements = exportDlg.statements.filter((statement) =>
      exportDlg.statementIds.includes(statement.id)
    );
    const selectedTenants = tenants.value.filter((tenant) =>
      exportDlg.tenantIds.includes(tenant.id)
    );
    if (
      selectedStatements.length !== exportDlg.statementIds.length ||
      selectedTenants.length !== exportDlg.tenantIds.length
    ) {
      throw new Error("Dados inválidos");
    }

    for (const tenant of selectedTenants) {
      for (const statement of selectedStatements) {
        const resp = await http.get(`/reports/tenants/${tenant.id}/monthly-pdf`, {
          params: {
            year: statement.year,
            month: statement.month,
          },
          responseType: "blob",
        });

        const filename = `relatório_${slug(tenant.name)}_${statement.year}-${String(
          statement.month
        ).padStart(2, "0")}.pdf`;

        await downloadPdf(resp.data, filename);
      }
    }

    closeExportDialog();
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
    .replace(/[\u0300-\u036f]/g, "")
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
.reports-page {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.reports-stats-row {
  margin: 0;
}

.reports-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.reports-stats-row :deep(.v-col) {
  padding-top: 12px;
  padding-bottom: 12px;
}

.reports-table-card {
  margin-top: 8px;
}
</style>
