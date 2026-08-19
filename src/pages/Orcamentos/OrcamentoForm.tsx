import { useState, type FormEvent } from "react";
import { ChevronLeft } from "lucide-react";
import type { Orcamento, NovoOrcamentoInput } from "../../types";
import { createOrcamento, updateOrcamento } from "../../data/orcamentosRepository";
import { formatPhoneDisplay } from "../../lib/format";
import CurrencyInput from "../../components/CurrencyInput";

const TIPOS_EVENTO = [
  "Casamento",
  "15 Anos",
  "Formatura",
  "Festa Universitária",
  "Balada",
  "Evento Corporativo",
  "Aniversário",
  "Outro"
];

interface OrcamentoFormProps {
  modo: "novo" | "editar";
  existente?: Orcamento;
  onCancel: () => void;
  onSaved: (orcamento: Orcamento) => void;
}

interface FormState {
  nomeCliente: string;
  telefone: string;
  tipoEvento: string;
  tipoEventoOutro: string;
  data: string;
  horario: string;
  cidade: string;
  local: string;
  valor: number;
  observacoes: string;
}

function toFormState(o?: Orcamento): FormState {
  const tipoConhecido = o ? TIPOS_EVENTO.includes(o.tipoEvento) : true;
  return {
    nomeCliente: o?.nomeCliente ?? "",
    telefone: o?.telefone ?? "",
    tipoEvento: o ? (tipoConhecido ? o.tipoEvento : "Outro") : "",
    tipoEventoOutro: o && !tipoConhecido ? o.tipoEvento : "",
    data: o?.data ?? "",
    horario: o?.horario ?? "",
    cidade: o?.cidade ?? "",
    local: o?.local ?? "",
    valor: o?.valor ?? 0,
    observacoes: o?.observacoes ?? ""
  };
}

type Errors = Partial<Record<keyof FormState, string>>;

export default function OrcamentoForm({ modo, existente, onCancel, onSaved }: OrcamentoFormProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(existente));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): Errors {
    const next: Errors = {};
    if (!form.nomeCliente.trim()) next.nomeCliente = "Informe o nome do cliente.";
    if (!form.telefone.trim()) next.telefone = "Informe o telefone / WhatsApp.";
    if (!form.tipoEvento) next.tipoEvento = "Selecione o tipo de evento.";
    if (form.tipoEvento === "Outro" && !form.tipoEventoOutro.trim()) {
      next.tipoEventoOutro = "Descreva o tipo de evento.";
    }
    if (!form.data) next.data = "Informe a data do evento.";
    if (!form.cidade.trim()) next.cidade = "Informe a cidade.";
    if (!form.valor || form.valor <= 0) next.valor = "Informe o valor do orçamento.";
    return next;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return; // evita criação duplicada por múltiplos toques

    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;

    setSaving(true);
    (document.activeElement as HTMLElement | null)?.blur();

    const input: NovoOrcamentoInput = {
      nomeCliente: form.nomeCliente.trim(),
      telefone: form.telefone.trim(),
      tipoEvento: form.tipoEvento === "Outro" ? form.tipoEventoOutro.trim() : form.tipoEvento,
      data: form.data,
      horario: form.horario || undefined,
      cidade: form.cidade.trim(),
      local: form.local.trim() || undefined,
      valor: form.valor,
      observacoes: form.observacoes.trim() || undefined
    };

    try {
      const salvo =
        modo === "editar" && existente
          ? await updateOrcamento(existente.id, input)
          : await createOrcamento(input);
      onSaved(salvo);
    } catch (error) {
      console.error("[OrcamentoForm] Falha ao salvar", error);
      setSaving(false);
    }
  }

  return (
    <div className="orc-form-screen">
      <header className="orc-form-header">
        <button type="button" className="icon-btn" onClick={onCancel} aria-label="Voltar">
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <h1>{modo === "novo" ? "Novo orçamento" : "Editar orçamento"}</h1>
        <span className="orc-form-header-spacer" />
      </header>

      <form className="orc-form" onSubmit={handleSubmit}>
        <div className="orc-form-scroll">
          <section className="form-section">
            <p className="form-section-title">Cliente</p>

            <label className="field">
              <span className="field-label">Nome do cliente</span>
              <input
                className="field-input"
                value={form.nomeCliente}
                onChange={(e) => set("nomeCliente", e.target.value)}
                placeholder="Ex: Mariana Souza"
                autoComplete="name"
                enterKeyHint="next"
              />
              {errors.nomeCliente && <span className="field-error">{errors.nomeCliente}</span>}
            </label>

            <label className="field">
              <span className="field-label">Telefone / WhatsApp</span>
              <input
                className="field-input"
                value={form.telefone}
                onChange={(e) => set("telefone", formatPhoneDisplay(e.target.value))}
                placeholder="(64) 99999-0000"
                inputMode="tel"
                autoComplete="tel"
                enterKeyHint="next"
              />
              {errors.telefone && <span className="field-error">{errors.telefone}</span>}
            </label>
          </section>

          <section className="form-section">
            <p className="form-section-title">Evento</p>

            <label className="field">
              <span className="field-label">Tipo de evento</span>
              <select
                className="field-input"
                value={form.tipoEvento}
                onChange={(e) => set("tipoEvento", e.target.value)}
              >
                <option value="" disabled>
                  Selecione
                </option>
                {TIPOS_EVENTO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
              {errors.tipoEvento && <span className="field-error">{errors.tipoEvento}</span>}
            </label>

            {form.tipoEvento === "Outro" && (
              <label className="field">
                <span className="field-label">Qual?</span>
                <input
                  className="field-input"
                  value={form.tipoEventoOutro}
                  onChange={(e) => set("tipoEventoOutro", e.target.value)}
                  placeholder="Descreva o evento"
                  enterKeyHint="next"
                />
                {errors.tipoEventoOutro && (
                  <span className="field-error">{errors.tipoEventoOutro}</span>
                )}
              </label>
            )}

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
                placeholder="Ex: Rio Verde - GO"
                autoComplete="address-level2"
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
                placeholder="Ex: Villa Prime"
                enterKeyHint="next"
              />
            </label>
          </section>

          <section className="form-section">
            <p className="form-section-title">Orçamento</p>

            <label className="field">
              <span className="field-label">Valor</span>
              <CurrencyInput value={form.valor} onChange={(v) => set("valor", v)} />
              {errors.valor && <span className="field-error">{errors.valor}</span>}
            </label>

            <label className="field">
              <span className="field-label">Observações</span>
              <textarea
                className="field-input field-textarea"
                value={form.observacoes}
                onChange={(e) => set("observacoes", e.target.value)}
                placeholder="Detalhes adicionais (opcional)"
                rows={3}
              />
            </label>
          </section>
        </div>

        <div className="orc-form-footer">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Salvando..." : "Salvar orçamento"}
          </button>
        </div>
      </form>
    </div>
  );
}
