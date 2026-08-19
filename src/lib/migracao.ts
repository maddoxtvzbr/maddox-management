import { supabase } from "./supabaseClient";
import { lerArquivo } from "./fileStore";
import { enviarContratoAssinado } from "./storageSupabase";
import * as legacy from "./legacyLocalStore";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// IDs antigos gerados sem crypto.randomUUID (fallback) não são UUID válidos
// para as colunas uuid do Postgres. Quando isso acontece, geramos um UUID
// novo e guardamos o mapeamento para corrigir todas as referências que
// apontam para aquele registro (ex: parcela.eventoId).
function garantirUuid(id: string, mapa: Map<string, string>): string {
  if (UUID_RE.test(id)) return id;
  const existente = mapa.get(id);
  if (existente) return existente;
  const novo = crypto.randomUUID();
  mapa.set(id, novo);
  return novo;
}

function resolverId(id: string, mapa: Map<string, string>): string {
  return mapa.get(id) ?? id;
}

export interface ResultadoMigracao {
  sucesso: boolean;
  mensagem: string;
}

export function existemDadosLocaisPendentes(): boolean {
  return legacy.existemDadosLocais();
}

export function migracaoJaFoiFeita(): boolean {
  return localStorage.getItem("maddox:migracao-concluida") === "1";
}

// Idempotente: usa upsert por id em todas as tabelas, então rodar de novo
// (inclusive após uma falha no meio do caminho) nunca duplica registros.
export async function migrarDadosLocais(): Promise<ResultadoMigracao> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (userError || !userId) {
    return { sucesso: false, mensagem: "Você precisa estar logado para migrar os dados." };
  }

  const mapaOrcamentos = new Map<string, string>();
  const mapaEventos = new Map<string, string>();
  const mapaParcelas = new Map<string, string>();
  const mapaContratos = new Map<string, string>();

  try {
    const orcamentos = legacy.lerOrcamentosLocais();
    const eventos = legacy.lerEventosLocais();
    const parcelas = legacy.lerParcelasLocais();
    const pagamentos = legacy.lerPagamentosLocais();
    const despesas = legacy.lerDespesasLocais();
    const contratos = legacy.lerContratosLocais();

    // 1) quotes (sem event_id ainda — resolvido no passo 7, depois que
    //    "events" existir no Supabase e tivermos o mapeamento de ids)
    if (orcamentos.length) {
      const rows = orcamentos.map((o) => ({
        id: garantirUuid(o.id, mapaOrcamentos),
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
        created_at: o.criadoEm,
        updated_at: o.atualizadoEm
      }));
      const { error } = await supabase.from("quotes").upsert(rows, { onConflict: "id" });
      if (error) throw error;
    }

    // 2) events
    if (eventos.length) {
      const rows = eventos.map((e) => ({
        id: garantirUuid(e.id, mapaEventos),
        user_id: userId,
        quote_id: e.quoteId ? resolverId(e.quoteId, mapaOrcamentos) : null,
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

    // 3) installments
    if (parcelas.length) {
      const rows = parcelas.map((p) => ({
        id: garantirUuid(p.id, mapaParcelas),
        user_id: userId,
        event_id: resolverId(p.eventoId, mapaEventos),
        description: p.descricao,
        amount: p.valor,
        due_date: p.vencimento,
        created_at: p.createdAt,
        updated_at: p.updatedAt
      }));
      const { error } = await supabase.from("installments").upsert(rows, { onConflict: "id" });
      if (error) throw error;
    }

    // 4) payments
    if (pagamentos.length) {
      const mapaPagamentos = new Map<string, string>();
      const rows = pagamentos.map((p) => ({
        id: garantirUuid(p.id, mapaPagamentos),
        user_id: userId,
        event_id: resolverId(p.eventoId, mapaEventos),
        installment_id: resolverId(p.parcelaId, mapaParcelas),
        amount: p.valor,
        payment_date: p.dataPagamento,
        payment_method: p.formaPagamento,
        notes: p.observacoes || null,
        created_at: p.createdAt
      }));
      const { error } = await supabase.from("payments").upsert(rows, { onConflict: "id" });
      if (error) throw error;
    }

    // 5) expenses
    if (despesas.length) {
      const mapaDespesas = new Map<string, string>();
      const rows = despesas.map((d) => ({
        id: garantirUuid(d.id, mapaDespesas),
        user_id: userId,
        event_id: resolverId(d.eventoId, mapaEventos),
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

    // 6) contracts — metadados primeiro; o PDF assinado (se existir no
    //    IndexedDB deste aparelho) é enviado ao Storage em seguida, de
    //    forma best-effort (não interrompe a migração se falhar).
    if (contratos.length) {
      const rows = contratos.map((c) => ({
        id: garantirUuid(c.id, mapaContratos),
        user_id: userId,
        event_id: resolverId(c.eventoId, mapaEventos),
        contract_number: c.numero,
        status: c.status,
        image_authorization: c.autorizaImagem,
        forum: c.foro,
        snapshot: c.snapshot,
        generated_at: c.geradoEm,
        signed_at: c.assinadoImportadoEm || null,
        signed_file_name: c.assinadoArquivoNome || null,
        created_at: c.geradoEm,
        updated_at: c.atualizadoEm
      }));
      const { error } = await supabase.from("contracts").upsert(rows, { onConflict: "id" });
      if (error) throw error;

      for (const c of contratos) {
        if (c.status !== "assinado") continue;
        try {
          const blob = await lerArquivo(c.id);
          if (!blob) continue;
          const novoContratoId = resolverId(c.id, mapaContratos);
          const novoEventoId = resolverId(c.eventoId, mapaEventos);
          const path = await enviarContratoAssinado(novoEventoId, novoContratoId, blob);
          await supabase.from("contracts").update({ signed_file_path: path }).eq("id", novoContratoId);
        } catch (err) {
          console.error("[migracao] Falha ao enviar PDF assinado local", err);
        }
      }
    }

    // 7) agora que "events" existe no Supabase, resolve quotes.event_id
    const orcamentosComEvento = orcamentos.filter((o) => o.eventId);
    for (const o of orcamentosComEvento) {
      const quoteId = resolverId(o.id, mapaOrcamentos);
      const eventId = resolverId(o.eventId as string, mapaEventos);
      const { error } = await supabase.from("quotes").update({ event_id: eventId }).eq("id", quoteId);
      if (error) throw error;
    }

    localStorage.setItem("maddox:migracao-concluida", "1");
    return { sucesso: true, mensagem: "Migração concluída com sucesso." };
  } catch (error) {
    console.error("[migracao] Falha na migração", error);
    return {
      sucesso: false,
      mensagem: "Não foi possível concluir a migração. Verifique sua conexão e tente novamente."
    };
  }
}
