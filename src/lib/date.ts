// Utilitários de data para strings no formato ISO de calendário (yyyy-mm-dd),
// sem horário. O cuidado aqui é propositalmente redobrado: `new Date("2026-08-22")`
// é interpretado como UTC meia-noite pelo JavaScript, e em fusos horários
// negativos (como o do Brasil) isso pode exibir o dia anterior. Por isso,
// todas as funções abaixo constroem e leem a data usando o construtor local
// `new Date(ano, mes, dia)` e getters locais — nunca `toISOString()` ou
// getters UTC — evitando esse deslocamento por completo.

export function parseISODateLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function toISODateLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysISO(iso: string, days: number): string {
  const date = parseISODateLocal(iso);
  date.setDate(date.getDate() + days);
  return toISODateLocal(date);
}

export function todayISO(): string {
  return toISODateLocal(new Date());
}

// Compara duas datas ISO (yyyy-mm-dd). Funciona com comparação de string
// simples porque o formato é sempre ano-mês-dia com zero à esquerda.
export function isBeforeToday(iso: string): boolean {
  return iso < todayISO();
}

export function isTodayOrFuture(iso: string): boolean {
  return iso >= todayISO();
}

// Compara apenas ano+mês (ignora o dia) — usado para agrupar eventos do
// mês atual no Dashboard. Construção local, sem Date/UTC.
export function isSameMonthAsToday(iso: string): boolean {
  const hoje = new Date();
  const [y, m] = iso.split("-").map(Number);
  return y === hoje.getFullYear() && m === hoje.getMonth() + 1;
}
