import { ChevronRight } from "lucide-react";
import type { Orcamento } from "../../types";
import { formatCurrencyBRL, formatDateShort } from "../../lib/format";

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

interface OrcamentoCardProps {
  orcamento: Orcamento;
  onClick: () => void;
}

export default function OrcamentoCard({ orcamento, onClick }: OrcamentoCardProps) {
  return (
    <button type="button" className="card orcamento-item" onClick={onClick}>
      <div className="orcamento-top">
        <p className="orcamento-nome">{orcamento.nomeCliente}</p>
        <span className={`status-pill ${statusClass[orcamento.status]}`}>
          {statusLabel[orcamento.status]}
        </span>
      </div>
      <p className="orcamento-sub">
        {orcamento.tipoEvento} • {formatDateShort(orcamento.data)}
      </p>
      <p className="orcamento-sub">{orcamento.cidade}</p>
      <div className="orcamento-bottom">
        <p className="orcamento-valor">{formatCurrencyBRL(orcamento.valor)}</p>
        <ChevronRight size={18} strokeWidth={1.8} className="orcamento-chevron" />
      </div>
    </button>
  );
}
