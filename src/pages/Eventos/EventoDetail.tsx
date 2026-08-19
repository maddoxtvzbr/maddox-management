import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Pencil,
  Plus,
  Trash2
} from "lucide-react";
import type { Evento, Parcela, Pagamento, Despesa, Contrato } from "../../types";
import { getEvento, listParcelasPorEvento } from "../../data/eventosRepository";
import { listPagamentosPorEvento, excluirPagamento } from "../../data/pagamentosRepository";
import { listDespesasPorEvento } from "../../data/despesasRepository";
import { getResumoEvento } from "../../data/financeiroRepository";
import { getContratoPorEvento } from "../../data/contratosRepository";
import {
  somaPagamentosDaParcela,
  saldoRestanteParcela,
  calcularStatusParcela
} from "../../lib/financeiro";
import type { ResumoEvento } from "../../lib/financeiro";
import { formatCurrencyBRL, formatDateShort } from "../../lib/format";
import EventoEditForm from "./EventoEditForm";
import RegistrarPagamentoForm from "./RegistrarPagamentoForm";
import DespesaForm from "./DespesaForm";
import ContratoSection from "./ContratoSection";
import ContratoRevisar from "./ContratoRevisar";
import ContratoImportar from "./ContratoImportar";
import ConfirmSheet from "../../components/ConfirmSheet";
import "./Eventos.css";
import "../Financeiro.css";
import "../Orcamentos/Orcamentos.css";

const parcelaStatusLabel = {
  a_receber: "A receber",
  pago: "Pago",
  vencido: "Vencido"
} as const;

const parcelaStatusClass = {
  a_receber: "pendente",
  pago: "fechado",
  vencido: "naofechou"
} as const;

interface EventoDetailProps {
  eventoId: string;
  onBack: () => void;
  onIrParaConfiguracoes: () => void;
}

type SubView =
  | { name: "detail" }
  | { name: "editEvento" }
  | { name: "pagamento"; parcela: Parcela }
  | { name: "despesaNova" }
  | { name: "despesaEditar"; despesa: Despesa }
  | { name: "contratoRevisar" }
  | { name: "contratoImportar" };

