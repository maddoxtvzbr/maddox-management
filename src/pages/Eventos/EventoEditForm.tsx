import { useState, type FormEvent } from "react";
import { ChevronLeft } from "lucide-react";
import type { Evento, EventoEditInput } from "../../types";
import { atualizarEvento } from "../../data/eventosRepository";

interface EventoEditFormProps {
  evento: Evento;
  onCancel: () => void;
  onSaved: (evento: Evento) => void;
}

interface FormState {
  data: string;
  horario: string;
  cidade: string;
  local: string;
  observacoes: string;
}

type Errors = Partial<Record<keyof FormState, string>>;

export default function EventoEditForm({ evento, onCancel, onSaved }: EventoEditFormProps) {
  const [form, setForm] = useState<FormState>({
    data: evento.data,
    horario: evento.horario ?? "",
    cidade: evento.cidade,
    local: evento.local ?? "",
    observacoes: evento.observacoes ?? ""
  });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): Errors {
    const next: Errors = {};
    if (!form.data) next.data = "Informe a data do evento.";
    if (!form.cidade.trim()) next.cidade = "Informe a cidade.";
    return next;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;

    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSaving(true);
    (document.activeElement as HTMLElement | null)?.blur();

    const input: EventoEditInput = {
      data: form.data,
      horario: form.horario || undefined,
      cidade: form.cidade.trim(),
      local: form.local.trim() || undefined,
      observacoes: form.observacoes.trim() || undefined
    };

    try {
      const atualizado = await atualizarEvento(evento.id, input);
      onSaved(atualizado);
    } catch (error) {
      console.error("[EventoEditForm] Falha ao salvar", error);
      setSaving(false);
    }
  }

  return (
    <div className="orc-form-screen">
      <header className="orc-form-header">
        <button type="button" className="icon-btn" onClick={onCancel} aria-label="Voltar">
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <h1>Editar evento</h1>
        <span className="orc-form-header-spacer" />
      </header>

      <form className="orc-form" onSubmit={handleSubmit}>
        <div className="orc-form-scroll">
          <section className="form-section">
            <div className="field-row">
              <label className="field">
                <span className="field-label">Data do evento</span>
                <input
                  className="field-input"
                  type="date"
                  value={form.data}
                  onChange={(e) => set("data", e.target.value)}
                />
                {errors.data && <span className="field-error">{errors.data}</span>}
              </label>
              <label className="field">
                <span className="field-label">Horário</span>
                <input
                  className="field-input"
                  type="time"
                  value={form.horario}
                  onChange={(e) => set("horario", e.target.value)}
                />
              </label>
            </div>

            <label className="field">
              <span className="field-label">Cidade</span>
              <input
                className="field-input"
                value={form.cidade}
                onChange={(e) => set("cidade", e.target.value)}
                enterKeyHint="next"
              />
              {errors.cidade && <span className="field-error">{errors.cidade}</span>}
            </label>

            <label className="field">
              <span className="field-label">Local</span>
              <input
                className="field-input"
                value={form.local}
                onChange={(e) => set("local", e.target.value)}
                enterKeyHint="next"
              />
            </label>

            <label className="field">
              <span className="field-label">Observações</span>
              <textarea
                className="field-input field-textarea"
                value={form.observacoes}
                onChange={(e) => set("observacoes", e.target.value)}
                rows={3}
              />
            </label>
          </section>

          {form.data !== evento.data && (
            <p className="field-hint">
              Ao salvar, o vencimento do Saldo final será atualizado automaticamente para 1
              dia antes da nova data.
            </p>
          )}
        </div>

        <div className="orc-form-footer">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </div>
  );
}
