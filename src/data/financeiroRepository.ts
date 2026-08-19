import type { Evento } from "../types";
import { listEventos } from "./eventosRepository";
import { listPagamentos, listPagamentosPorEvento } from "./pagamentosRepository";
import { listDespesas, listDespesasPorEvento } from "./despesasRepository";
import { calcularResumoEvento, somarValores, round2, type ResumoEvento } from "../lib/financeiro";
import { isSameMonthAsToday } from "../lib/date";

export type { ResumoEvento };

// Resumo financeiro de um único evento (usado na tela de detalhes do evento).
export async function getResumoEvento(evento: Evento): Promise<ResumoEvento> {
  const [pagamentos, despesas] = await Promise.all([
    listPagamentosPorEvento(evento.id),
    listDespesasPorEvento(evento.id)
  ]);
  return calcularResumoEvento(evento, pagamentos, despesas);
}

export interface ResumoGeral {
  contratado: number;
  recebido: number;
  aReceber: number;
  despesas: number;
  resultado: number; // contratado - despesas
}

// Regra central: só eventos realmente confirmados (gerados a partir de
// orçamento fechado) entram aqui — orçamento em aberto ou não fechado nunca
// chega a existir como Evento, então nunca aparece neste cálculo.
export async function getResumoGeral(): Promise<ResumoGeral> {
  const [eventosTodos, pagamentos, despesas] = await Promise.all([
    listEventos(),
    listPagamentos(),
    listDespesas()
  ]);

  // Evento cancelado mantém pagamentos/despesas já lançados no histórico,
  // mas não conta mais nos totais ativos do Financeiro/Dashboard.
  const eventos = eventosTodos.filter((e) => e.status !== "cancelado");

  const resumosPorEvento = eventos.map((evento) =>
    calcularResumoEvento(
      evento,
      pagamentos.filter((p) => p.eventoId === evento.id),
      despesas.filter((d) => d.eventoId === evento.id)
    )
  );

  const contratado = somarValores(resumosPorEvento.map((r) => r.contratado));
  const recebido = somarValores(resumosPorEvento.map((r) => r.recebido));
  const aReceber = somarValores(resumosPorEvento.map((r) => r.aReceber));
  const despesasTotal = somarValores(resumosPorEvento.map((r) => r.despesas));

  return {
    contratado,
    recebido,
    aReceber,
    despesas: despesasTotal,
    resultado: round2(contratado - despesasTotal)
  };
}

export interface ResumoMesAtual {
  contratado: number;
  despesas: number;
  resultado: number;
}

// Usado no Dashboard ("Resultado do mês"): considera a data do EVENTO (não a
// data do pagamento) para decidir se ele conta no mês atual.
export async function getResumoMesAtual(): Promise<ResumoMesAtual> {
  const [eventosTodos, despesas] = await Promise.all([listEventos(), listDespesas()]);

  const eventosDoMes = eventosTodos.filter(
    (e) => e.status !== "cancelado" && isSameMonthAsToday(e.data)
  );
  const idsDoMes = new Set(eventosDoMes.map((e) => e.id));

  const contratado = somarValores(eventosDoMes.map((e) => e.valorContratado));
  const despesasDoMes = somarValores(
    despesas.filter((d) => idsDoMes.has(d.eventoId)).map((d) => d.valor)
  );

  return {
    contratado,
    despesas: despesasDoMes,
    resultado: round2(contratado - despesasDoMes)
  };
}

export interface EventoComResumo {
  evento: Evento;
  resumo: ResumoEvento;
}

// Usado na lista de eventos da tela Financeiro.
export async function listEventosComResumo(): Promise<EventoComResumo[]> {
  const [eventosTodos, pagamentos, despesas] = await Promise.all([
    listEventos(),
    listPagamentos(),
    listDespesas()
  ]);

  const eventos = eventosTodos.filter((e) => e.status !== "cancelado");

  return eventos.map((evento) => ({
    evento,
    resumo: calcularResumoEvento(
      evento,
      pagamentos.filter((p) => p.eventoId === evento.id),
      despesas.filter((d) => d.eventoId === evento.id)
    )
  }));
}
