import type { Perfil, Orcamento, Evento, Parcela, Pagamento, Despesa, Contrato } from "../types";
import { supabase } from "./supabaseClient";
import { getPerfil, salvarPerfil } from "../data/perfilRepository";
import { listOrcamentos } from "../data/orcamentosRepository";
import { listEventos, listParcelas } from "../data/eventosRepository";
import { listPagamentos } from "../data/pagamentosRepository";
import { listDespesas } from "../data/despesasRepository";
import { listContratos } from "../data/contratosRepository";
import { baixarArquivo } from "./arquivo";
import { todayISO } from "./date";

export interface BackupData {
  versao: 1;
  exportadoEm: string;
  perfil: Perfil | null;
  orcamentos: Orcamento[];
  eventos: Evento[];
  parcelas: Parcela[];
  pagamentos: Pagamento[];
  despesas: Despesa[];
  contratos: Contrato[]; // apenas metadados — os PDFs não entram no backup
}

export async function montarBackup(): Promise<BackupData> {
  const [perfil, orcamentos, eventos, parcelas, pagamentos, despesas, contratos] =
    await Promise.all([
      getPerfil(),
      listOrcamentos(),
      listEventos(),
      listParcelas(),
      listPagamentos(),
      listDespesas(),
      listContratos()
    ]);

  return {
    versao: 1,
    exportadoEm: new Date().toISOString(),
    perfil,
    orcamentos,
    eventos,
    parcelas,
    pagamentos,
    despesas,
    contratos
  };
}

export async function exportarBackup(): Promise<void> {
  const backup = await montarBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  baixarArquivo(blob, `maddox-management-backup-${todayISO()}.json`);
}

export interface ResultadoImportacao {
  sucesso: boolean;
  mensagem: string;
}

async function usuarioAtualId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Usuário não autenticado.");
  return id;
}

