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

  return new Promise((resolve, reject) => {
    try {
      pdfMake.createPdf(docDefinition).getBlob((blob: Blob) => resolve(blob));
    } catch (error) {
      reject(error);
    }
  });
}
