import { extractApiErrorDetail } from "./api-error";
import type { ImportReason } from "../types/domain";

export const REASON_LABELS: Record<ImportReason, string> = {
  card_payment: "Pagamento de fatura",
  own_transfer: "Transferência entre suas contas",
  investment: "Investimento ou rendimento",
  loan: "Empréstimo",
  invoice_credit: "Pagamento ou estorno",
  credit_card_pix: "Pix no crédito (a compra aparece na fatura do cartão)",
  already_imported: "Já importado",
  possible_duplicate: "Parece já lançado",
};

/** Formats the import accepts, shown on the page. */
export const SUPPORTED_FORMATS = {
  statement: [
    "OFX de qualquer banco",
    "CSV do Nubank e do Inter",
    "PDF do Itaú, Mercado Pago, Santander e Nubank",
  ],
  invoice: ["PDF do Itaú (inclui Magalu/Luiza), Bradesco (Amazon), Mercado Pago e Nubank", "OFX de cartão"],
};

// Backend messages of the import endpoints, in Portuguese.
const IMPORT_MESSAGES: [RegExp, string][] = [
  [/^Unrecognized file/, "Não reconhecemos esse arquivo. Confira os formatos aceitos."],
  [/^Unreadable file/, "Não conseguimos ler esse arquivo. Ele pode estar protegido por senha ou corrompido."],
  [/is a bank statement, not a credit card invoice/, "Esse arquivo é um extrato de conta. Escolha “Extrato da conta”."],
  [/is a credit card invoice, not a bank statement/, "Esse arquivo é uma fatura de cartão. Escolha “Fatura do cartão”."],
  [/^C6 Bank PDF/, "O extrato em PDF do C6 Bank ainda não é suportado. Exporte em OFX."],
  [/^Inter PDF/, "O extrato em PDF do Inter ainda não é suportado. Exporte em OFX ou CSV."],
  [/^Nubank credit card CSV/, "O CSV de cartão do Nubank ainda não é suportado. Use o PDF da fatura."],
  [/^Too many lines/, "O arquivo tem lançamentos demais (máximo de 1.000)."],
  [/^file is required/, "Escolha um arquivo."],
  [/File too large/i, "O arquivo é maior que 5 MB."],
];

/** Portuguese message for an import error, falling back to `fallback` + detail. */
export function importErrorMessage(error: unknown, fallback: string): string {
  const detail = extractApiErrorDetail(error);
  const known = detail ? IMPORT_MESSAGES.find(([re]) => re.test(detail)) : undefined;
  if (known) return known[1];
  return detail ? `${fallback} ${detail}` : fallback;
}