// Restaura um backup exportado por este mesmo app. Os IDs do backup já são
// UUIDs reais do Supabase, então basta upsert por id — idempotente e seguro
// para rodar mais de uma vez.
//
// IMPORTANTE (relação circular quotes.event_id <-> events.quote_id):
// um orçamento fechado aponta para o evento que ele gerou, e o evento aponta
// de volta para o orçamento que o originou. Não dá para inserir os dois com
// esses vínculos já preenchidos ao mesmo tempo — o banco rejeitaria por
// violar a foreign key (o registro referenciado ainda não existiria). Por
// isso a restauração acontece em 4 fases:
//   Fase 1 — quotes SEM event_id
//   Fase 2 — events (quote_id já pode apontar para as quotes da fase 1)
//   Fase 3 — installments, payments, expenses, contracts
//   Fase 4 — atualiza quotes.event_id agora que os events já existem
export async function importarBackup(arquivo: File): Promise<ResultadoImportacao> {
  try {
    const texto = await arquivo.text();
    const backup = JSON.parse(texto) as Partial<BackupData>;

    if (!backup || !Array.isArray(backup.orcamentos) || !Array.isArray(backup.eventos)) {
      return { sucesso: false, mensagem: "Arquivo de backup inválido." };
    }

    const userId = await usuarioAtualId();

    if (backup.perfil) {
      await salvarPerfil({
        nomeArtistico: backup.perfil.nomeArtistico,
        nomeCompleto: backup.perfil.nomeCompleto,
        documento: backup.perfil.documento,
        telefone: backup.perfil.telefone,
        email: backup.perfil.email,
        cep: backup.perfil.cep,
        endereco: backup.perfil.endereco,
        numero: backup.perfil.numero,
        bairro: backup.perfil.bairro,
        cidade: backup.perfil.cidade,
        estado: backup.perfil.estado,
        foroPadrao: backup.perfil.foroPadrao
      });
    }

    // ---------- Fase 1: quotes SEM event_id ----------
    if (backup.orcamentos.length) {
      const rows = backup.orcamentos.map((o) => ({
        id: o.id,
        user_id: userId,
        client_name: o.nomeCliente,
        phone: o.telefone,
        event_type: o.tipoEvento,
        event_date: o.data,
        event_time: o.horario || null,
        city: o.cidade,
        venue: o.local || null,
        quoted_amount: o.valor,
        notes: o.observacoes || null,
        status: o.status,
        lost_reason: o.motivoNaoFechou || null,
        event_id: null, // resolvido na Fase 4, depois que "events" existir
        created_at: o.criadoEm,
        updated_at: o.atualizadoEm
      }));
      const { error } = await supabase.from("quotes").upsert(rows, { onConflict: "id" });
      if (error) throw error;
    }

    // ---------- Fase 2: events (quote_id já resolve, pois quotes existe) ----------
    if (backup.eventos.length) {
      const rows = backup.eventos.map((e) => ({
        id: e.id,
        user_id: userId,
        quote_id: e.quoteId,
        client_name: e.cliente,
        client_document: e.cpfCnpj,
        phone: e.telefone,
        email: e.email || null,
        client_address: e.endereco ?? null,
        event_type: e.tipoEvento,
        event_date: e.data,
        start_time: e.horario || null,
        end_time: e.horarioTermino || null,
        setup_time: e.horarioMontagem || null,
        city: e.cidade,
        venue: e.local || null,
        address: e.enderecoEvento || null,
        contracted_amount: e.valorContratado,
        original_amount: e.valorOrcamentoOriginal,
        payment_method: e.formaPagamento || null,
        notes: e.observacoes || null,
        status: "confirmado",
        created_at: e.createdAt,
        updated_at: e.updatedAt
      }));
      const { error } = await supabase.from("events").upsert(rows, { onConflict: "id" });
      if (error) throw error;
    }

    // ---------- Fase 3: installments, payments, expenses, contracts ----------
    if (backup.parcelas?.length) {
      const rows = backup.parcelas.map((p) => ({
        id: p.id,
        user_id: userId,
        event_id: p.eventoId,
        description: p.descricao,
        amount: p.valor,
        due_date: p.vencimento,
        created_at: p.createdAt,
        updated_at: p.updatedAt
      }));
      const { error } = await supabase.from("installments").upsert(rows, { onConflict: "id" });
      if (error) throw error;
    }

    if (backup.pagamentos?.length) {
      const rows = backup.pagamentos.map((p) => ({
        id: p.id,
        user_id: userId,
        event_id: p.eventoId,
        installment_id: p.parcelaId,
        amount: p.valor,
        payment_date: p.dataPagamento,
        payment_method: p.formaPagamento,
        notes: p.observacoes || null,
        created_at: p.createdAt
      }));
      const { error } = await supabase.from("payments").upsert(rows, { onConflict: "id" });
      if (error) throw error;
    }

    if (backup.despesas?.length) {
      const rows = backup.despesas.map((d) => ({
        id: d.id,
        user_id: userId,
        event_id: d.eventoId,
        description: d.descricao,
        category: d.categoria,
        amount: d.valor,
        expense_date: d.data,
        notes: d.observacoes || null,
        created_at: d.createdAt,
        updated_at: d.updatedAt
      }));
      const { error } = await supabase.from("expenses").upsert(rows, { onConflict: "id" });
      if (error) throw error;
    }

    if (backup.contratos?.length) {
      const rows = backup.contratos.map((c) => ({
        id: c.id,
        user_id: userId,
        event_id: c.eventoId,
        contract_number: c.numero,
        status: c.status,
        image_authorization: c.autorizaImagem,
        forum: c.foro,
        snapshot: c.snapshot,
        generated_at: c.geradoEm,
        signed_at: c.assinadoImportadoEm || null,
        original_file_path: c.originalFilePath || null,
        signed_file_path: c.assinadoArquivoCaminho || null,
        signed_file_name: c.assinadoArquivoNome || null,
        created_at: c.geradoEm,
        updated_at: c.atualizadoEm
      }));
      const { error } = await supabase.from("contracts").upsert(rows, { onConflict: "id" });
      if (error) throw error;
    }

    // ---------- Fase 4: agora sim, resolve quotes.event_id ----------
    const orcamentosComEvento = backup.orcamentos.filter((o) => o.eventId);
    for (const o of orcamentosComEvento) {
      const { error } = await supabase
        .from("quotes")
        .update({ event_id: o.eventId })
        .eq("id", o.id);
      if (error) throw error;
    }

    return { sucesso: true, mensagem: "Backup importado com sucesso." };
  } catch (error) {
    console.error("[backup] Falha ao importar", error);
    return {
      sucesso: false,
      mensagem: "Não foi possível importar o backup. Verifique o arquivo e sua conexão."
    };
  }
}
