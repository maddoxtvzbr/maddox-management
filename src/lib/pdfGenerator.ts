import { montarDocDefinition, type DadosGeracaoContrato } from "./contratoPdf";

// pdfmake é carregado sob demanda (só quando o usuário realmente gera/visualiza
// um contrato) para não pesar o carregamento inicial do app.
//
// IMPORTANTE (causa do bug corrigido nesta etapa): depender só de
// "pdfMake.vfs = ..." como efeito global é frágil em builds via Vite — o
// formato exato do módulo "pdfmake/build/vfs_fonts" varia entre versões, e
// se nenhum dos formatos testados bater, o vfs ficava vazio SEM avisar
// ninguém, e a geração do PDF falhava sempre (para qualquer contrato), pois
// a fonte "Roboto" não conseguia ser encontrada.
//
// A correção: 1) se o vfs não puder ser resolvido, falha alto e claro em vez
// de silenciosamente seguir em frente; 2) em vez de confiar só na atribuição
// global, passamos "fonts" e "vfs" diretamente em cada chamada de
// createPdf() — assinatura oficial createPdf(doc, tableLayouts, fonts, vfs),
// que é a forma mais robusta em bundlers como o Vite.

const FONTES_PADRAO = {
  Roboto: {
    normal: "Roboto-Regular.ttf",
    bold: "Roboto-Medium.ttf",
    italics: "Roboto-Italic.ttf",
    bolditalics: "Roboto-MediumItalic.ttf"
  }
};

interface PdfMakeCarregado {
  pdfMake: any;
  vfs: Record<string, string>;
}

let cache: PdfMakeCarregado | null = null;

async function carregarPdfMake(): Promise<PdfMakeCarregado> {
  if (cache) return cache;

  let pdfMakeModule: unknown;
  let pdfFontsModule: unknown;
  try {
    [pdfMakeModule, pdfFontsModule] = await Promise.all([
      import("pdfmake/build/pdfmake"),
      import("pdfmake/build/vfs_fonts")
    ]);
  } catch (error) {
    console.error("[PDF][LOAD_LIBRARY]", error);
    throw new Error("Não foi possível carregar a biblioteca de geração de PDF.");
  }

  const pdfMake = (pdfMakeModule as any)?.default ?? pdfMakeModule;
  const fonts = pdfFontsModule as any;

  const vfs =
    fonts?.vfs ??
    fonts?.default?.vfs ??
    fonts?.pdfMake?.vfs ??
    fonts?.default?.pdfMake?.vfs;

  if (!vfs || typeof vfs !== "object" || Object.keys(vfs).length === 0) {
    // Este é o ponto exato que antes falhava silenciosamente. Agora falha
    // alto, com contexto suficiente no console para diagnosticar.
    console.error("[PDF][VFS_FONTS]", "vfs de fontes vazio ou em formato inesperado", {
      chavesDoModuloDeFontes: fonts ? Object.keys(fonts) : null
    });
    throw new Error("Não foi possível carregar as fontes do PDF.");
  }

  // Mantém a atribuição global também, por compatibilidade — mas a geração
  // em si não depende mais só dela (ver createPdf abaixo).
  pdfMake.vfs = vfs;

  cache = { pdfMake, vfs };
  return cache;
}

export async function gerarContratoPdfBlob(dados: DadosGeracaoContrato): Promise<Blob> {
  const { pdfMake, vfs } = await carregarPdfMake();

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
      // 4 argumentos: docDefinition, tableLayouts (não usamos), fonts, vfs.
      // Passar fonts/vfs explicitamente aqui é mais confiável do que confiar
      // apenas em "pdfMake.vfs" ter sido setado globalmente.
      pdfMake
        .createPdf(docDefinition, undefined, FONTES_PADRAO, vfs)
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
