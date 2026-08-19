import { montarDocDefinition, type DadosGeracaoContrato } from "./contratoPdf";

// pdfmake é carregado sob demanda (só quando o usuário realmente gera/visualiza
// um contrato) para não pesar o carregamento inicial do app.
//
// IMPORTANTE (causa raiz do bug "Não foi possível carregar as fontes do
// PDF."): a etapa anterior tentava obter as fontes Roboto importando
// "pdfmake/build/vfs_fonts", um arquivo legado (CommonJS/UMD) da própria
// biblioteca. O formato exportado por esse arquivo não é estável entre
// bundlers/versões, e no build de produção do Vite (diferente do modo dev)
// ele resultava num objeto vazio — por isso o erro só aparecia no site
// publicado, nunca em teste local.
//
// A correção definitiva: usar o carregamento de fontes "via URL", recurso
// oficial do pdfmake (documentado desde a versão 0.1.66). Em vez de embutir
// as fontes no bundle, o pdfmake baixa os arquivos .ttf por HTTP na hora de
// gerar o PDF. Isso elimina por completo a dependência do módulo problemático.
const FONTES_PADRAO = {
  Roboto: {
    normal: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.3.3/fonts/Roboto/Roboto-Regular.ttf",
    bold: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.3.3/fonts/Roboto/Roboto-Medium.ttf",
    italics: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.3.3/fonts/Roboto/Roboto-Italic.ttf",
    bolditalics: "https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.3.3/fonts/Roboto/Roboto-MediumItalic.ttf"
  }
};

let cache: any | null = null;

async function carregarPdfMake(): Promise<any> {
  if (cache) return cache;

  let pdfMakeModule: unknown;
  try {
    pdfMakeModule = await import("pdfmake/build/pdfmake");
  } catch (error) {
    console.error("[PDF][LOAD_LIBRARY]", error);
    throw new Error("Não foi possível carregar a biblioteca de geração de PDF.");
  }

  const pdfMake = (pdfMakeModule as any)?.default ?? pdfMakeModule;
  if (!pdfMake || typeof pdfMake.createPdf !== "function") {
    console.error("[PDF][LOAD_LIBRARY]", "módulo pdfmake carregado em formato inesperado", pdfMakeModule);
    throw new Error("Não foi possível carregar a biblioteca de geração de PDF.");
  }

  cache = pdfMake;
  return cache;
}

export async function gerarContratoPdfBlob(dados: DadosGeracaoContrato): Promise<Blob> {
  const pdfMake = await carregarPdfMake();

  let docDefinition: ReturnType<typeof montarDocDefinition>;
  try {
    docDefinition = montarDocDefinition(dados);
  } catch (error) {
    console.error("[PDF][BUILD_DOCUMENT]", error);
    throw new Error("Não foi possível montar o conteúdo do contrato.");
  }

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
      // 3º argumento "fonts": passa a configuração de fontes por URL direto
      // nesta chamada (em vez de depender de "pdfMake.vfs" setado global).
      // O pdfmake baixa os .ttf sozinho na hora de montar o PDF.
      pdfMake
        .createPdf(docDefinition, undefined, FONTES_PADRAO)
        .getBlob((blobGerado: Blob) => {
          finalizar(() => resolve(blobGerado));
        });
    } catch (error) {
      console.error("[PDF][GENERATE_BLOB]", error);
      finalizar(() => reject(error));
    }
  });

  if (!(blob instanceof Blob) || blob.size === 0) {
    console.error("[PDF][VALIDATE_BLOB]", {
      instanciaValida: blob instanceof Blob,
      tamanho: (blob as Blob | undefined)?.size
    });
    throw new Error("O PDF gerado está vazio ou corrompido.");
  }

  if (blob.type && blob.type !== "application/pdf") {
    console.error("[PDF][VALIDATE_BLOB]", "MIME inesperado", blob.type);
  }

  console.log("[PDF][GENERATE_BLOB] OK", { size: blob.size, type: blob.type });

  return blob;
}
