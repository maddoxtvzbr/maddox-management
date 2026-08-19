import { supabase } from "./supabaseClient";
import { getEvento } from "../data/eventosRepository";
import { listPagamentosPorEvento } from "../data/pagamentosRepository";
import { listDespesasPorEvento } from "../data/despesasRepository";
import { getContratoPorEvento } from "../data/contratosRepository";
import { removerArquivo } from "./storageSupabase";

export interface VerificacaoExclusao {
  podeExcluir: boolean;
  motivo?: string;
}

const MOTIVO_BLOQUEIO =
  "Este evento possui movimentações ou documentos. Cancele o evento em vez de excluí-lo.";

// Um evento só pode ser excluído de verdade se não tiver nenhum rastro
// financeiro ou contratual real ainda — isso é o que diferencia "excluir"
// (para cadastro de teste/engano) de "cancelar" (para um evento real que não
// vai mais acontecer, mas cujo histórico precisa ser preservado).
export async function verificarPodeExcluirEvento(eventoId: string): Promise<VerificacaoExclusao> {
  const [pagamentos, despesas, contrato] = await Promise.all([
    listPagamentosPorEvento(eventoId),
    listDespesasPorEvento(eventoId),
    getContratoPorEvento(eventoId)
  ]);

  if (pagamentos.length > 0 || despesas.length > 0 || contrato?.status === "assinado") {
    return { podeExcluir: false, motivo: MOTIVO_BLOQUEIO };
  }

  return { podeExcluir: true };
}

// Exclusão definitiva, na ordem pedida: arquivos do Storage -> contrato ->
// parcelas -> evento -> desvincula (sem apagar) o orçamento de origem.
// Sempre reverifica as condições de bloqueio antes de excluir de fato —
// nunca confia apenas na checagem já feita na tela.
export async function excluirEventoDefinitivamente(eventoId: string): Promise<void> {
  const evento = await getEvento(eventoId);
  if (!evento) throw new Error("Evento não encontrado.");

  const verificacao = await verificarPodeExcluirEvento(eventoId);
  if (!verificacao.podeExcluir) {
    throw new Error(verificacao.motivo ?? MOTIVO_BLOQUEIO);
  }

  const contrato = await getContratoPorEvento(eventoId);

  // 1) Arquivos do Storage relacionados, se existirem (best-effort: um PDF
  //    que já não existe mais no bucket não deve impedir a exclusão).
  if (contrato?.originalFilePath) {
    await removerArquivo(contrato.originalFilePath).catch((erro) =>
      console.error("[EXCLUIR_EVENTO] Falha ao remover PDF original do Storage", erro)
    );
  }
  if (contrato?.assinadoArquivoCaminho) {
    await removerArquivo(contrato.assinadoArquivoCaminho).catch((erro) =>
      console.error("[EXCLUIR_EVENTO] Falha ao remover PDF assinado do Storage", erro)
    );
  }

  // 2) Contrato (metadados)
  if (contrato) {
    const { error } = await supabase.from("contracts").delete().eq("id", contrato.id);
    if (error) throw error;
  }

  // 3) Parcelas
  {
    const { error } = await supabase.from("installments").delete().eq("event_id", eventoId);
    if (error) throw error;
  }

  // 4) Evento
  {
    const { error } = await supabase.from("events").delete().eq("id", eventoId);
    if (error) throw error;
  }

  // 5) Orçamento de origem: remove só o vínculo, nunca o orçamento em si —
  //    ele continua no histórico e volta a mostrar "Completar fechamento".
  if (evento.quoteId) {
    const { error } = await supabase
      .from("quotes")
      .update({ event_id: null })
      .eq("id", evento.quoteId);
    if (error) throw error;
  }
}
