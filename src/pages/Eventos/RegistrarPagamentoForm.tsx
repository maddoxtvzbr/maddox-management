import { useState, type FormEvent } from "react";
import { ChevronLeft } from "lucide-react";
import type { Parcela, FormaPagamento } from "../../types";
import { registrarPagamento } from "../../data/pagamentosRepository";
import { formatCurrencyBRL } from "../../lib/format";
import { todayISO } from "../../lib/date";
import CurrencyInput from "../../components/CurrencyInput";

const FORMAS_PAGAMENTO: FormaPagamento[] = ["PIX", "Dinheiro", "Transferência", "Cartão", "Outro"];

interface RegistrarPagamentoFormProps {
  eventoId: string;
  parcela: Parcela;
  saldoRestante: number;
  onCancel: () => void;
  onSaved: () => void;
}

export default function RegistrarPagamentoForm({
  eventoId,
  parcela,
  saldoRestante,
  onCancel,
  onSaved
}: RegistrarPagamentoFormProps) {
  const [valor, setValor] = useState(saldoRestante);
  const [dataPagamento, setDataPagamento] = useState(todayISO());
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("PIX");
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return; // evita duplo toque / pagamento duplicado

    if (!valor || valor <= 0) {
      setErro("Informe um valor válido.");
      return;
    }
    if (valor > saldoRestante + 0.005) {
      setErro(`O valor não pode ser maior que o saldo restante (${formatCurrencyBRL(saldoRestante)}).`);
      return;
    }
    if (!dataPagamento) {
      setErro("Informe a data do pagamento.");
      return;
    }

    setErro(null);
    setSaving(true);
    (document.activeElement as HTMLElement | null)?.blur();

    try {
      await registrarPagamento({
        eventoId,
        parcelaId: parcela.id,
        valor,
        dataPagamento,
        formaPagamento,
        observacoes: observacoes.trim() || undefined
      });
      onSaved();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível registrar o pagamento.");
      setSaving(false);
    }
  }

  return (
    <div className="orc-form-screen">
      <header className="orc-form-header">
        <button type="button" className="icon-btn" onClick={onCancel} aria-label="Voltar">
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <h1>Registrar pagamento</h1>
        <span className="orc-form-header-spacer" />
      </header>

      <form className="orc-form" onSubmit={handleSubmit}>
        <div className="orc-form-scroll">
          <div className="card resumo-list">
            <div className="resumo-row">
              <span className="resumo-label">Parcela</span>
              <span className="resumo-value">{parcela.descricao}</span>
            </div>
            <div className="resumo-row">
              <span className="resumo-label">Saldo restante</span>
              <span className="resumo-value destaque">{formatCurrencyBRL(saldoRestante)}</span>
            </div>
          </div>

          <section className="form-section">
            <label className="field">
              <span className="field-label">Valor recebido</span>
              <CurrencyInput value={valor} onChange={setValor} />
            </label>

            <label className="field">
              <span className="field-label">Data do pagamento</span>
              <input
                className="field-input"
                type="date"
                value={dataPagamento}
                onChange={(e) => setDataPagamento(e.target.value)}
              />
            </label>

            <label className="field">
              <span className="field-label">Forma de pagamento</span>
              <select
                className="field-input"
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
              >
                {FORMAS_PAGAMENTO.map((forma) => (
                  <option key={forma} value={forma}>
                    {forma}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-label">Observações (opcional)</span>
              <textarea
                className="field-input field-textarea"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={2}
              />
            </label>

            {erro && <span className="field-error">{erro}</span>}
          </section>
        </div>

        <div className="orc-form-footer">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Salvando..." : "Confirmar pagamento"}
          </button>
        </div>
      </form>
    </div>
  );
}
