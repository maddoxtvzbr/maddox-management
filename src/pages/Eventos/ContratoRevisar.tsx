import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import type { Evento, Parcela, Contrato, Perfil } from "../../types";
import { construirSnapshotContrato } from "../../lib/contratoSnapshot";
import { gerarContratoPdfBlob } from "../../lib/pdfGenerator";
import { abrirArquivoEmNovaAba } from "../../lib/arquivo";
import { gerarOuAtualizarContrato, salvarCaminhoOriginal } from "../../data/contratosRepository";
import { enviarContratoOriginal } from "../../lib/storageSupabase";
import { getPerfil } from "../../data/perfilRepository";
import { montarDadosContratado, perfilCompletoParaContrato, FORO_PADRAO } from "../../config/contratado";
import { formatCurrencyBRL, formatDateShort } from "../../lib/format";

interface ContratoRevisarProps {
  evento: Evento;
  parcelas: Parcela[];
  contratoExistente: Contrato | null;
  onCancel: () => void;
  onGerado: (contrato: Contrato) => void;
  onIrParaConfiguracoes: () => void;
}

export default function ContratoRevisar({
  evento,
  parcelas,
  contratoExistente,
  onCancel,
  onGerado,
  onIrParaConfiguracoes
}: ContratoRevisarProps) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);
  const [autorizaImagem, setAutorizaImagem] = useState<boolean | null>(
    contratoExistente?.autorizaImagem ?? null
  );
  const [foro, setForo] = useState(contratoExistente?.foro ?? FORO_PADRAO);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState<"visualizar" | "gerar" | null>(null);

  useEffect(() => {
    getPerfil()
      .then(setPerfil)
      .catch(() => setPerfil(null))
      .finally(() => setCarregandoPerfil(false));
  }, []);

  const snapshot = useMemo(
    () => construirSnapshotContrato(evento, parcelas),
    [evento, parcelas]
  );

  const perfilCompleto = perfilCompletoParaContrato(perfil);

  async function handleVisualizar() {
    if (autorizaImagem === null) {
      setErro("Escolha se autoriza o uso de imagens antes de visualizar.");
      return;
    }
    setErro(null);
    setCarregando("visualizar");
    try {
      const blob = await gerarContratoPdfBlob({
        numero: contratoExistente?.numero ?? "PRÉVIA",
        snapshot,
        autorizaImagem,
        foro: foro.trim() || FORO_PADRAO,
        contratado: montarDadosContratado(perfil)
      });
      abrirArquivoEmNovaAba(blob);
    } catch {
      setErro("Não foi possível gerar a prévia do contrato.");
    } finally {
      setCarregando(null);
    }
  }

  async function handleGerar() {
    if (carregando) return;
    if (!perfilCompleto) {
      setErro("Complete seus dados em Configurações antes de gerar o contrato.");
      return;
    }
    if (autorizaImagem === null) {
      setErro("Escolha se autoriza o uso de imagens antes de gerar o contrato.");
      return;
    }
    setErro(null);
    setCarregando("gerar");
    try {
      const foroFinal = foro.trim() || FORO_PADRAO;
      const contrato = await gerarOuAtualizarContrato(evento.id, snapshot, autorizaImagem, foroFinal);

      const blob = await gerarContratoPdfBlob({
        numero: contrato.numero,
        snapshot: contrato.snapshot,
        autorizaImagem: contrato.autorizaImagem,
        foro: contrato.foro,
        contratado: montarDadosContratado(perfil)
      });

      // O upload precisa dar certo — sem arquivo salvo no Storage, o
      // contrato não deve ser tratado como pronto para visualizar/compartilhar.
      const path = await enviarContratoOriginal(evento.id, contrato.id, blob);
      await salvarCaminhoOriginal(evento.id, path);
      // eslint-disable-next-line no-console
      console.log("[PDF] PDF_PATH_SAVED", { path });

      abrirArquivoEmNovaAba(blob);
      onGerado(contrato);
    } catch (error) {
      console.error("[PDF] Falha ao gerar contrato", error);
      setErro("Não foi possível gerar o contrato. Verifique sua conexão e tente novamente.");
    } finally {
      setCarregando(null);
    }
  }

  return (
    <div className="orc-form-screen">
      <header className="orc-form-header">
        <button type="button" className="icon-btn" onClick={onCancel} aria-label="Voltar">
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <h1>Revisar contrato</h1>
        <span className="orc-form-header-spacer" />
      </header>

      <div className="orc-form-scroll">
        {!carregandoPerfil && !perfilCompleto && (
          <div className="card contrato-alerta">
            <p className="contrato-alerta-titulo">
              Complete seus dados em Configurações antes de gerar o contrato.
            </p>
            <p className="field-hint">
              Nome completo, CPF/CNPJ, telefone e endereço do CONTRATADO ainda não estão completos.
            </p>
            <button type="button" className="btn-secondary" onClick={onIrParaConfiguracoes}>
              Ir para Configurações
            </button>
          </div>
        )}

        <div className="card resumo-list">
          <div className="resumo-row">
            <span className="resumo-label">Contratante</span>
            <span className="resumo-value">{snapshot.contratanteNome}</span>
          </div>
          <div className="resumo-row">
            <span className="resumo-label">CPF/CNPJ</span>
            <span className="resumo-value">{snapshot.contratanteCpfCnpj}</span>
          </div>

          <div className="resumo-divider" />

          <div className="resumo-row">
            <span className="resumo-label">Evento</span>
            <span className="resumo-value">{snapshot.tipoEvento}</span>
          </div>
          <div className="resumo-row">
            <span className="resumo-label">Data</span>
            <span className="resumo-value">{formatDateShort(snapshot.dataEvento)}</span>
          </div>
          <div className="resumo-row">
            <span className="resumo-label">Horário</span>
            <span className="resumo-value">
              {snapshot.horarioInicio ?? "—"}
              {snapshot.horarioTermino ? ` às ${snapshot.horarioTermino}` : ""}
            </span>
          </div>
          <div className="resumo-row">
            <span className="resumo-label">Local</span>
            <span className="resumo-value">
              {snapshot.local ? `${snapshot.local} — ` : ""}
              {snapshot.cidadeEvento}
            </span>
          </div>
          <div className="resumo-row">
            <span className="resumo-label">Forma de pagamento</span>
            <span className="resumo-value">{snapshot.formaPagamento ?? "Não informada"}</span>
          </div>

          <div className="resumo-divider" />

          <div className="resumo-row">
            <span className="resumo-label">Valor contratado</span>
            <span className="resumo-value destaque">{formatCurrencyBRL(snapshot.valorTotal)}</span>
          </div>
          <div className="resumo-row">
            <span className="resumo-label">Parcela 1 (50%)</span>
            <span className="resumo-value">
              {formatCurrencyBRL(snapshot.parcela1Valor)}
              {snapshot.parcela1Vencimento
                ? ` · ${formatDateShort(snapshot.parcela1Vencimento)}`
                : ""}
            </span>
          </div>
          <div className="resumo-row">
            <span className="resumo-label">Parcela 2 (50%)</span>
            <span className="resumo-value">
              {formatCurrencyBRL(snapshot.parcela2Valor)}
              {snapshot.parcela2Vencimento
                ? ` · ${formatDateShort(snapshot.parcela2Vencimento)}`
                : ""}
            </span>
          </div>
        </div>

        <section className="form-section">
          <label className="field">
            <span className="field-label">Foro</span>
            <input className="field-input" value={foro} onChange={(e) => setForo(e.target.value)} />
          </label>

          <div className="field">
            <span className="field-label">
              Autoriza uso de imagens do evento pelo DJ MADDOX para divulgação profissional?
            </span>
            <div className="autoriza-imagem-row">
              <button
                type="button"
                className={`filtro-chip ${autorizaImagem === true ? "is-active" : ""}`}
                onClick={() => setAutorizaImagem(true)}
              >
                Sim
              </button>
              <button
                type="button"
                className={`filtro-chip ${autorizaImagem === false ? "is-active" : ""}`}
                onClick={() => setAutorizaImagem(false)}
              >
                Não
              </button>
            </div>
          </div>

          {erro && <span className="field-error">{erro}</span>}
        </section>
      </div>

      <div className="orc-form-footer detail-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={handleVisualizar}
          disabled={!!carregando}
        >
          {carregando === "visualizar" ? "Abrindo..." : "Visualizar contrato"}
        </button>
        <button type="button" className="btn-primary" onClick={handleGerar} disabled={!!carregando}>
          {carregando === "gerar" ? "Gerando..." : "Gerar PDF"}
        </button>
      </div>
    </div>
  );
}
