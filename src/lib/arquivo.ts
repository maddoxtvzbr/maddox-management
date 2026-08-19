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

export type ResultadoCompartilhamento = "compartilhado" | "cancelado" | "indisponivel";

// Tenta abrir a folha de compartilhamento nativa (WhatsApp, e-mail, etc).
// Retorna "indisponivel" quando o navegador não suporta compartilhar
// arquivos — quem chamar deve então oferecer baixar/abrir como alternativa.
export async function compartilharArquivo(
  blob: Blob,
  nomeArquivo: string,
  titulo: string
): Promise<ResultadoCompartilhamento> {
  try {
    const file = new File([blob], nomeArquivo, { type: "application/pdf" });
    const nav = navigator as Navigator & {
      canShare?: (data: { files: File[] }) => boolean;
      share?: (data: { files: File[]; title?: string }) => Promise<void>;
    };

    if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title: titulo });
      return "compartilhado";
    }
    return "indisponivel";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "cancelado";
    }
    return "indisponivel";
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
