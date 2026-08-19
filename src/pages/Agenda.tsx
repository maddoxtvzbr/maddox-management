import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, MapPin } from "lucide-react";
import type { Evento } from "../types";
import { listEventos } from "../data/eventosRepository";
import { formatDayMonth } from "../lib/format";
import { todayISO } from "../lib/date";
import "./Agenda.css";

interface AgendaProps {
  onOpenEvento: (eventoId: string) => void;
}

export default function Agenda({ onOpenEvento }: AgendaProps) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setErro(null);
    try {
      const all = await listEventos();
      setEventos(all);
    } catch {
      setErro("Não foi possível carregar seus dados. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const { futuros, passados } = useMemo(() => {
    const hoje = todayISO();
    const ordenAsc = (a: Evento, b: Evento) => a.data.localeCompare(b.data);
    const ordenDesc = (a: Evento, b: Evento) => b.data.localeCompare(a.data);
    const ativos = eventos.filter((e) => e.status !== "cancelado");

    return {
      futuros: ativos.filter((e) => e.data >= hoje).sort(ordenAsc),
      passados: ativos.filter((e) => e.data < hoje).sort(ordenDesc)
    };
  }, [eventos]);

  const semEventos = !loading && !erro && futuros.length === 0 && passados.length === 0;

  return (
    <div className="screen agenda-screen">
      <header className="page-header">
        <h1>Agenda</h1>
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

      {!erro && !semEventos && (
        <p className="screen-hint">Somente eventos confirmados aparecem aqui.</p>
      )}

      {semEventos && (
        <div className="empty-state">
          <p className="empty-title">Nenhum evento confirmado</p>
          <p className="empty-sub">
            Feche um orçamento e complete o fechamento para ele aparecer aqui.
          </p>
        </div>
      )}

      {!erro && futuros.length > 0 && (
        <div className="agenda-list">
          {futuros.map((evento) => (
            <AgendaCard key={evento.id} evento={evento} onClick={() => onOpenEvento(evento.id)} />
          ))}
        </div>
      )}

      {!erro && passados.length > 0 && (
        <div className="agenda-section">
          <p className="section-title">Eventos anteriores</p>
          <div className="agenda-list">
            {passados.map((evento) => (
              <AgendaCard
                key={evento.id}
                evento={evento}
                onClick={() => onOpenEvento(evento.id)}
                passado
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AgendaCard({
  evento,
  onClick,
  passado
}: {
  evento: Evento;
  onClick: () => void;
  passado?: boolean;
}) {
  const { dia, mes } = formatDayMonth(evento.data);

  return (
    <button
      type="button"
      className={`card agenda-item ${passado ? "is-passado" : ""}`}
      onClick={onClick}
    >
      <div className="agenda-date">
        <span className="agenda-day">{dia}</span>
        <span className="agenda-month">{mes}</span>
      </div>

      <div className="agenda-info">
        <p className="agenda-title">{evento.cliente}</p>
        <p className="agenda-sub">
          {evento.tipoEvento}
          {evento.horario ? ` • ${evento.horario}` : ""}
        </p>

        <div className="agenda-meta">
          {evento.horario && (
            <span>
              <Clock size={13} strokeWidth={1.8} />
              {evento.horario}
            </span>
          )}
          <span>
            <MapPin size={13} strokeWidth={1.8} />
            {evento.local ? `${evento.local} — ` : ""}
            {evento.cidade}
          </span>
        </div>
      </div>
    </button>
  );
}
