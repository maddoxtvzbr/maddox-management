import type { Evento, EventoEditInput, FechamentoInput, Parcela } from "../types";
import { supabase } from "../lib/supabaseClient";
import { addDaysISO, todayISO } from "../lib/date";
import { linkEvento } from "./orcamentosRepository";

async function usuarioAtualId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Usuário não autenticado.");
  return id;
}

function fromEventRow(row: Record<string, unknown>): Evento {
  return {
    id: row.id as string,
    quoteId: row.quote_id as string,
    cliente: row.client_name as string,
    cpfCnpj: row.client_document as string,
    telefone: row.phone as string,
    email: (row.email as string) ?? undefined,
    endereco: (row.client_address as Evento["endereco"]) ?? undefined,
    tipoEvento: row.event_type as string,
    data: row.event_date as string,
    horario: (row.start_time as string) ?? undefined,
    horarioTermino: (row.end_time as string) ?? undefined,
    horarioMontagem: (row.setup_time as string) ?? undefined,
    cidade: row.city as string,
    local: (row.venue as string) ?? undefined,
    enderecoEvento: (row.address as string) ?? undefined,
    observacoes: (row.notes as string) ?? undefined,
    valorContratado: Number(row.contracted_amount),
    valorOrcamentoOriginal: Number(row.original_amount),
    formaPagamento: (row.payment_method as Evento["formaPagamento"]) ?? undefined,
    status: (row.status as Evento["status"]) ?? "confirmado",
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}

function fromParcelaRow(row: Record<string, unknown>): Parcela {
  return {
    id: row.id as string,
    eventoId: row.event_id as string,
    descricao: row.description as string,
    valor: Number(row.amount),
    vencimento: row.due_date as string,
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string) ?? (row.created_at as string)
  };
}

// Divide um valor em duas parcelas cuja soma é EXATAMENTE igual ao total,
// mesmo quando o valor não é divisível igualmente por 2. Trabalha em
// centavos (inteiros) para nunca sofrer erro de ponto flutuante.
function splitValorEmDuasParcelas(valor: number): [number, number] {
  const totalCentavos = Math.round(valor * 100);
  const metade = Math.floor(totalCentavos / 2);
  const resto = totalCentavos - metade;
  return [metade / 100, resto / 100];
}

export async function listEventos(): Promise<Evento[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(fromEventRow);
}

export async function getEvento(id: string): Promise<Evento | null> {
  const { data, error } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? fromEventRow(data) : null;
}

export async function getEventoPorOrcamento(quoteId: string): Promise<Evento | null> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("quote_id", quoteId)
    .maybeSingle();
  if (error) throw error;
  return data ? fromEventRow(data) : null;
}

export async function listParcelas(): Promise<Parcela[]> {
  const { data, error } = await supabase.from("installments").select("*");
  if (error) throw error;
  return (data ?? []).map(fromParcelaRow);
}

export async function listParcelasPorEvento(eventoId: string): Promise<Parcela[]> {
  const { data, error } = await supabase
    .from("installments")
    .select("*")
    .eq("event_id", eventoId)
    .order("due_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(fromParcelaRow);
}

export async function getParcela(id: string): Promise<Parcela | null> {
  const { data, error } = await supabase
    .from("installments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? fromParcelaRow(data) : null;
}

// Regra crítica: cada orçamento fechado só pode gerar um evento. O banco
// tem uma constraint UNIQUE em quote_id, então mesmo em caso de corrida
// (dois toques quase simultâneos) o segundo insert falha e devolvemos o
// evento que já existe em vez de duplicar.
export async function criarEvento(quoteId: string, input: FechamentoInput): Promise<Evento> {
  const existente = await getEventoPorOrcamento(quoteId);
  if (existente) return existente;

  const userId = await usuarioAtualId();
  const payload = {
    user_id: userId,
    quote_id: quoteId,
    client_name: input.cliente,
    client_document: input.cpfCnpj,
    phone: input.telefone,
    email: input.email || null,
    client_address: input.endereco ?? null,
    event_type: input.tipoEvento,
    event_date: input.data,
    start_time: input.horario || null,
    end_time: input.horarioTermino || null,
    setup_time: input.horarioMontagem || null,
    city: input.cidade,
    venue: input.local || null,
    address: input.enderecoEvento || null,
    contracted_amount: input.valorContratado,
    original_amount: input.valorContratado,
    payment_method: input.formaPagamento || null,
    notes: input.observacoes || null,
    status: "confirmado"
  };

  const { data, error } = await supabase.from("events").insert(payload).select().single();
  if (error) {
    const jaExiste = await getEventoPorOrcamento(quoteId);
    if (jaExiste) return jaExiste;
    throw error;
  }
  const evento = fromEventRow(data);

  const [entrada, saldo] = splitValorEmDuasParcelas(evento.valorContratado);
  const parcelasPayload = [
    {
      user_id: userId,
      event_id: evento.id,
      description: "Entrada",
      amount: entrada,
      due_date: todayISO()
    },
    {
      user_id: userId,
      event_id: evento.id,
      description: "Saldo final",
      amount: saldo,
      due_date: addDaysISO(evento.data, -1)
    }
  ];
  const { error: parcelasError } = await supabase.from("installments").insert(parcelasPayload);
  if (parcelasError) throw parcelasError;

  await linkEvento(quoteId, evento.id);

  return evento;
}

// Edição básica do evento. Se a data mudar, o vencimento da parcela
// "Saldo final" é recalculado (1 dia antes) sobre o MESMO registro —
// nunca cria uma parcela nova.
export async function atualizarEvento(id: string, input: EventoEditInput): Promise<Evento> {
  const anterior = await getEvento(id);
  if (!anterior) throw new Error("Evento não encontrado.");

  const payload = {
    event_date: input.data,
    start_time: input.horario || null,
    city: input.cidade,
    venue: input.local || null,
    notes: input.observacoes || null
  };
  const { data, error } = await supabase
    .from("events")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  const atualizado = fromEventRow(data);

  if (input.data && input.data !== anterior.data) {
    const { error: parcelaError } = await supabase
      .from("installments")
      .update({ due_date: addDaysISO(input.data, -1) })
      .eq("event_id", id)
      .eq("description", "Saldo final");
    if (parcelaError) throw parcelaError;
  }

  return atualizado;
}

// Cancela o evento — mantém tudo no histórico (financeiro, contrato, etc.)
// mas ele deixa de contar como evento futuro/ativo na Agenda e no Financeiro.
export async function cancelarEvento(id: string): Promise<Evento> {
  const { data, error } = await supabase
    .from("events")
    .update({ status: "cancelado" })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return fromEventRow(data);
}
