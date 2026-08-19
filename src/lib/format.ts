const MESES = [
  "JAN", "FEV", "MAR", "ABR", "MAI", "JUN",
  "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"
];

export function formatCurrencyBRL(value: number): string {
  return (value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

// Recebe uma data no formato ISO (yyyy-mm-dd) e retorna "22 AGO 2026"
export function formatDateShort(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")} ${MESES[m - 1]} ${y}`;
}

// Retorna dia e mês separadamente (ex: { dia: "22", mes: "AGO" }) — usado no
// selo de data das listas (Agenda, Início).
export function formatDayMonth(iso: string): { dia: string; mes: string } {
  if (!iso) return { dia: "--", mes: "" };
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return { dia: "--", mes: "" };
  return { dia: String(d).padStart(2, "0"), mes: MESES[m - 1] };
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

// Formata progressivamente um telefone brasileiro enquanto o usuário digita.
export function formatPhoneDisplay(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

// Gera o link universal do WhatsApp (funciona em Android e iOS, sem API paga).
export function buildWhatsAppLink(phone: string): string | null {
  const digits = onlyDigits(phone);
  if (!digits) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}
