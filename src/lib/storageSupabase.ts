import { supabase } from "./supabaseClient";

const BUCKET = "contracts";

function caminhoOriginal(userId: string, eventoId: string, contratoId: string): string {
  return `${userId}/${eventoId}/original/${contratoId}.pdf`;
}

function caminhoAssinado(userId: string, eventoId: string, contratoId: string): string {
  return `${userId}/${eventoId}/signed/${contratoId}.pdf`;
}

async function usuarioAtualId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Usuário não autenticado.");
  return id;
}

// Envia o PDF original (regenerado a partir do snapshot) para o Storage.
// Sobrescreve a versão anterior no mesmo caminho — não cria arquivos soltos
// acumulando a cada regeneração.
export async function enviarContratoOriginal(
  eventoId: string,
  contratoId: string,
  blob: Blob
): Promise<string> {
  const userId = await usuarioAtualId();
  const path = caminhoOriginal(userId, eventoId, contratoId);
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: "application/pdf",
    upsert: true
  });
  if (error) throw error;
  return path;
}

export async function enviarContratoAssinado(
  eventoId: string,
  contratoId: string,
  arquivo: Blob
): Promise<string> {
  const userId = await usuarioAtualId();
  const path = caminhoAssinado(userId, eventoId, contratoId);
  const { error } = await supabase.storage.from(BUCKET).upload(path, arquivo, {
    contentType: "application/pdf",
    upsert: true
  });
  if (error) throw error;
  return path;
}

export async function removerArquivo(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

// O bucket é privado — nunca existe URL pública permanente. Toda vez que
// for preciso abrir/baixar/compartilhar, geramos uma URL assinada com
// validade curta.
export async function gerarUrlAssinada(path: string, segundosValidade = 300): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, segundosValidade);
  if (error) throw error;
  return data.signedUrl;
}

export async function baixarArquivoDoStorage(path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) throw error;
  return data;
}
