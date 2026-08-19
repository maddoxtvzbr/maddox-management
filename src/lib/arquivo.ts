// Ações relacionadas a arquivos gerados (o PDF do contrato): compartilhar
// via folha de compartilhamento nativa quando disponível, ou cair para
// download/abrir em nova aba quando não for (isso varia bastante entre
// Android, iOS/Safari e desktop).

export function sanitizarNomeArquivo(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export type ResultadoCompartilhamento = "compartilhado" | "cancelado" | "indisponivel" | "erro";

// Tenta abrir a folha de compartilhamento nativa (WhatsApp, e-mail, etc).
// - "indisponivel": navegador não suporta compartilhar arquivos (nada deu
//   errado, só não existe a API) — quem chamar deve cair para baixar/abrir
//   silenciosamente, sem mostrar mensagem de erro.
// - "cancelado": o próprio usuário fechou a folha de compartilhamento.
// - "erro": o compartilhamento foi tentado e falhou de verdade — quem
//   chamar deve avisar o usuário E oferecer baixar/abrir como alternativa.
export async function compartilharArquivo(
  blob: Blob,
  nomeArquivo: string,
  titulo: string,
  texto?: string
): Promise<ResultadoCompartilhamento> {
  const file = new File([blob], nomeArquivo, { type: "application/pdf" });
  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
    share?: (data: { files: File[]; title?: string; text?: string }) => Promise<void>;
  };

  if (!nav.canShare || !nav.share || !nav.canShare({ files: [file] })) {
    return "indisponivel";
  }

  try {
    await nav.share({ files: [file], title: titulo, text: texto });
    return "compartilhado";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "cancelado";
    }
    return "erro";
  }
}

export function baixarArquivo(blob: Blob, nomeArquivo: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function abrirArquivoEmNovaAba(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
