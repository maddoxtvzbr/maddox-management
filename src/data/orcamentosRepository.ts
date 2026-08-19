import type { Orcamento, OrcamentoStatus, NovoOrcamentoInput } from "../types";
import { supabase } from "../lib/supabaseClient";

export type { NovoOrcamentoInput };

async function usuarioAtualId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Usuário não autenticado.");
  return id;
}

function fromRow(row: Record<string, unknown>): Orcamento {
  return {
    id: row.id as string,
    nomeCliente: row.client_name as string,
    telefone: row.phone as string,
    tipoEvento: row.event_type as string,
    data: row.event_date as string,
    horario: (row.event_time as string) ?? undefined,
    cidade: row.city as string,
    local: (row.venue as string) ?? undefined,
    valor: Number(row.quoted_amount),
    observacoes: (row.notes as string) ?? undefined,
    status: row.status as OrcamentoStatus,
    motivoNaoFechou: (row.lost_reason as string) ?? undefined,
    eventId: (row.event_id as string) ?? undefined,
    criadoEm: row.created_at as string,
    atualizadoEm: row.updated_at as string
  };
}

export async function listOrcamentos(): Promise<Orcamento[]> {
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export async function getOrcamento(id: string): Promise<Orcamento | null> {
  const { data, error } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? fromRow(data) : null;
}

// Regra: todo orçamento novo nasce sempre como "aberto".
export async function createOrcamento(input: NovoOrcamentoInput): Promise<Orcamento> {
  const userId = await usuarioAtualId();
  const payload = {
    user_id: userId,
    client_name: input.nomeCliente,
    phone: input.telefone,
    event_type: input.tipoEvento,
    event_date: input.data,
    event_time: input.horario || null,
    city: input.cidade,
    venue: input.local || null,
    quoted_amount: input.valor,
    notes: input.observacoes || null,
    status: "aberto"
  };
  const { data, error } = await supabase.from("quotes").insert(payload).select().single();
  if (error) throw error;
  return fromRow(data);
}

// Edição atualiza os dados, mas nunca altera o status atual do orçamento.
export async function updateOrcamento(
  id: string,
  input: NovoOrcamentoInput
): Promise<Orcamento> {
  const payload = {
    client_name: input.nomeCliente,
    phone: input.telefone,
    event_type: input.tipoEvento,
    event_date: input.data,
    event_time: input.horario || null,
    city: input.cidade,
    venue: input.local || null,
    quoted_amount: input.valor,
    notes: input.observacoes || null
  };
  const { data, error } = await supabase
    .from("quotes")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

async function setStatus(
  id: string,
  status: OrcamentoStatus,
  motivo?: string
): Promise<Orcamento> {
  const payload: Record<string, unknown> = { status };
  if (status === "nao_fechou") payload.lost_reason = motivo || null;
  const { data, error } = await supabase
    .from("quotes")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

// Regra central do sistema: somente ao passar por aqui um orçamento se torna
// elegível para gerar evento, contrato, agenda e financeiro.
export async function fecharOrcamento(id: string): Promise<Orcamento> {
  return setStatus(id, "fechado");
}

export async function marcarNaoFechou(id: string, motivo?: string): Promise<Orcamento> {
  return setStatus(id, "nao_fechou", motivo);
}

// Chamado apenas pelo eventosRepository ao confirmar um evento.
// Grava a referência do evento no orçamento — é o único sinal confiável
// de que o fechamento foi completado. Não altera o status.
export async function linkEvento(id: string, eventId: string): Promise<Orcamento> {
  const { data, error } = await supabase
    .from("quotes")
    .update({ event_id: eventId })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}
