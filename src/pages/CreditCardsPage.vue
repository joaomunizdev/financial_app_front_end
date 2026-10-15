<template>
  <div class="d-flex flex-column ga-6">
    <PageHeader
      title="Cartões"
      description="Cartões de crédito e débito usados nas compras, faturas e assinaturas."
    >
      <v-btn prepend-icon="mdi-plus" @click="openNew">Novo cartão</v-btn>
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
        <template #item.cardType="{ item }">
          <v-chip
            :color="item.cardType === 'debit' ? 'secondary' : 'primary'"
            variant="tonal"
            size="small"
          >
            {{ cardTypeLabel(item.cardType) }}
          </v-chip>
        </template>
        <template #item.limitAmount="{ item }">
          {{ item.cardType === "debit" ? "—" : toCurrencyBRL(item.limitAmount ?? 0) }}
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
            :image="emptyCards"
            title="Cadastre seu primeiro cartão"
            description="Cartões de crédito e débito aparecem nas compras, faturas e no Dashboard."
            action-text="Novo cartão"
            @action="openNew"
          />
        </template>
      </v-data-table-server>
    </v-card>

    <v-dialog v-model="open" max-width="520" :key="dialogKey">
      <v-card>
        <v-card-title>{{
          form.id ? "Editar cartão" : "Novo cartão"
        }}</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="save">
            <v-text-field
              v-model="form.nickname"
              label="Apelido"
              maxlength="80"
              :error-messages="errors.nickname"
            />
            <v-select
              v-model="form.brand"
              :items="CARD_BRANDS"
              label="Bandeira"
              :error-messages="errors.brand"
            />
            <v-text-field
              v-model="form.last4"
              label="Final"
              maxlength="4"
              inputmode="numeric"
              :error-messages="errors.last4"
              @input="form.last4 = digitsOnly(form.last4, 4)"
            />
            <v-select
              v-model="form.cardType"
              :items="cardTypes"
              item-title="label"
              item-value="value"
              label="Tipo"
              :hint="
                form.cardType === 'debit'
                  ? 'Cartão de débito não aceita compras parceladas.'
                  : ''
              "
              persistent-hint
            />
            <v-text-field
              v-if="form.cardType === 'credit'"
              v-model="form.limitAmount"
              label="Limite (BRL)"
              :error-messages="errors.limitAmount"
              @update:modelValue="onLimitInput"
            />
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
import emptyCards from "../assets/empty/empty-cards.webp";
import { ref, reactive, watch } from "vue";
import { CARD_BRANDS, type CardBrand } from "../utils/cardBrands";
import { usePagedList } from "../composables/usePagedList";
import http from "../plugins/http";
import * as yup from "yup";
import { useCurrency } from "../composables/useCurrency";
import { useFormErrors } from "../composables/useFormErrors";
import { moneyField } from "../schemas/money";
import { useConfirmStore } from "../stores/confirm";
import type { CardType, CreditCard, SelectOption } from "../types/domain";

const { toCurrencyBRL, digitsOnly, formatCurrencyOnType, toApiMoney } =
  useCurrency();
const confirm = useConfirmStore();

const saving = ref(false);
const open = ref(false);
const dialogKey = ref(0);

const { items, total, loading, options, onOptions, reload } = usePagedList<CreditCard>(
  "/credit-cards"
);
const cardTypes: SelectOption<CardType>[] = [
  { label: "Crédito", value: "credit" },
  { label: "Débito", value: "debit" },
];
const headers = [
  { title: "Apelido", key: "nickname" },
  { title: "Bandeira", key: "brand" },
  { title: "Tipo", key: "cardType" },
  { title: "Final", key: "last4" },
  { title: "Limite", key: "limitAmount", align: "end" as const },
  { title: "", key: "actions", align: "end" as const, sortable: false },
];

function cardTypeLabel(value: CardType) {
  return cardTypes.find((t) => t.value === value)?.label ?? "—";
}

function onLimitInput(val: string) {
  form.limitAmount = formatCurrencyOnType(val);
}

type FormT = {
  id: string;
  nickname: string;
  brand: CardBrand | null;
  last4: string;
  limitAmount: string;
  cardType: CardType;
};

const emptyForm = (): FormT => ({
  id: "",
  nickname: "",
  brand: null,
  last4: "",
  limitAmount: "",
  cardType: "credit",
});

// Type as loaded from the API, to detect a credit → debit change on save.
const originalCardType = ref<CardType | null>(null);

const form = reactive<FormT>(emptyForm());

const schema = yup.object({
  nickname: yup
    .string()
    .trim()
    .required("Apelido é obrigatório")
    .max(80, "Máximo de 80 caracteres"),
  brand: yup
    .string()
    .required("Bandeira é obrigatória")
    .oneOf([...CARD_BRANDS], "Escolha uma bandeira da lista"),
  last4: yup
    .string()
    .required("Final é obrigatório")
    .matches(/^\d{4}$/, "Final deve conter exatamente 4 dígitos"),
  cardType: yup.string().oneOf(["credit", "debit"]).required(),
  // Debit cards have no limit.
  limitAmount: yup.string().when("cardType", {
    is: "credit",
    then: () => moneyField({ requiredMessage: "Limite é obrigatório" }),
    otherwise: (schema) => schema.notRequired(),
  }),
});

const { errors, clearErrors, validateAll } = useFormErrors(schema, [
  "nickname",
  "brand",
  "last4",
  "limitAmount",
] as const);

function openNew() {
  Object.assign(form, emptyForm());
  originalCardType.value = null;
  clearErrors();
  open.value = true;
}

function edit(it: CreditCard) {
  Object.assign(form, {
    id: it.id,
    nickname: it.nickname ?? "",
    brand: it.brand ?? null,
    last4: digitsOnly(String(it.last4 ?? ""), 4),
    limitAmount: toCurrencyBRL(it.limitAmount ?? "0"),
    cardType: it.cardType ?? "credit",
  });
  originalCardType.value = it.cardType ?? "credit";
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

async function save() {
  saving.value = true;
  try {
    if (!(await validateAll(form))) return;

    const becomesDebit =
      !!form.id && originalCardType.value === "credit" && form.cardType === "debit";
    if (becomesDebit) {
      const confirmed = await confirm.ask({
        title: "Mudar para cartão de débito",
        message:
          "Cartão de débito não aceita compras parceladas. As compras parceladas deste cartão serão divididas em compras individuais, uma por mês, com o mesmo valor de cada parcela. As faturas já existentes mantêm seus valores. Essa conversão não pode ser desfeita.",
        confirmText: "Converter",
      });
      if (!confirmed) return;
    }

    const isCredit = form.cardType === "credit";
    const body = {
      nickname: form.nickname.trim(),
      brand: form.brand,
      last4: form.last4,
      cardType: form.cardType,
      limitAmount: isCredit ? toApiMoney(form.limitAmount) : null,
    };

    if (form.id) await http.patch(`/credit-cards/${form.id}`, body);
    else await http.post("/credit-cards", body);

    open.value = false;
    await reload();
  } finally {
    saving.value = false;
  }
}

async function remove(it: CreditCard) {
  const confirmed = await confirm.ask({
    title: "Excluir cartão",
    message: `Deseja excluir o cartão "${it.nickname}"? Faturas e assinaturas vinculadas a ele também serão excluídas, e cartões com compras não podem ser excluídos. Essa ação não pode ser desfeita.`,
  });
  if (!confirmed) return;
  await http.delete(`/credit-cards/${it.id}`);
  await reload();
}

</script>
