import type { Despesa, NovaDespesaInput } from "../types";
import { supabase } from "../lib/supabaseClient";
import { round2 } from "../lib/financeiro";

async function usuarioAtualId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Usuário não autenticado.");
  return id;
}

function fromRow(row: Record<string, unknown>): Despesa {
  return {
    id: row.id as string,
    eventoId: row.event_id as string,
    descricao: row.description as string,
    categoria: row.category as Despesa["categoria"],
    valor: Number(row.amount),
    data: row.expense_date as string,
    observacoes: (row.notes as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}

function validar(input: NovaDespesaInput): void {
  if (!input.descricao.trim()) throw new Error("Informe a descrição da despesa.");
  if (!input.categoria) throw new Error("Selecione a categoria.");
  if (!input.valor || input.valor <= 0) throw new Error("Informe um valor válido.");
  if (!input.data) throw new Error("Informe a data da despesa.");
}

export async function listDespesas(): Promise<Despesa[]> {
  const { data, error } = await supabase.from("expenses").select("*");
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function listDespesasPorEvento(eventoId: string): Promise<Despesa[]> {
  const { data, error } = await supabase.from("expenses").select("*").eq("event_id", eventoId);
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

// Toda despesa nasce sempre vinculada a um eventoId — nunca existe despesa
// "solta" sem evento.
export async function criarDespesa(input: NovaDespesaInput): Promise<Despesa> {
  validar(input);
  const userId = await usuarioAtualId();
  const payload = {
    user_id: userId,
    event_id: input.eventoId,
    description: input.descricao.trim(),
    category: input.categoria,
    amount: round2(input.valor),
    expense_date: input.data,
    notes: input.observacoes?.trim() || null
  };
  const { data, error } = await supabase.from("expenses").insert(payload).select().single();
  if (error) throw error;
  return fromRow(data);
}

export async function atualizarDespesa(id: string, input: NovaDespesaInput): Promise<Despesa> {
  validar(input);
  const payload = {
    description: input.descricao.trim(),
    category: input.categoria,
    amount: round2(input.valor),
    expense_date: input.data,
    notes: input.observacoes?.trim() || null
  };
  const { data, error } = await supabase
    .from("expenses")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function excluirDespesa(id: string): Promise<void> {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
}
