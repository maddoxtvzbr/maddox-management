import { useState, type FormEvent } from "react";
import { ChevronLeft, Trash2 } from "lucide-react";
import type { CategoriaDespesa, Despesa } from "../../types";
import { criarDespesa, atualizarDespesa, excluirDespesa } from "../../data/despesasRepository";
import { todayISO } from "../../lib/date";
import CurrencyInput from "../../components/CurrencyInput";
import ConfirmSheet from "../../components/ConfirmSheet";

const CATEGORIAS: CategoriaDespesa[] = [
  "Combustível",
  "Pedágio",
  "Alimentação",
  "Hospedagem",
  "Equipe",
  "Equipamentos",
  "Locação",
  "Outro"
];

interface DespesaFormProps {
  eventoId: string;
  existente?: Despesa;
  onCancel: () => void;
  onSaved: () => void;
  onExcluida?: () => void;
}

interface Errors {
  descricao?: string;
  categoria?: string;
  valor?: string;
  data?: string;
}

export default function DespesaForm({
  eventoId,
  existente,
  onCancel,
  onSaved,
  onExcluida
}: DespesaFormProps) {
  const [descricao, setDescricao] = useState(existente?.descricao ?? "");
  const [categoria, setCategoria] = useState<CategoriaDespesa | "">(existente?.categoria ?? "");
  const [valor, setValor] = useState(existente?.valor ?? 0);
  const [data, setData] = useState(existente?.data ?? todayISO());
  const [observacoes, setObservacoes] = useState(existente?.observacoes ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [confirmExcluir, setConfirmExcluir] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  function validate(): Errors {
    const next: Errors = {};
    if (!descricao.trim()) next.descricao = "Informe a descrição.";
    if (!categoria) next.categoria = "Selecione a categoria.";
    if (!valor || valor <= 0) next.valor = "Informe um valor válido.";
    if (!data) next.data = "Informe a data.";
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

    const input = {
      eventoId,
      descricao: descricao.trim(),
      categoria: categoria as CategoriaDespesa,
      valor,
      data,
      observacoes: observacoes.trim() || undefined
    };

    try {
      if (existente) {
        await atualizarDespesa(existente.id, input);
      } else {
        await criarDespesa(input);
      }
      onSaved();
    } catch (error) {
      console.error("[DespesaForm] Falha ao salvar", error);
      setSaving(false);
    }
  }

  async function handleExcluir() {
    if (!existente || excluindo) return;
    setExcluindo(true);
    try {
      await excluirDespesa(existente.id);
      onExcluida?.();
    } finally {
      setExcluindo(false);
      setConfirmExcluir(false);
    }
  }

  return (
    <div className="orc-form-screen">
      <header className="orc-form-header">
        <button type="button" className="icon-btn" onClick={onCancel} aria-label="Voltar">
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <h1>{existente ? "Editar despesa" : "Nova despesa"}</h1>
        {existente ? (
          <button
            type="button"
            className="icon-btn"
            onClick={() => setConfirmExcluir(true)}
            aria-label="Excluir despesa"
          >
            <Trash2 size={18} strokeWidth={1.9} />
          </button>
        ) : (
          <span className="orc-form-header-spacer" />
        )}
      </header>

      <form className="orc-form" onSubmit={handleSubmit}>
        <div className="orc-form-scroll">
          <section className="form-section">
            <label className="field">
              <span className="field-label">Descrição</span>
              <input
                className="field-input"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Combustível para Jataí"
                enterKeyHint="next"
              />
              {errors.descricao && <span className="field-error">{errors.descricao}</span>}
            </label>

            <label className="field">
              <span className="field-label">Categoria</span>
              <select
                className="field-input"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as CategoriaDespesa)}
              >
                <option value="" disabled>
                  Selecione
                </option>
                {CATEGORIAS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.categoria && <span className="field-error">{errors.categoria}</span>}
            </label>

            <label className="field">
              <span className="field-label">Valor</span>
              <CurrencyInput value={valor} onChange={setValor} />
              {errors.valor && <span className="field-error">{errors.valor}</span>}
            </label>

            <label className="field">
              <span className="field-label">Data</span>
              <input
                className="field-input"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
              {errors.data && <span className="field-error">{errors.data}</span>}
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
          </section>
        </div>

        <div className="orc-form-footer">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Salvando..." : "Salvar despesa"}
          </button>
        </div>
      </form>

      <ConfirmSheet
        open={confirmExcluir}
        title="Excluir esta despesa?"
        description="Essa ação não pode ser desfeita. Os valores do evento serão recalculados."
        confirmLabel="Excluir"
        tone="negative"
        confirming={excluindo}
        onCancel={() => setConfirmExcluir(false)}
        onConfirm={handleExcluir}
      />
    </div>
  );
}
