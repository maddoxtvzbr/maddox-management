import { montarDocDefinition, type DadosGeracaoContrato } from "./contratoPdf";

// pdfmake é carregado sob demanda (só quando o usuário realmente gera/visualiza
// um contrato) para não pesar o carregamento inicial do app. O pacote de fontes
// (vfs_fonts) já vem embutido com acentuação/caracteres latinos (necessário
// para o português). O formato exato do módulo de fontes varia um pouco entre
// versões do pdfmake — por isso a checagem defensiva abaixo cobre os formatos
// mais comuns.
let pdfMakeInstance: any = null;

async function carregarPdfMake(): Promise<any> {
  if (pdfMakeInstance) return pdfMakeInstance;

  const [pdfMakeModule, pdfFontsModule] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts")
  ]);

  const pdfMake = (pdfMakeModule as any).default ?? pdfMakeModule;
  const fonts = pdfFontsModule as any;

  const vfs =
    fonts?.vfs ??
    fonts?.default?.vfs ??
    fonts?.pdfMake?.vfs ??
    fonts?.default?.pdfMake?.vfs;

  if (vfs) {
    pdfMake.vfs = vfs;
  }

  pdfMakeInstance = pdfMake;
  return pdfMake;
}

export async function gerarContratoPdfBlob(dados: DadosGeracaoContrato): Promise<Blob> {
  const pdfMake = await carregarPdfMake();
  const docDefinition = montarDocDefinition(dados);

  const blob = await new Promise<Blob>((resolve, reject) => {
    // getBlob só tem callback de sucesso — se o pdfmake falhar internamente
    // sem lançar uma exceção síncrona, a Promise nunca resolveria nem
    // rejeitaria, travando para sempre quem estiver esperando. Este timeout
    // garante que a Promise SEMPRE se resolve de um jeito ou de outro.
    const tempoLimite = setTimeout(() => {
      reject(new Error("Tempo esgotado ao gerar o PDF do contrato."));
    }, 20000);

    function finalizar(fn: () => void) {
      clearTimeout(tempoLimite);
      fn();
    }

    try {
      pdfMake.createPdf(docDefinition).getBlob((blobGerado: Blob) => {
        finalizar(() => resolve(blobGerado));
      });
    } catch (error) {
      finalizar(() => reject(error));
    }
  });

  if (!blob || blob.size === 0) {
    throw new Error("O PDF gerado está vazio ou corrompido.");
  }

  // eslint-disable-next-line no-console
  console.log("[PDF] PDF_GENERATED", { size: blob.size, type: blob.type });

  return blob;
}
