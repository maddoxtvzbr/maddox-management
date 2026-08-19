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
  // eslint-disable-next-line no-console
  console.log("[PDF] PDF_UPLOAD_START", { path, size: blob.size });
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: "application/pdf",
    upsert: true
  });
  if (error) {
    console.error("[PDF] Falha no upload do PDF original", error);
    throw error;
  }
  // eslint-disable-next-line no-console
  console.log("[PDF] PDF_UPLOAD_OK", { path });
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
  // eslint-disable-next-line no-console
  console.log("[PDF] PDF_DOWNLOAD_START", { path });
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) {
    console.error("[PDF] Falha ao baixar arquivo do Storage", error);
    throw error;
  }
  if (!data || data.size === 0) {
    throw new Error("Arquivo baixado está vazio.");
  }
  // eslint-disable-next-line no-console
  console.log("[PDF] PDF_DOWNLOAD_OK", { path, size: data.size });
  return data;
}
