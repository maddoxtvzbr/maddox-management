import { useCallback, useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Wallet, ReceiptText, ChevronRight } from "lucide-react";
import type { Evento } from "../types";
import {
  getResumoGeral,
  listEventosComResumo,
  type ResumoGeral,
  type ResumoEvento
} from "../data/financeiroRepository";
import { formatCurrencyBRL, formatDateShort } from "../lib/format";
import "./Financeiro.css";

const RESUMO_VAZIO: ResumoGeral = {
  contratado: 0,
  recebido: 0,
  aReceber: 0,
  despesas: 0,
  resultado: 0
};

interface FinanceiroProps {
  onOpenEvento: (eventoId: string) => void;
}

export default function Financeiro({ onOpenEvento }: FinanceiroProps) {
  const [resumo, setResumo] = useState<ResumoGeral>(RESUMO_VAZIO);
  const [eventos, setEventos] = useState<{ evento: Evento; resumo: ResumoEvento }[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setErro(null);
    try {
      const [geral, lista] = await Promise.all([getResumoGeral(), listEventosComResumo()]);
      setResumo(geral);
      setEventos([...lista].sort((a, b) => b.evento.data.localeCompare(a.evento.data)));
    } catch {
      setErro("Não foi possível carregar seus dados. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const semEventos = !loading && !erro && eventos.length === 0;

  return (
    <div className="screen financeiro-screen">
      <header className="page-header">
        <h1>Financeiro</h1>
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

      {!erro && (
        <>
          <p className="screen-hint">Somente eventos confirmados entram nos valores abaixo.</p>

          <section className="lucro-card">
            <p className="eyebrow on-dark">Resultado</p>
            <p className="lucro-value">{formatCurrencyBRL(resumo.resultado)}</p>
            <p className="lucro-sub">Contratado: {formatCurrencyBRL(resumo.contratado)}</p>
          </section>

          <section className="fin-grid">
            <div className="card fin-item">
              <div className="fin-icon recebido">
                <TrendingUp size={18} strokeWidth={1.9} />
              </div>
              <p className="fin-label">Recebido</p>
              <p className="fin-value">{formatCurrencyBRL(resumo.recebido)}</p>
            </div>

            <div className="card fin-item">
              <div className="fin-icon areceber">
                <Wallet size={18} strokeWidth={1.9} />
              </div>
              <p className="fin-label">A receber</p>
              <p className="fin-value">{formatCurrencyBRL(resumo.aReceber)}</p>
            </div>

            <div className="card fin-item">
              <div className="fin-icon despesas">
                <TrendingDown size={18} strokeWidth={1.9} />
              </div>
              <p className="fin-label">Despesas</p>
              <p className="fin-value">{formatCurrencyBRL(resumo.despesas)}</p>
            </div>

            <div className="card fin-item">
              <div className="fin-icon contratado">
                <ReceiptText size={18} strokeWidth={1.9} />
              </div>
              <p className="fin-label">Contratado</p>
              <p className="fin-value">{formatCurrencyBRL(resumo.contratado)}</p>
            </div>
          </section>

          <section className="eventos-financeiro-section">
            <p className="section-title">Eventos</p>

            {semEventos && (
              <div className="card mini-empty">
                <p className="mini-empty-text">Nenhum evento confirmado ainda</p>
              </div>
            )}

            {!semEventos && (
              <div className="eventos-financeiro-list">
                {eventos.map(({ evento, resumo: r }) => (
                  <button
                    type="button"
                    className="card evento-financeiro-item"
                    key={evento.id}
                    onClick={() => onOpenEvento(evento.id)}
                  >
                    <div className="evento-financeiro-top">
                      <div>
                        <p className="evento-financeiro-nome">{evento.cliente}</p>
                        <p className="evento-financeiro-sub">
                          {evento.tipoEvento} • {formatDateShort(evento.data)}
                        </p>
                      </div>
                      <ChevronRight size={18} strokeWidth={1.8} color="var(--ink-faint)" />
                    </div>

                    <div className="evento-financeiro-grid">
                      <div className="evento-financeiro-valor">
                        <span className="mini-stat-label">Contratado</span>
                        <span className="mini-stat-value">{formatCurrencyBRL(r.contratado)}</span>
                      </div>
                      <div className="evento-financeiro-valor">
                        <span className="mini-stat-label">Recebido</span>
                        <span className="mini-stat-value">{formatCurrencyBRL(r.recebido)}</span>
                      </div>
                      <div className="evento-financeiro-valor">
                        <span className="mini-stat-label">A receber</span>
                        <span className="mini-stat-value">{formatCurrencyBRL(r.aReceber)}</span>
                      </div>
                      <div className="evento-financeiro-valor">
                        <span className="mini-stat-label">Despesas</span>
                        <span className="mini-stat-value">{formatCurrencyBRL(r.despesas)}</span>
                      </div>
                      <div className="evento-financeiro-valor evento-financeiro-resultado">
                        <span className="mini-stat-label">Resultado</span>
                        <span className="mini-stat-value">{formatCurrencyBRL(r.resultado)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
