import { useMemo, useState, type FormEvent } from "react";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
import type { Orcamento, Evento, FechamentoInput, FormaPagamento } from "../../types";
import { criarEvento } from "../../data/eventosRepository";
import { formatCurrencyBRL, formatDateShort, onlyDigits } from "../../lib/format";
import { addDaysISO } from "../../lib/date";
import CurrencyInput from "../../components/CurrencyInput";

const FORMAS_PAGAMENTO: FormaPagamento[] = ["PIX", "Dinheiro", "Transferência", "Cartão", "Outro"];

interface FechamentoFormProps {
  orcamento: Orcamento;
  onCancel: () => void;
  onConfirmado: (evento: Evento) => Promise<void> | void;
  onVerEvento: (eventoId: string) => void;
  onVoltarParaLista: () => void;
}

interface FormState {
  cliente: string;
  cpfCnpj: string;
  telefone: string;
  email: string;
  rua: string;
  numero: string;
  bairro: string;
  cidadeContratante: string;
  estado: string;

  tipoEvento: string;
  data: string;
  horario: string;
  horarioMontagem: string;
  horarioTermino: string;
  cidade: string;
  local: string;
  enderecoEvento: string;
  observacoes: string;

  valorContratado: number;
  formaPagamento: FormaPagamento | "";
}

function toFormState(o: Orcamento): FormState {
  return {
    cliente: o.nomeCliente,
    cpfCnpj: "",
    telefone: o.telefone,
    email: "",
    rua: "",
    numero: "",
    bairro: "",
    cidadeContratante: "",
    estado: "",

    tipoEvento: o.tipoEvento,
    data: o.data,
    horario: o.horario ?? "",
    horarioMontagem: "",
    horarioTermino: "",
    cidade: o.cidade,
    local: o.local ?? "",
    enderecoEvento: "",
    observacoes: o.observacoes ?? "",

    valorContratado: o.valor,
    formaPagamento: ""
  };
}

type Errors = Partial<Record<keyof FormState, string>>;
type Step = "form" | "resumo" | "sucesso";

