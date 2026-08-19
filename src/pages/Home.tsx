import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin, ChevronRight, Settings } from "lucide-react";
import type { Evento, Orcamento } from "../types";
import { listEventos } from "../data/eventosRepository";
import { listOrcamentos } from "../data/orcamentosRepository";
import { getResumoGeral, getResumoMesAtual } from "../data/financeiroRepository";
import { formatCurrencyBRL, formatDateShort } from "../lib/format";
import { todayISO } from "../lib/date";
import "./Home.css";

interface HomeProps {
  onOpenEvento: (eventoId: string) => void;
  onAbrirConfiguracoes: () => void;
}

export default function Home({ onOpenEvento, onAbrirConfiguracoes }: HomeProps) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [aReceber, setAReceber] = useState(0);
  const [resultadoMes, setResultadoMes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setErro(null);
    try {
      const [ev, orc, geral, mes] = await Promise.all([
        listEventos(),
        listOrcamentos(),
        getResumoGeral(),
        getResumoMesAtual()
      ]);
      setEventos(ev);
      setOrcamentos(orc);
      setAReceber(geral.aReceber);
      setResultadoMes(mes.resultado);
    } catch {
      setErro("Não foi possível carregar seus dados. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const proximosEventos = useMemo(() => {
    const hoje = todayISO();
    return eventos.filter((e) => e.data >= hoje).sort((a, b) => a.data.localeCompare(b.data));
  }, [eventos]);

  const proximo = proximosEventos[0];
  const outrosProximos = proximosEventos.slice(1, 4);
  const orcamentosEmAberto = orcamentos.filter((o) => o.status === "aberto").length;

  return (
    <div className="screen home-screen">
      <header className="home-header">
        <div>
          <p className="eyebrow">MADDOX</p>
          <h1>Management</h1>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={onAbrirConfiguracoes}
          aria-label="Configurações"
        >
          <Settings size={19} strokeWidth={1.9} />
        </button>
      </header>

      {erro && (
        <div className="empty-state">
          <p className="empty-title">Não foi possível carregar</p>
          <p className="empty-sub">{erro}</p>
          <button className="btn-primary empty-cta" onClick={reload}>
            Tentar novamente
          </button>
        </div>
      )}

      {!erro && proximo ? (
        <section
          className="hero-card"
          role="button"
          tabIndex={0}
          onClick={() => onOpenEvento(proximo.id)}
        >
          <div className="hero-waveform" aria-hidden="true">
            {Array.from({ length: 28 }).map((_, i) => (
              <span key={i} style={{ height: `${waveHeight(i)}%` }} />
            ))}
          </div>

          <p className="eyebrow on-dark">Próximo evento</p>
          <h2 className="hero-title">{proximo.tipoEvento}</h2>
          <p className="hero-names">{proximo.cliente}</p>

          <div className="hero-meta">
            <span>
              <CalendarDays size={15} strokeWidth={1.8} />
              {formatDateShort(proximo.data)}
              {proximo.horario ? ` • ${proximo.horario}` : ""}
            </span>
            <span>
              <MapPin size={15} strokeWidth={1.8} />
              {proximo.local ? `${proximo.local} — ` : ""}
              {proximo.cidade}
            </span>
          </div>
        </section>
      ) : (
        !loading &&
        !erro && (
          <section className="hero-card hero-card-empty">
            <p className="eyebrow on-dark">Próximo evento</p>
            <p className="hero-empty-text">Nenhum evento confirmado</p>
          </section>
        )
      )}

      {!erro && (
        <section className="stat-row">
          <div className="card stat-card">
            <p className="stat-label">Orçamentos em aberto</p>
            <p className="stat-value">{orcamentosEmAberto}</p>
          </div>
          <div className="card stat-card">
            <p className="stat-label">A receber</p>
            <p className="stat-value">{formatCurrencyBRL(aReceber)}</p>
          </div>
          <div className="card stat-card stat-card-wide">
            <p className="stat-label">Resultado do mês</p>
            <p className="stat-value">{formatCurrencyBRL(resultadoMes)}</p>
          </div>
        </section>
      )}

      {!erro && outrosProximos.length > 0 && (
        <section className="upcoming-section">
          <p className="section-title">Próximos eventos</p>
          <div className="upcoming-list">
            {outrosProximos.map((evento) => (
              <button
                type="button"
                className="card upcoming-item"
                key={evento.id}
                onClick={() => onOpenEvento(evento.id)}
              >
                <div className="upcoming-info">
                  <p className="upcoming-title">{evento.cliente}</p>
                  <p className="upcoming-sub">
                    {evento.tipoEvento} • {formatDateShort(evento.data)}
                  </p>
                </div>
                <ChevronRight size={18} strokeWidth={1.8} color="var(--ink-faint)" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// Alturas fixas para o motivo visual de "onda sonora" no card principal
function waveHeight(index: number) {
  const pattern = [30, 55, 40, 70, 45, 85, 35, 60, 50, 75, 30, 65, 40, 90, 55, 35, 70, 45, 60, 30, 80, 50, 40, 65, 35, 55, 45, 30];
  return pattern[index % pattern.length];
}
