import { useState, type ChangeEvent } from "react";
import { ChevronLeft, FileText } from "lucide-react";
import type { Contrato } from "../../types";
import { enviarContratoAssinado } from "../../lib/storageSupabase";
import { registrarAssinatura } from "../../data/contratosRepository";

interface ContratoImportarProps {
  eventoId: string;
  contrato: Contrato;
  onCancel: () => void;
  onImportado: () => void;
}

export default function ContratoImportar({
  eventoId,
  contrato,
  onCancel,
  onImportado
}: ContratoImportarProps) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function handleSelecionar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ehPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!ehPdf) {
      setErro("Selecione um arquivo em formato PDF.");
      setArquivo(null);
      return;
    }
    setErro(null);
    setArquivo(file);
  }

  async function handleConfirmar() {
    if (!arquivo || salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      const path = await enviarContratoAssinado(eventoId, contrato.id, arquivo);
      await registrarAssinatura(eventoId, arquivo.name, path);
      onImportado();
    } catch {
      setErro("Não foi possível importar o arquivo. Verifique sua conexão e tente novamente.");
      setSalvando(false);
    }
  }

  return (
    <div className="orc-form-screen">
      <header className="orc-form-header">
        <button type="button" className="icon-btn" onClick={onCancel} aria-label="Voltar">
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <h1>Importar assinado</h1>
        <span className="orc-form-header-spacer" />
      </header>

      <div className="orc-form-scroll">
        <section className="form-section">
          <p className="field-hint">
            Selecione o PDF do contrato {contrato.numero} já assinado pelo contratante. Ele será
            enviado para sua conta, em área privada.
          </p>

          <label className="upload-dropzone">
            <FileText size={22} strokeWidth={1.7} color="var(--ink-faint)" />
            <span className="upload-dropzone-text">
              {arquivo ? arquivo.name : "Toque para escolher um arquivo PDF"}
            </span>
            <input type="file" accept="application/pdf,.pdf" onChange={handleSelecionar} hidden />
          </label>
          {erro && <span className="field-error">{erro}</span>}
        </section>
      </div>

      <div className="orc-form-footer">
        <button
          type="button"
          className="btn-primary"
          onClick={handleConfirmar}
          disabled={!arquivo || salvando}
        >
          {salvando ? "Enviando..." : "Confirmar importação"}
        </button>
      </div>
    </div>
  );
}
