import type { NovoPagamentoInput, Pagamento } from "../types";
import { supabase } from "../lib/supabaseClient";
import { round2, saldoRestanteParcela, somaPagamentosDaParcela } from "../lib/financeiro";
import { getParcela } from "./eventosRepository";

async function usuarioAtualId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Usuário não autenticado.");
  return id;
}

function fromRow(row: Record<string, unknown>): Pagamento {
  return {
    id: row.id as string,
    eventoId: row.event_id as string,
    parcelaId: row.installment_id as string,
    valor: Number(row.amount),
    dataPagamento: row.payment_date as string,
    formaPagamento: row.payment_method as Pagamento["formaPagamento"],
    observacoes: (row.notes as string) ?? undefined,
    createdAt: row.created_at as string
  };
}

export async function listPagamentos(): Promise<Pagamento[]> {
  const { data, error } = await supabase.from("payments").select("*");
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function listPagamentosPorEvento(eventoId: string): Promise<Pagamento[]> {
  const { data, error } = await supabase.from("payments").select("*").eq("event_id", eventoId);
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function listPagamentosPorParcela(parcelaId: string): Promise<Pagamento[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("installment_id", parcelaId);
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

// Regra de segurança: nunca permite registrar um pagamento maior que o saldo
// restante da parcela.
export async function registrarPagamento(input: NovoPagamentoInput): Promise<Pagamento> {
  if (!input.valor || input.valor <= 0) {
    throw new Error("O valor do pagamento deve ser maior que zero.");
  }

  const parcela = await getParcela(input.parcelaId);
  if (!parcela) throw new Error("Parcela não encontrada.");

  const pagamentosExistentes = await listPagamentosPorParcela(input.parcelaId);
  const totalPago = somaPagamentosDaParcela(input.parcelaId, pagamentosExistentes);
  const saldo = saldoRestanteParcela(parcela, totalPago);
  const valor = round2(input.valor);

  if (valor > saldo + 0.005) {
    throw new Error("O valor informado é maior que o saldo restante desta parcela.");
  }

  const userId = await usuarioAtualId();
  const payload = {
    user_id: userId,
    event_id: input.eventoId,
    installment_id: input.parcelaId,
    amount: valor,
    payment_date: input.dataPagamento,
    payment_method: input.formaPagamento,
    notes: input.observacoes || null
  };

  const { data, error } = await supabase.from("payments").insert(payload).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function excluirPagamento(id: string): Promise<void> {
  const { error } = await supabase.from("payments").delete().eq("id", id);
  if (error) throw error;
}
