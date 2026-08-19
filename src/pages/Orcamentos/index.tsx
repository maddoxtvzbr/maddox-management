import { useCallback, useEffect, useState } from "react";
import type { Orcamento } from "../../types";
import { listOrcamentos } from "../../data/orcamentosRepository";
import OrcamentosList from "./OrcamentosList";
import OrcamentoForm from "./OrcamentoForm";
import OrcamentoDetail from "./OrcamentoDetail";
import FechamentoForm from "./FechamentoForm";
import "./Orcamentos.css";

type View =
  | { name: "list" }
  | { name: "new" }
  | { name: "edit"; id: string }
  | { name: "detail"; id: string }
  | { name: "fechamento"; id: string };

interface OrcamentosProps {
  onOpenEvento: (eventoId: string) => void;
}

export default function Orcamentos({ onOpenEvento }: OrcamentosProps) {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [view, setView] = useState<View>({ name: "list" });

  const reload = useCallback(async () => {
    setErro(null);
    try {
      const all = await listOrcamentos();
      setOrcamentos(all);
    } catch {
      setErro("Não foi possível carregar seus dados. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  if (view.name === "list") {
    return (
      <OrcamentosList
        orcamentos={orcamentos}
        loading={loading}
        erro={erro}
        onTentarNovamente={reload}
        onNovo={() => setView({ name: "new" })}
        onSelect={(id) => setView({ name: "detail", id })}
      />
    );
  }

  if (view.name === "new") {
    return (
      <div className="orc-overlay">
        <OrcamentoForm
          modo="novo"
          onCancel={() => setView({ name: "list" })}
          onSaved={async () => {
            await reload();
            setView({ name: "list" });
          }}
        />
      </div>
    );
  }

  if (view.name === "edit") {
    const existente = orcamentos.find((o) => o.id === view.id);
    if (!existente) {
      return (
        <div className="orc-overlay">
          <NaoEncontrado onVoltar={() => setView({ name: "list" })} />
        </div>
      );
    }
    return (
      <div className="orc-overlay">
        <OrcamentoForm
          modo="editar"
          existente={existente}
          onCancel={() => setView({ name: "detail", id: existente.id })}
          onSaved={async () => {
            await reload();
            setView({ name: "detail", id: existente.id });
          }}
        />
      </div>
    );
  }

  if (view.name === "fechamento") {
    const existente = orcamentos.find((o) => o.id === view.id);
    if (!existente) {
      return (
        <div className="orc-overlay">
          <NaoEncontrado onVoltar={() => setView({ name: "list" })} />
        </div>
      );
    }
    // Segurança extra contra duplicidade: se por algum motivo o orçamento já
    // tiver um evento vinculado, não reabrimos o formulário de fechamento.
    if (existente.eventId) {
      return (
        <div className="orc-overlay">
          <div className="empty-state">
            <p className="empty-title">Este orçamento já possui um evento</p>
            <button className="btn-primary empty-cta" onClick={() => onOpenEvento(existente.eventId as string)}>
              Ver evento
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="orc-overlay">
        <FechamentoForm
          orcamento={existente}
          onCancel={() => setView({ name: "detail", id: existente.id })}
          onConfirmado={async () => {
            await reload();
          }}
          onVerEvento={(eventoId) => onOpenEvento(eventoId)}
          onVoltarParaLista={() => setView({ name: "list" })}
        />
      </div>
    );
  }

  // view.name === "detail"
  const atual = orcamentos.find((o) => o.id === view.id);
  if (!atual) {
    return (
      <div className="orc-overlay">
        <NaoEncontrado onVoltar={() => setView({ name: "list" })} />
      </div>
    );
  }

  return (
    <div className="orc-overlay">
      <OrcamentoDetail
        orcamento={atual}
        onBack={() => setView({ name: "list" })}
        onEditar={() => setView({ name: "edit", id: atual.id })}
        onAtualizado={reload}
        onCompletarFechamento={() => setView({ name: "fechamento", id: atual.id })}
        onVerEvento={onOpenEvento}
      />
    </div>
  );
}

function NaoEncontrado({ onVoltar }: { onVoltar: () => void }) {
  return (
    <div className="empty-state">
      <p className="empty-title">Orçamento não encontrado</p>
      <button className="btn-primary empty-cta" onClick={onVoltar}>
        Voltar para Orçamentos
      </button>
    </div>
  );
}