export default function EventoDetail({ eventoId, onBack, onIrParaConfiguracoes }: EventoDetailProps) {
  const [evento, setEvento] = useState<Evento | null>(null);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [resumo, setResumo] = useState<ResumoEvento | null>(null);
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sub, setSub] = useState<SubView>({ name: "detail" });
  const [confirmExcluirPagamentoId, setConfirmExcluirPagamentoId] = useState<string | null>(null);
  const [excluindoPagamento, setExcluindoPagamento] = useState(false);

  const reload = useCallback(async () => {
    setErro(null);
    try {
      const ev = await getEvento(eventoId);
      if (!ev) {
        setEvento(null);
        return;
      }
      const [ps, pg, ds, rs, ct] = await Promise.all([
        listParcelasPorEvento(eventoId),
        listPagamentosPorEvento(eventoId),
        listDespesasPorEvento(eventoId),
        getResumoEvento(ev),
        getContratoPorEvento(eventoId)
      ]);
      setEvento(ev);
      setParcelas(ps);
      setPagamentos(pg);
      setDespesas(ds);
      setResumo(rs);
      setContrato(ct);
    } catch {
      setErro("Não foi possível carregar seus dados. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [eventoId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleExcluirPagamento() {
    if (!confirmExcluirPagamentoId || excluindoPagamento) return;
    setExcluindoPagamento(true);
    try {
      await excluirPagamento(confirmExcluirPagamentoId);
      await reload();
    } finally {
      setExcluindoPagamento(false);
      setConfirmExcluirPagamentoId(null);
    }
  }

  if (loading) {
    return (
      <div className="orc-form-screen">
        <header className="orc-form-header">
          <button type="button" className="icon-btn" onClick={onBack} aria-label="Voltar">
            <ChevronLeft size={22} strokeWidth={2} />
          </button>
          <h1>Evento</h1>
          <span className="orc-form-header-spacer" />
        </header>
      </div>
    );
  }

  if (!evento || !resumo) {
    return (
      <div className="orc-form-screen">
        <header className="orc-form-header">
          <button type="button" className="icon-btn" onClick={onBack} aria-label="Voltar">
            <ChevronLeft size={22} strokeWidth={2} />
          </button>
          <h1>Evento</h1>
          <span className="orc-form-header-spacer" />
        </header>
        {erro ? (
          <div className="empty-state">
            <p className="empty-title">Não foi possível carregar</p>
            <p className="empty-sub">{erro}</p>
            <button className="btn-primary empty-cta" onClick={reload}>
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="empty-state">
            <p className="empty-title">Evento não encontrado</p>
          </div>
        )}
      </div>
    );
  }

  if (sub.name === "editEvento") {
    return (
      <EventoEditForm
        evento={evento}
        onCancel={() => setSub({ name: "detail" })}
        onSaved={async () => {
          await reload();
          setSub({ name: "detail" });
        }}
      />
    );
  }

  if (sub.name === "pagamento") {
    const totalPago = somaPagamentosDaParcela(sub.parcela.id, pagamentos);
    const saldo = saldoRestanteParcela(sub.parcela, totalPago);
    return (
      <RegistrarPagamentoForm
        eventoId={evento.id}
        parcela={sub.parcela}
        saldoRestante={saldo}
        onCancel={() => setSub({ name: "detail" })}
        onSaved={async () => {
          await reload();
          setSub({ name: "detail" });
        }}
      />
    );
  }

  if (sub.name === "despesaNova") {
    return (
      <DespesaForm
        eventoId={evento.id}
        onCancel={() => setSub({ name: "detail" })}
        onSaved={async () => {
          await reload();
          setSub({ name: "detail" });
        }}
      />
    );
  }

  if (sub.name === "despesaEditar") {
    return (
      <DespesaForm
        eventoId={evento.id}
        existente={sub.despesa}
        onCancel={() => setSub({ name: "detail" })}
        onSaved={async () => {
          await reload();
          setSub({ name: "detail" });
        }}
        onExcluida={async () => {
          await reload();
          setSub({ name: "detail" });
        }}
      />
    );
  }

  if (sub.name === "contratoRevisar") {
    return (
      <ContratoRevisar
        evento={evento}
        parcelas={parcelas}
        contratoExistente={contrato}
        onCancel={() => setSub({ name: "detail" })}
        onGerado={async () => {
          await reload();
          setSub({ name: "detail" });
        }}
        onIrParaConfiguracoes={onIrParaConfiguracoes}
      />
    );
  }

  if (sub.name === "contratoImportar") {
    if (!contrato) {
      return (
        <div className="orc-form-screen">
          <header className="orc-form-header">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setSub({ name: "detail" })}
              aria-label="Voltar"
            >
              <ChevronLeft size={22} strokeWidth={2} />
            </button>
            <h1>Importar assinado</h1>
            <span className="orc-form-header-spacer" />
          </header>
          <div className="empty-state">
            <p className="empty-title">Gere o contrato antes de importar o assinado</p>
          </div>
        </div>
      );
    }
    return (
      <ContratoImportar
        eventoId={evento.id}
        contrato={contrato}
        onCancel={() => setSub({ name: "detail" })}
        onImportado={async () => {
          await reload();
          setSub({ name: "detail" });
        }}
      />
    );
  }

  return (
    <div className="orc-form-screen">
      <header className="orc-form-header">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Voltar">
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <h1>Evento</h1>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setSub({ name: "editEvento" })}
          aria-label="Editar evento"
        >
          <Pencil size={18} strokeWidth={1.9} />
        </button>
      </header>

      <div className="orc-form-scroll">
        <section className="detail-hero card">
          <span className="status-pill fechado">Confirmado</span>
          <h2 className="detail-nome">{evento.cliente}</h2>
          <p className="detail-tipo">
            {evento.tipoEvento} • {formatDateShort(evento.data)}
            {evento.horario ? ` • ${evento.horario}` : ""}
          </p>
          <p className="detail-valor">{formatCurrencyBRL(evento.valorContratado)}</p>
        </section>

        <section className="detail-info card">
          <div className="detail-row">
            <Phone size={17} strokeWidth={1.8} />
            <div className="detail-row-text">
              <p className="detail-row-label">Telefone</p>
              <p className="detail-row-value">{evento.telefone}</p>
            </div>
          </div>

          <div className="detail-row">
            <MapPin size={17} strokeWidth={1.8} />
            <div className="detail-row-text">
              <p className="detail-row-label">Local</p>
              <p className="detail-row-value">
                {evento.local ? `${evento.local} — ` : ""}
                {evento.cidade}
              </p>
            </div>
          </div>

          <div className="detail-row">
            <Calendar size={17} strokeWidth={1.8} />
            <div className="detail-row-text">
              <p className="detail-row-label">Data</p>
              <p className="detail-row-value">{formatDateShort(evento.data)}</p>
            </div>
          </div>

          {evento.horario && (
            <div className="detail-row">
              <Clock size={17} strokeWidth={1.8} />
              <div className="detail-row-text">
                <p className="detail-row-label">Horário</p>
                <p className="detail-row-value">{evento.horario}</p>
              </div>
            </div>
          )}
        </section>

        <section className="section-block">
          <p className="section-title">Financeiro</p>
          <div className="fin-grid">
            <div className="card fin-item">
              <p className="fin-label">Contratado</p>
              <p className="fin-value">{formatCurrencyBRL(resumo.contratado)}</p>
            </div>
            <div className="card fin-item">
              <p className="fin-label">Recebido</p>
              <p className="fin-value">{formatCurrencyBRL(resumo.recebido)}</p>
            </div>
            <div className="card fin-item">
              <p className="fin-label">A receber</p>
              <p className="fin-value">{formatCurrencyBRL(resumo.aReceber)}</p>
            </div>
            <div className="card fin-item">
              <p className="fin-label">Despesas</p>
              <p className="fin-value">{formatCurrencyBRL(resumo.despesas)}</p>
            </div>
          </div>
          <div className="card resultado-card">
            <p className="fin-label">Resultado do evento</p>
            <p className="resultado-value">{formatCurrencyBRL(resumo.resultado)}</p>
          </div>
          <div className="card resultado-card">
            <p className="fin-label">Caixa líquido</p>
            <p className="resultado-value">{formatCurrencyBRL(resumo.caixaLiquido)}</p>
          </div>
        </section>

        <section className="section-block">
          <p className="section-title">Pagamentos</p>
          <div className="parcelas-list">
            {parcelas.map((parcela) => {
              const totalPago = somaPagamentosDaParcela(parcela.id, pagamentos);
              const saldo = saldoRestanteParcela(parcela, totalPago);
              const status = calcularStatusParcela(parcela, totalPago);
              return (
                <div className="card parcela-card" key={parcela.id}>
                  <div className="parcela-card-top">
                    <div>
                      <p className="parcela-desc">{parcela.descricao}</p>
                      <p className="parcela-venc">
                        Vencimento: {formatDateShort(parcela.vencimento)}
                      </p>
                    </div>
                    <span className={`status-pill ${parcelaStatusClass[status]}`}>
                      {parcelaStatusLabel[status]}
                    </span>
                  </div>

                  <div className="parcela-valores">
                    <div className="parcela-valor-item">
                      <span className="mini-stat-label">Total</span>
                      <span className="mini-stat-value">{formatCurrencyBRL(parcela.valor)}</span>
                    </div>
                    <div className="parcela-valor-item">
                      <span className="mini-stat-label">Recebido</span>
                      <span className="mini-stat-value">{formatCurrencyBRL(totalPago)}</span>
                    </div>
                    <div className="parcela-valor-item">
                      <span className="mini-stat-label">Saldo</span>
                      <span className="mini-stat-value">{formatCurrencyBRL(saldo)}</span>
                    </div>
                  </div>

                  {status !== "pago" && (
                    <button
                      type="button"
                      className="btn-secondary parcela-btn-pagar"
                      onClick={() => setSub({ name: "pagamento", parcela })}
                    >
                      Registrar pagamento
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="section-block">
          <p className="section-title">Pagamentos recebidos</p>
          {pagamentos.length === 0 ? (
            <div className="card mini-empty">
              <p className="mini-empty-text">Nenhum pagamento registrado</p>
            </div>
          ) : (
            <div className="historico-list">
              {[...pagamentos]
                .sort((a, b) => b.dataPagamento.localeCompare(a.dataPagamento))
                .map((pagamento) => (
                  <div className="card historico-item" key={pagamento.id}>
                    <div className="historico-info">
                      <p className="historico-data">{formatDateShort(pagamento.dataPagamento)}</p>
                      <p className="historico-forma">{pagamento.formaPagamento}</p>
                    </div>
                    <div className="historico-right">
                      <p className="historico-valor">{formatCurrencyBRL(pagamento.valor)}</p>
                      <button
                        type="button"
                        className="icon-btn-ghost"
                        onClick={() => setConfirmExcluirPagamentoId(pagamento.id)}
                        aria-label="Excluir pagamento"
                      >
                        <Trash2 size={15} strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </section>

        <section className="section-block">
          <div className="section-header-row">
            <p className="section-title">Despesas</p>
            <button
              type="button"
              className="fab-inline fab-small"
              aria-label="Nova despesa"
              onClick={() => setSub({ name: "despesaNova" })}
            >
              <Plus size={18} strokeWidth={2.2} />
            </button>
          </div>

          {despesas.length === 0 ? (
            <div className="card mini-empty">
              <p className="mini-empty-text">Nenhuma despesa registrada</p>
            </div>
          ) : (
            <div className="historico-list">
              {[...despesas]
                .sort((a, b) => b.data.localeCompare(a.data))
                .map((despesa) => (
                  <button
                    type="button"
                    className="card despesa-item"
                    key={despesa.id}
                    onClick={() => setSub({ name: "despesaEditar", despesa })}
                  >
                    <div className="historico-info">
                      <p className="historico-data">{despesa.descricao}</p>
                      <p className="historico-forma">
                        {despesa.categoria} • {formatDateShort(despesa.data)}
                      </p>
                    </div>
                    <p className="historico-valor">{formatCurrencyBRL(despesa.valor)}</p>
                  </button>
                ))}
            </div>
          )}
        </section>

        <section className="section-block">
          <p className="section-title">Contrato</p>
          <ContratoSection
            evento={evento}
            parcelas={parcelas}
            contrato={contrato}
            onEditarEvento={() => setSub({ name: "editEvento" })}
            onRevisar={() => setSub({ name: "contratoRevisar" })}
            onImportar={() => setSub({ name: "contratoImportar" })}
            onIrParaConfiguracoes={onIrParaConfiguracoes}
            onAtualizado={reload}
          />
        </section>
      </div>

      <ConfirmSheet
        open={!!confirmExcluirPagamentoId}
        title="Excluir este pagamento?"
        description="O valor recebido e o status da parcela serão recalculados."
        confirmLabel="Excluir"
        tone="negative"
        confirming={excluindoPagamento}
        onCancel={() => setConfirmExcluirPagamentoId(null)}
        onConfirm={handleExcluirPagamento}
      />
    </div>
  );
}
