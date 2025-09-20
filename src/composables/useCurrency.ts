export function useCurrency() {
  const brl = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  function toNumberBRL(v: string | number): number {
    if (typeof v === "number") return v;
    if (!v) return NaN;
    let s = String(v).trim();
    s = s.replace(/[R$\s\u00A0]/g, "");
    const hasComma = s.includes(",");
    const hasDot = s.includes(".");
    if (hasComma && hasDot) {
      if (s.lastIndexOf(",") > s.lastIndexOf("."))
        s = s.replace(/\./g, "").replace(",", ".");
      else s = s.replace(/,/g, "");
    } else if (hasComma) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
    s = s.replace(/(?!^)-/g, "");
    const n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }

  function toCurrencyBRL(v: string | number): string {
    const n = typeof v === "number" ? v : toNumberBRL(v);
    return brl.format(isNaN(n) ? 0 : n);
  }

  function sanitizeCurrencyInput(v: string): string {
    return (v ?? "").toString().replace(/[^\d,.\-]/g, "");
  }

  function formatCurrencyString(v: string): string {
    const n = toNumberBRL(v);
    if (isNaN(n)) return "";
    return brl.format(n);
  }

  function digitsOnly(v: string, maxLen?: number): string {
    const s = (v ?? "").toString().replace(/\D+/g, "");
    return typeof maxLen === "number" ? s.slice(0, maxLen) : s;
  }

  // === NOVO: máscara em tempo real (interpreta como centavos) ===
  function formatCurrencyOnType(v: string): string {
    // mantém apenas dígitos
    const onlyDigits = (v ?? "").replace(/\D+/g, "");
    // valor em centavos: se vazio -> 0; se 1 dígito -> 0,0x; se 2 -> 0,xx; senão -> ...xx
    const cents = onlyDigits === "" ? 0 : parseInt(onlyDigits, 10);
    const value = cents / 100; // transforma para reais
    return brl.format(isNaN(value) ? 0 : value);
  }

  return {
    toNumberBRL,
    toCurrencyBRL,
    sanitizeCurrencyInput,
    formatCurrencyString,
    digitsOnly,
    formatCurrencyOnType, // << exporta novo helper
  };
}
