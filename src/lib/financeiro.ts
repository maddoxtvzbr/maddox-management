import type { Evento, Parcela, Pagamento, Despesa, ParcelaStatus } from "../types";
import { todayISO } from "./date";

// Todo valor monetário do app é um number em reais (ex: 2500.5). Para nunca
// sofrer erro de ponto flutuante em somas, qualquer cálculo intermediário
// passa por aqui: convertemos para centavos (inteiros), operamos, e voltamos
// para reais só no resultado final. Isso é o equivalente a guardar em
// centavos, mas sem precisar migrar todo o app que já usa reais.
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toCents(value: number): number {
  return Math.round(value * 100);
}

export function somarValores(valores: number[]): number {
  const totalCentavos = valores.reduce((soma, v) => soma + toCents(v), 0);
  return totalCentavos / 100;
}

// ---------- Parcela ----------

export function somaPagamentosDaParcela(parcelaId: string, pagamentos: Pagamento[]): number {
  return somarValores(pagamentos.filter((p) => p.parcelaId === parcelaId).map((p) => p.valor));
}

export function saldoRestanteParcela(parcela: Parcela, totalPago: number): number {
  return Math.max(0, round2(parcela.valor - totalPago));
}

// Único lugar que decide o status de uma parcela. Nunca persistido —
// sempre recalculado a partir do valor, do que já foi pago e da data.
export function calcularStatusParcela(parcela: Parcela, totalPago: number): ParcelaStatus {
  const saldo = saldoRestanteParcela(parcela, totalPago);
  if (saldo <= 0) return "pago";
  if (parcela.vencimento < todayISO()) return "vencido";
  return "a_receber";
}

// ---------- Evento ----------

export interface ResumoEvento {
  contratado: number;
  recebido: number;
  aReceber: number;
  despesas: number;
  resultado: number; // contratado - despesas
  caixaLiquido: number; // recebido - despesas
}

export function calcularResumoEvento(
  evento: Evento,
  pagamentosDoEvento: Pagamento[],
  despesasDoEvento: Despesa[]
): ResumoEvento {
  const recebido = somarValores(pagamentosDoEvento.map((p) => p.valor));
  const despesas = somarValores(despesasDoEvento.map((d) => d.valor));
  const aReceber = Math.max(0, round2(evento.valorContratado - recebido));
  const resultado = round2(evento.valorContratado - despesas);
  const caixaLiquido = round2(recebido - despesas);

  return {
    contratado: evento.valorContratado,
    recebido,
    aReceber,
    despesas,
    resultado,
    caixaLiquido
  };
}
