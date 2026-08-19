import { useState } from "react";
import {
  ChevronLeft,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Pencil,
  MessageCircle,
  CheckCircle2
} from "lucide-react";
import type { Orcamento } from "../../types";
import { fecharOrcamento, marcarNaoFechou } from "../../data/orcamentosRepository";
import { formatCurrencyBRL, formatDateShort, buildWhatsAppLink } from "../../lib/format";
import ConfirmSheet from "../../components/ConfirmSheet";

const statusLabel: Record<Orcamento["status"], string> = {
  fechado: "Fechado",
  aberto: "Em aberto",
  nao_fechou: "Não fechou"
};

const statusClass: Record<Orcamento["status"], string> = {
  fechado: "fechado",
  aberto: "aberto",
  nao_fechou: "naofechou"
};

const MOTIVOS = [
  "Preço",
  "Contratou outro profissional",
  "Evento cancelado",
  "Sem retorno",
  "Mudança de planos",
  "Outro"
];

interface OrcamentoDetailProps {
  orcamento: Orcamento;
  onBack: () => void;
  onEditar: () => void;
  onAtualizado: () => Promise<void> | void;
  onCompletarFechamento: () => void;
  onVerEvento: (eventoId: string) => void;
}

export default function OrcamentoDetail({
  orcamento,
  onBack,
  onEditar,
  onAtualizado,
  onCompletarFechamento,
  onVerEvento
}: OrcamentoDetailProps) {
  const [confirmFechar, setConfirmFechar] = useState(false);
  const [confirmNaoFechou, setConfirmNaoFechou] = useState(false);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const whatsappLink = buildWhatsAppLink(orcamento.telefone);

  async function confirmarFechar() {
    if (saving) return; // evita duplo toque / status duplicado
    setSaving(true);
    try {
      await fecharOrcamento(orcamento.id);
      await onAtualizado();
    } finally {
      setSaving(false);
      setConfirmFechar(false);
    }
  }

  async function confirmarNaoFechou() {
    if (saving) return; // evita duplo toque / status duplicado
    setSaving(true);
    try {
      await marcarNaoFechou(orcamento.id, motivo ?? undefined);
      await onAtualizado();
    } finally {
      setSaving(false);
      setConfirmNaoFechou(false);
      setMotivo(null);
    }
  }

  return (
    <div className="orc-form-screen">
      <header className="orc-form-header">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Voltar">
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <h1>Orçamento</h1>
        <button type="button" className="icon-btn" onClick={onEditar} aria-label="Editar orçamento">
          <Pencil size={18} strokeWidth={1.9} />
        </button>
      </header>

      <div className="orc-form-scroll">
        <section className="detail-hero card">
          <span className={`status-pill ${statusClass[orcamento.status]}`}>
            {statusLabel[orcamento.status]}
          </span>
          {orcamento.status === "fechado" && orcamento.eventId && (
            <span className="evento-criado-tag">
              <CheckCircle2 size={13} strokeWidth={2} />
              Evento criado
            </span>
          )}
          <h2 className="detail-nome">{orcamento.nomeCliente}</h2>
          <p className="detail-tipo">
            {orcamento.tipoEvento} • {formatDateShort(orcamento.data)}
            {orcamento.horario ? ` • ${orcamento.horario}` : ""}
          </p>
          <p className="detail-valor">{formatCurrencyBRL(orcamento.valor)}</p>
        </section>

        <section className="detail-info card">
          <div className="detail-row">
            <Phone size={17} strokeWidth={1.8} />
            <div className="detail-row-text">
              <p className="detail-row-label">Telefone</p>
              <p className="detail-row-value">{orcamento.telefone}</p>
            </div>
            {whatsappLink && (
              <a className="whatsapp-btn" href={whatsappLink} target="_blank" rel="noreferrer">
                <MessageCircle size={15} strokeWidth={2} />
                WhatsApp
              </a>
            )}
          </div>

          <div className="detail-row">
            <MapPin size={17} strokeWidth={1.8} />
            <div className="detail-row-text">
              <p className="detail-row-label">Local</p>
              <p className="detail-row-value">
                {orcamento.local ? `${orcamento.local} — ` : ""}
                {orcamento.cidade}
              </p>
            </div>
          </div>

          <div className="detail-row">
            <Calendar size={17} strokeWidth={1.8} />
            <div className="detail-row-text">
              <p className="detail-row-label">Data</p>
              <p className="detail-row-value">{formatDateShort(orcamento.data)}</p>
            </div>
          </div>

          {orcamento.horario && (
            <div className="detail-row">
              <Clock size={17} strokeWidth={1.8} />
              <div className="detail-row-text">
                <p className="detail-row-label">Horário</p>
                <p className="detail-row-value">{orcamento.horario}</p>
              </div>
            </div>
          )}
        </section>

        {orcamento.observacoes && (
          <section className="card detail-obs">
            <p className="detail-row-label">Observações</p>
            <p className="detail-obs-text">{orcamento.observacoes}</p>
          </section>
        )}

        {orcamento.status === "nao_fechou" && orcamento.motivoNaoFechou && (
          <section className="card detail-obs">
            <p className="detail-row-label">Motivo</p>
            <p className="detail-obs-text">{orcamento.motivoNaoFechou}</p>
          </section>
        )}
      </div>

      {orcamento.status === "aberto" && (
        <div className="orc-form-footer detail-actions">
          <button
            type="button"
            className="btn-secondary tone-negative"
            onClick={() => setConfirmNaoFechou(true)}
          >
            Não fechou
          </button>
          <button type="button" className="btn-primary" onClick={() => setConfirmFechar(true)}>
            Fechar orçamento
          </button>
        </div>
      )}

      {orcamento.status === "fechado" && !orcamento.eventId && (
        <div className="orc-form-footer">
          <button type="button" className="btn-primary" onClick={onCompletarFechamento}>
            Completar fechamento
          </button>
        </div>
      )}

      {orcamento.status === "fechado" && orcamento.eventId && (
        <div className="orc-form-footer">
          <button
            type="button"
            className="btn-primary"
            onClick={() => onVerEvento(orcamento.eventId as string)}
          >
            Ver evento
          </button>
        </div>
      )}

      <ConfirmSheet
        open={confirmFechar}
        title="Fechar este orçamento?"
        description="Depois de fechado, você poderá completar os dados e confirmar o evento."
        confirmLabel="Confirmar fechamento"
        tone="positive"
        confirming={saving}
        onCancel={() => setConfirmFechar(false)}
        onConfirm={confirmarFechar}
      />

      <ConfirmSheet
        open={confirmNaoFechou}
        title="Marcar como não fechou?"
        description="O orçamento continua salvo no histórico."
        confirmLabel="Confirmar"
        tone="negative"
        confirming={saving}
        onCancel={() => {
          setConfirmNaoFechou(false);
          setMotivo(null);
        }}
        onConfirm={confirmarNaoFechou}
      >
        <div className="motivo-chips">
          {MOTIVOS.map((m) => (
            <button
              type="button"
              key={m}
              className={`motivo-chip ${motivo === m ? "is-selected" : ""}`}
              onClick={() => setMotivo(motivo === m ? null : m)}
            >
              {m}
            </button>
          ))}
        </div>
      </ConfirmSheet>
    </div>
  );
}
