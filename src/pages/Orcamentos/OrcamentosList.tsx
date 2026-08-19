import { useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";
import type { Orcamento, OrcamentoStatus } from "../../types";
import OrcamentoCard from "./OrcamentoCard";

type Filtro = "todos" | OrcamentoStatus;

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "aberto", label: "Em aberto" },
  { id: "fechado", label: "Fechados" },
  { id: "nao_fechou", label: "Não fecharam" }
];

const STATUS_ORDER: Record<OrcamentoStatus, number> = {
  aberto: 0,
  fechado: 1,
  nao_fechou: 2
};

interface OrcamentosListProps {
  orcamentos: Orcamento[];
  loading: boolean;
  erro: string | null;
  onTentarNovamente: () => void;
  onNovo: () => void;
  onSelect: (id: string) => void;
}

export default function OrcamentosList({
  orcamentos,
  loading,
  erro,
  onTentarNovamente,
  onNovo,
  onSelect
}: OrcamentosListProps) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return orcamentos
      .filter((o) => filtro === "todos" || o.status === filtro)
      .filter((o) => {
        if (!termo) return true;
        return (
          o.nomeCliente.toLowerCase().includes(termo) ||
          o.telefone.toLowerCase().includes(termo) ||
          o.cidade.toLowerCase().includes(termo)
        );
      })
      .sort((a, b) => {
        const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (statusDiff !== 0) return statusDiff;
        return a.data.localeCompare(b.data);
      });
  }, [orcamentos, busca, filtro]);

  const semNenhum = !loading && !erro && orcamentos.length === 0;
  const semResultado = !loading && !erro && orcamentos.length > 0 && visiveis.length === 0;

  return (
    <div className="screen orcamentos-screen">
      <header className="page-header">
        <h1>Orçamentos</h1>
        <button className="fab-inline" aria-label="Novo orçamento" onClick={onNovo}>
          <Plus size={20} strokeWidth={2.2} />
        </button>
      </header>

      {erro && (
        <div className="empty-state">
          <p className="empty-title">Não foi possível carregar</p>
          <p className="empty-sub">{erro}</p>
          <button className="btn-primary empty-cta" onClick={onTentarNovamente}>
            Tentar novamente
          </button>
        </div>
      )}

      {!erro && !semNenhum && (
        <>
          <div className="search-field">
            <Search size={17} strokeWidth={1.8} />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, telefone ou cidade"
              enterKeyHint="search"
            />
          </div>

          <div className="filtro-row">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`filtro-chip ${filtro === f.id ? "is-active" : ""}`}
                onClick={() => setFiltro(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </>
      )}

      {semNenhum && (
        <div className="empty-state">
          <p className="empty-title">Nenhum orçamento ainda</p>
          <p className="empty-sub">Seus novos orçamentos aparecerão aqui.</p>
          <button className="btn-primary empty-cta" onClick={onNovo}>
            Criar primeiro orçamento
          </button>
        </div>
      )}

      {semResultado && (
        <div className="empty-state">
          <p className="empty-title">Nenhum orçamento encontrado</p>
          <p className="empty-sub">Tente ajustar a busca ou o filtro selecionado.</p>
        </div>
      )}

      {!erro && !semNenhum && !semResultado && (
        <div className="orcamentos-list">
          {visiveis.map((orc) => (
            <OrcamentoCard key={orc.id} orcamento={orc} onClick={() => onSelect(orc.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