export default function FechamentoForm({
  orcamento,
  onCancel,
  onConfirmado,
  onVerEvento,
  onVoltarParaLista
}: FechamentoFormProps) {
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState<FormState>(() => toFormState(orcamento));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [eventoCriado, setEventoCriado] = useState<Evento | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): Errors {
    const next: Errors = {};
    if (!form.cliente.trim()) next.cliente = "Informe o nome completo.";
    if (!onlyDigits(form.cpfCnpj)) next.cpfCnpj = "Informe o CPF ou CNPJ.";
    if (!form.telefone.trim()) next.telefone = "Informe o telefone / WhatsApp.";
    if (!form.tipoEvento.trim()) next.tipoEvento = "Informe o tipo de evento.";
    if (!form.data) next.data = "Informe a data do evento.";
    if (!form.cidade.trim()) next.cidade = "Informe a cidade.";
    if (!form.valorContratado || form.valorContratado <= 0) {
      next.valorContratado = "Informe um valor contratado válido.";
    }
    return next;
  }

  const parcelas = useMemo(() => {
    const totalCentavos = Math.round((form.valorContratado || 0) * 100);
    const entradaCentavos = Math.floor(totalCentavos / 2);
    const saldoCentavos = totalCentavos - entradaCentavos;
    const vencimentoSaldo = form.data ? addDaysISO(form.data, -1) : "";
    return {
      entrada: entradaCentavos / 100,
      saldo: saldoCentavos / 100,
      vencimentoSaldo
    };
  }, [form.valorContratado, form.data]);

  function handleAvancar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validation = validate();
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    (document.activeElement as HTMLElement | null)?.blur();
    setStep("resumo");
  }

  async function handleConfirmar() {
    if (saving) return; // evita duplo toque / evento duplicado
    setSaving(true);

    const input: FechamentoInput = {
      cliente: form.cliente.trim(),
      cpfCnpj: form.cpfCnpj.trim(),
      telefone: form.telefone.trim(),
      email: form.email.trim() || undefined,
      endereco:
        form.rua || form.numero || form.bairro || form.cidadeContratante || form.estado
          ? {
              rua: form.rua.trim() || undefined,
              numero: form.numero.trim() || undefined,
              bairro: form.bairro.trim() || undefined,
              cidade: form.cidadeContratante.trim() || undefined,
              estado: form.estado.trim() || undefined
            }
          : undefined,
      tipoEvento: form.tipoEvento.trim(),
      data: form.data,
      horario: form.horario || undefined,
      horarioMontagem: form.horarioMontagem || undefined,
      horarioTermino: form.horarioTermino || undefined,
      cidade: form.cidade.trim(),
      local: form.local.trim() || undefined,
      enderecoEvento: form.enderecoEvento.trim() || undefined,
      observacoes: form.observacoes.trim() || undefined,
      valorContratado: form.valorContratado,
      formaPagamento: form.formaPagamento || undefined
    };

    try {
      const evento = await criarEvento(orcamento.id, input);
      await onConfirmado(evento);
      setEventoCriado(evento);
      setStep("sucesso");
    } catch (error) {
      console.error("[FechamentoForm] Falha ao confirmar evento", error);
    } finally {
      setSaving(false);
    }
  }

  if (step === "sucesso" && eventoCriado) {
    return (
      <div className="orc-form-screen">
        <div className="sucesso-screen">
          <div className="sucesso-icon">
            <CheckCircle2 size={30} strokeWidth={2} />
          </div>
          <p className="sucesso-title">Evento confirmado</p>
          <p className="sucesso-sub">
            Agora ele já aparece na sua agenda e no financeiro.
          </p>
          <div className="sucesso-actions">
            <button className="btn-primary" onClick={() => onVerEvento(eventoCriado.id)}>
              Ver evento
            </button>
            <button className="link-btn" onClick={onVoltarParaLista}>
              Voltar para orçamentos
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "resumo") {
    return (
      <div className="orc-form-screen">
        <header className="orc-form-header">
          <button
            type="button"
            className="icon-btn"
            onClick={() => setStep("form")}
            aria-label="Voltar"
          >
            <ChevronLeft size={22} strokeWidth={2} />
          </button>
          <h1>Revisar fechamento</h1>
          <span className="orc-form-header-spacer" />
        </header>

        <div className="orc-form-scroll">
          <section className="card resumo-list">
            <div className="resumo-row">
              <span className="resumo-label">Cliente</span>
              <span className="resumo-value">{form.cliente}</span>
            </div>
            <div className="resumo-row">
              <span className="resumo-label">Evento</span>
              <span className="resumo-value">{form.tipoEvento}</span>
            </div>
            <div className="resumo-row">
              <span className="resumo-label">Data</span>
              <span className="resumo-value">{formatDateShort(form.data)}</span>
            </div>

            <div className="resumo-divider" />

            <div className="resumo-row">
              <span className="resumo-label">Valor contratado</span>
              <span className="resumo-value destaque">
                {formatCurrencyBRL(form.valorContratado)}
              </span>
            </div>
            <div className="resumo-row">
              <span className="resumo-label">Entrada (50%)</span>
              <span className="resumo-value">{formatCurrencyBRL(parcelas.entrada)}</span>
            </div>
            <div className="resumo-row">
              <span className="resumo-label">Saldo final (50%)</span>
              <span className="resumo-value">
                {formatCurrencyBRL(parcelas.saldo)}
                {parcelas.vencimentoSaldo ? ` · vence ${formatDateShort(parcelas.vencimentoSaldo)}` : ""}
              </span>
            </div>
          </section>
        </div>

        <div className="orc-form-footer detail-actions">
          <button type="button" className="btn-secondary" onClick={() => setStep("form")} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={handleConfirmar} disabled={saving}>
            {saving ? "Confirmando..." : "Confirmar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="orc-form-screen">
      <header className="orc-form-header">
        <button type="button" className="icon-btn" onClick={onCancel} aria-label="Voltar">
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <h1>Completar fechamento</h1>
        <span className="orc-form-header-spacer" />
      </header>

      <form className="orc-form" onSubmit={handleAvancar}>
        <div className="orc-form-scroll">
          <section className="form-section">
            <p className="form-section-title">Contratante</p>

            <label className="field">
              <span className="field-label">Nome completo</span>
              <input
                className="field-input"
                value={form.cliente}
                onChange={(e) => set("cliente", e.target.value)}
                autoComplete="name"
                enterKeyHint="next"
              />
              {errors.cliente && <span className="field-error">{errors.cliente}</span>}
            </label>

            <label className="field">
              <span className="field-label">CPF/CNPJ</span>
              <input
                className="field-input"
                value={form.cpfCnpj}
                onChange={(e) => set("cpfCnpj", e.target.value)}
                placeholder="000.000.000-00"
                inputMode="numeric"
                enterKeyHint="next"
              />
              {errors.cpfCnpj && <span className="field-error">{errors.cpfCnpj}</span>}
            </label>

            <label className="field">
              <span className="field-label">Telefone / WhatsApp</span>
              <input
                className="field-input"
                value={form.telefone}
                onChange={(e) => set("telefone", e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                enterKeyHint="next"
              />
              {errors.telefone && <span className="field-error">{errors.telefone}</span>}
            </label>

            <label className="field">
              <span className="field-label">E-mail (opcional)</span>
              <input
                className="field-input"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                type="email"
                inputMode="email"
                autoComplete="email"
                enterKeyHint="next"
              />
            </label>

            <div className="field-row">
              <label className="field">
                <span className="field-label">Rua (opcional)</span>
                <input
                  className="field-input"
                  value={form.rua}
                  onChange={(e) => set("rua", e.target.value)}
                  enterKeyHint="next"
                />
              </label>
              <label className="field">
                <span className="field-label">Número</span>
                <input
                  className="field-input"
                  value={form.numero}
                  onChange={(e) => set("numero", e.target.value)}
                  enterKeyHint="next"
                />
              </label>
            </div>

            <div className="field-row">
              <label className="field">
                <span className="field-label">Bairro</span>
                <input
                  className="field-input"
                  value={form.bairro}
                  onChange={(e) => set("bairro", e.target.value)}
                  enterKeyHint="next"
                />
              </label>
              <label className="field">
                <span className="field-label">Estado</span>
                <input
                  className="field-input"
                  value={form.estado}
                  onChange={(e) => set("estado", e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="GO"
                  enterKeyHint="next"
                />
              </label>
            </div>

            <label className="field">
              <span className="field-label">Cidade (endereço do contratante)</span>
              <input
                className="field-input"
                value={form.cidadeContratante}
                onChange={(e) => set("cidadeContratante", e.target.value)}
                enterKeyHint="next"
              />
            </label>
          </section>

          <section className="form-section">
            <p className="form-section-title">Evento</p>

            <label className="field">
              <span className="field-label">Tipo de evento</span>
              <input
                className="field-input"
                value={form.tipoEvento}
                onChange={(e) => set("tipoEvento", e.target.value)}
                enterKeyHint="next"
              />
              {errors.tipoEvento && <span className="field-error">{errors.tipoEvento}</span>}
            </label>

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

            <div className="field-row">
              <label className="field">
                <span className="field-label">Montagem (opcional)</span>
                <input
                  className="field-input"
                  type="time"
                  value={form.horarioMontagem}
                  onChange={(e) => set("horarioMontagem", e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field-label">Término previsto</span>
                <input
                  className="field-input"
                  type="time"
                  value={form.horarioTermino}
                  onChange={(e) => set("horarioTermino", e.target.value)}
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
              <span className="field-label">Endereço completo (opcional)</span>
              <input
                className="field-input"
                value={form.enderecoEvento}
                onChange={(e) => set("enderecoEvento", e.target.value)}
                enterKeyHint="next"
              />
            </label>

            <label className="field">
              <span className="field-label">Observações do evento</span>
              <textarea
                className="field-input field-textarea"
                value={form.observacoes}
                onChange={(e) => set("observacoes", e.target.value)}
                rows={3}
              />
            </label>
          </section>

          <section className="form-section">
            <p className="form-section-title">Valor e pagamento</p>

            <label className="field">
              <span className="field-label">Valor contratado</span>
              <CurrencyInput
                value={form.valorContratado}
                onChange={(v) => set("valorContratado", v)}
              />
              {errors.valorContratado && (
                <span className="field-error">{errors.valorContratado}</span>
              )}
            </label>

            <label className="field">
              <span className="field-label">Forma de pagamento (opcional)</span>
              <select
                className="field-input"
                value={form.formaPagamento}
                onChange={(e) => set("formaPagamento", e.target.value as FormaPagamento | "")}
              >
                <option value="">Selecione</option>
                {FORMAS_PAGAMENTO.map((forma) => (
                  <option key={forma} value={forma}>
                    {forma}
                  </option>
                ))}
              </select>
            </label>
          </section>
        </div>

        <div className="orc-form-footer">
          <button type="submit" className="btn-primary">
            Revisar
          </button>
        </div>
      </form>
    </div>
  );
}
