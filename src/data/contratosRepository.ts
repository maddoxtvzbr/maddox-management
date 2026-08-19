import type { Contrato, ContratoSnapshot } from "../types";
import { supabase } from "../lib/supabaseClient";

async function usuarioAtualId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Usuário não autenticado.");
  return id;
}

function fromRow(row: Record<string, unknown>): Contrato {
  return {
    id: row.id as string,
    eventoId: row.event_id as string,
    numero: row.contract_number as string,
    status: row.status as Contrato["status"],
    autorizaImagem: row.image_authorization as boolean,
    foro: row.forum as string,
    snapshot: row.snapshot as ContratoSnapshot,
    geradoEm: row.generated_at as string,
    atualizadoEm: row.updated_at as string,
    originalFilePath: (row.original_file_path as string) ?? undefined,
    assinadoArquivoNome: (row.signed_file_name as string) ?? undefined,
    assinadoArquivoCaminho: (row.signed_file_path as string) ?? undefined,
    assinadoImportadoEm: (row.signed_at as string) ?? undefined
  };
}

export async function getContratoPorEvento(eventoId: string): Promise<Contrato | null> {
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("event_id", eventoId)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data) : null;
}

// Idempotente: se já existir contrato para este evento, apenas atualiza o
// snapshot — NUNCA aloca um número novo. O número só é alocado (via RPC
// atômica no banco) na primeira geração.
export async function gerarOuAtualizarContrato(
  eventoId: string,
  snapshot: ContratoSnapshot,
  autorizaImagem: boolean,
  foro: string
): Promise<Contrato> {
  const existente = await getContratoPorEvento(eventoId);
  if (existente) {
    const { data, error } = await supabase
      .from("contracts")
      .update({ snapshot, image_authorization: autorizaImagem, forum: foro })
      .eq("id", existente.id)
      .select()
      .single();
    if (error) throw error;
    return fromRow(data);
  }

  const userId = await usuarioAtualId();
  const ano = new Date().getFullYear();
  const { data: numero, error: numeroError } = await supabase.rpc("next_contract_number", {
    p_year: ano
  });
  if (numeroError) throw numeroError;

  const payload = {
    user_id: userId,
    event_id: eventoId,
    contract_number: numero as string,
    status: "gerado",
    image_authorization: autorizaImagem,
    forum: foro,
    snapshot
  };
  const { data, error } = await supabase.from("contracts").insert(payload).select().single();
  if (error) {
    // Corrida rara: já existe (constraint UNIQUE em event_id) -> devolve o existente.
    const jaExiste = await getContratoPorEvento(eventoId);
    if (jaExiste) return jaExiste;
    throw error;
  }
  return fromRow(data);
}

// Grava o caminho do PDF original no Storage. Chamado de forma best-effort
// depois de gerar/regenerar o PDF — se o upload falhar, o contrato continua
// funcionando normalmente (o PDF é sempre regerável a partir do snapshot).
export async function salvarCaminhoOriginal(eventoId: string, path: string): Promise<Contrato> {
  const existente = await getContratoPorEvento(eventoId);
  if (!existente) throw new Error("Contrato não encontrado.");
  const { data, error } = await supabase
    .from("contracts")
    .update({ original_file_path: path })
    .eq("id", existente.id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function registrarAssinatura(
  eventoId: string,
  nomeArquivo: string,
  caminhoArquivo: string
): Promise<Contrato> {
  const existente = await getContratoPorEvento(eventoId);
  if (!existente) throw new Error("Contrato não encontrado.");

  const { data, error } = await supabase
    .from("contracts")
    .update({
      status: "assinado",
      signed_file_name: nomeArquivo,
      signed_file_path: caminhoArquivo,
      signed_at: new Date().toISOString()
    })
    .eq("id", existente.id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function removerAssinatura(eventoId: string): Promise<Contrato> {
  const existente = await getContratoPorEvento(eventoId);
  if (!existente) throw new Error("Contrato não encontrado.");

  const { data, error } = await supabase
    .from("contracts")
    .update({
      status: "gerado",
      signed_file_name: null,
      signed_file_path: null,
      signed_at: null
    })
    .eq("id", existente.id)
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

// Usado apenas pela exportação de backup (Configurações).
export async function listContratos(): Promise<Contrato[]> {
  const { data, error } = await supabase.from("contracts").select("*");
  if (error) throw error;
  return (data ?? []).map(fromRow);
}
