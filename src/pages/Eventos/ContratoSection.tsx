import { useEffect, useState } from "react";
import { FileText, Eye, Share2, RefreshCw, UploadCloud } from "lucide-react";
import type { Evento, Parcela, Contrato, Perfil } from "../../types";
import { validarDadosContrato } from "../../lib/contratoValidacao";
import { construirSnapshotContrato, snapshotsIguais } from "../../lib/contratoSnapshot";
import { gerarContratoPdfBlob } from "../../lib/pdfGenerator";
import {
  compartilharArquivo,
  baixarArquivo,
  abrirArquivoEmNovaAba,
  sanitizarNomeArquivo
} from "../../lib/arquivo";
import { gerarOuAtualizarContrato, removerAssinatura, salvarCaminhoOriginal } from "../../data/contratosRepository";
import { getPerfil } from "../../data/perfilRepository";
import { montarDadosContratado, perfilCompletoParaContrato } from "../../config/contratado";
import {
  enviarContratoOriginal,
  baixarArquivoDoStorage,
  gerarUrlAssinada,
  removerArquivo
} from "../../lib/storageSupabase";
import ConfirmSheet from "../../components/ConfirmSheet";

interface ContratoSectionProps {
  evento: Evento;
  parcelas: Parcela[];
  contrato: Contrato | null;
  onEditarEvento: () => void;
  onRevisar: () => void;
  onImportar: () => void;
  onIrParaConfiguracoes: () => void;
  onAtualizado: () => Promise<void> | void;
}

const statusLabel = { gerado: "Gerado", assinado: "Assinado" } as const;
const statusClass = { gerado: "aberto", assinado: "fechado" } as const;

const MSG_ARQUIVO_NAO_ENCONTRADO = "Arquivo PDF não encontrado. Gere o contrato novamente.";

function nomeArquivoPdf(numero: string, cliente: string): string {
  return `Contrato_MADDOX_${numero}_${sanitizarNomeArquivo(cliente)}.pdf`;
}

export default function ContratoSection({
  evento,
  parcelas,
  contrato,
  onEditarEvento,
  onRevisar,
  onImportar,
  onIrParaConfiguracoes,
  onAtualizado
}: ContratoSectionProps) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);
  const [carregando, setCarregando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmRegenerar, setConfirmRegenerar] = useState(false);
  const [confirmRemoverAssinatura, setConfirmRemoverAssinatura] = useState(false);

  useEffect(() => {
    getPerfil()
      .then(setPerfil)
      .catch(() => setPerfil(null))
      .finally(() => setCarregandoPerfil(false));
  }, []);

  const faltandoEvento = validarDadosContrato(evento);
  const perfilCompleto = perfilCompletoParaContrato(perfil);

  // Usado apenas para (re)gerar o PDF do zero — nunca para simplesmente
  // visualizar/compartilhar um contrato já existente (isso baixa do Storage).
  async function gerarBlobDoContrato(c: Contrato) {
    return gerarContratoPdfBlob({
      numero: c.numero,
      snapshot: c.snapshot,
      autorizaImagem: c.autorizaImagem,
      foro: c.foro,
      contratado: montarDadosContratado(perfil)
    });
  }

  // Busca o PDF já salvo no Storage privado (nunca regenera via pdfmake) —
  // isso garante que Visualizar/Compartilhar nunca dependam da geração do
  // PDF funcionar de novo, e sempre mostrem exatamente o arquivo que foi
  // gerado e conferido da última vez.
  async function obterBlobSalvo(c: Contrato): Promise<Blob> {
    if (!c.originalFilePath) {
      throw new Error(MSG_ARQUIVO_NAO_ENCONTRADO);
    }
    return baixarArquivoDoStorage(c.originalFilePath);
  }

  async function handleVisualizarOriginal() {
    if (!contrato) return;
    setErro(null);

    if (!contrato.originalFilePath) {
      setErro(MSG_ARQUIVO_NAO_ENCONTRADO);
      return;
    }

    setCarregando("visualizar");
    try {
      const blob = await obterBlobSalvo(contrato);
      abrirArquivoEmNovaAba(blob);
    } catch (error) {
      console.error("[PDF] Falha ao abrir contrato", error);
      setErro(
        error instanceof Error && error.message === MSG_ARQUIVO_NAO_ENCONTRADO
          ? MSG_ARQUIVO_NAO_ENCONTRADO
          : "Não foi possível abrir o contrato. Verifique sua conexão e tente novamente."
      );
    } finally {
      setCarregando(null);
    }
  }

  async function handleCompartilhar() {
    if (!contrato) return;
    setErro(null);

    if (!contrato.originalFilePath) {
      setErro(MSG_ARQUIVO_NAO_ENCONTRADO);
      return;
    }

    setCarregando("compartilhar");
    try {
      const blob = await obterBlobSalvo(contrato);
      const nome = nomeArquivoPdf(contrato.numero, evento.cliente);

      // eslint-disable-next-line no-console
      console.log("[PDF] PDF_SHARE_START");
      const resultado = await compartilharArquivo(
        blob,
        nome,
        `Contrato ${contrato.numero}`,
        `Contrato ${contrato.numero} — ${evento.cliente}`
      );

      if (resultado === "cancelado") {
        // usuário fechou a folha de compartilhamento — não é erro, não faz nada
      } else if (resultado === "indisponivel") {
        // navegador não suporta compartilhar arquivo — cai para baixar, sem alarme
        baixarArquivo(blob, nome);
      } else if (resultado === "erro") {
        setErro("Não foi possível compartilhar o PDF. Você pode abrir ou baixar o contrato.");
        baixarArquivo(blob, nome);
      }
    } catch (error) {
      console.error("[PDF] Falha ao compartilhar contrato", error);
      setErro(
        error instanceof Error && error.message === MSG_ARQUIVO_NAO_ENCONTRADO
          ? MSG_ARQUIVO_NAO_ENCONTRADO
          : "Não foi possível preparar o PDF para compartilhar. Verifique sua conexão e tente novamente."
      );
    } finally {
      setCarregando(null);
    }
  }

  async function handleGerarNovamente() {
    if (!contrato) return;
    const snapshotAtual = construirSnapshotContrato(evento, parcelas);
    if (!contrato.originalFilePath || !snapshotsIguais(snapshotAtual, contrato.snapshot)) {
      setConfirmRegenerar(true);
      return;
    }
    await handleVisualizarOriginal();
  }

  async function confirmarRegenerar() {
    if (!contrato || carregando) return;
    setErro(null);
    setCarregando("regenerar");
    try {
      const snapshotAtual = construirSnapshotContrato(evento, parcelas);
      const atualizado = await gerarOuAtualizarContrato(
        evento.id,
        snapshotAtual,
        contrato.autorizaImagem,
        contrato.foro
      );
      const blob = await gerarBlobDoContrato(atualizado);

      // Assim como na primeira geração, o upload precisa dar certo — sem
      // isso, o contrato fica "gerado" mas sem arquivo válido no Storage.
      const path = await enviarContratoOriginal(evento.id, atualizado.id, blob);
      await salvarCaminhoOriginal(evento.id, path);
      // eslint-disable-next-line no-console
      console.log("[PDF] PDF_PATH_SAVED", { path });

      abrirArquivoEmNovaAba(blob);
      await onAtualizado();
    } catch (error) {
      console.error("[PDF] Falha ao gerar nova versão do contrato", error);
      setErro("Não foi possível gerar a nova versão do contrato. Verifique sua conexão e tente novamente.");
    } finally {
      setCarregando(null);
      setConfirmRegenerar(false);
    }
  }

  async function handleVisualizarAssinado() {
    if (!contrato?.assinadoArquivoCaminho) return;
    setErro(null);
    setCarregando("assinado");
    try {
      const url = await gerarUrlAssinada(contrato.assinadoArquivoCaminho);
      window.open(url, "_blank");
    } catch (error) {
      console.error("[PDF] Falha ao abrir contrato assinado", error);
      setErro("Não foi possível abrir o contrato assinado. Verifique sua conexão e tente novamente.");
    } finally {
      setCarregando(null);
    }
  }

  async function confirmarRemoverAssinatura() {
    if (!contrato || carregando) return;
    setCarregando("removerAssinatura");
    try {
      if (contrato.assinadoArquivoCaminho) {
        await removerArquivo(contrato.assinadoArquivoCaminho).catch(() => undefined);
      }
      await removerAssinatura(evento.id);
      await onAtualizado();
    } finally {
      setCarregando(null);
      setConfirmRemoverAssinatura(false);
    }
  }

  if (carregandoPerfil) {
    return (
      <div className="card contrato-placeholder">
        <p className="contrato-placeholder-text">Carregando...</p>
      </div>
    );
  }

  if (!contrato) {
    const faltandoAlgo = faltandoEvento.length > 0 || !perfilCompleto;
    return (
      <div className="card contrato-placeholder">
        <FileText size={22} strokeWidth={1.7} color="var(--ink-faint)" />
        <p className="contrato-placeholder-text">Contrato ainda não gerado</p>

        {faltandoAlgo ? (
          <div className="contrato-alerta">
            <p className="contrato-alerta-titulo">
              Complete os dados abaixo antes de gerar o contrato.
            </p>
            {faltandoEvento.length > 0 && (
              <ul className="contrato-alerta-lista">
                {faltandoEvento.map((f) => (
                  <li key={f.campo}>{f.label}</li>
                ))}
              </ul>
            )}
            {!perfilCompleto && (
              <ul className="contrato-alerta-lista">
                <li>Seus dados (Configurações): nome completo, CPF/CNPJ, telefone e endereço</li>
              </ul>
            )}
            <div className="contrato-alerta-acoes">
              {faltandoEvento.length > 0 && (
                <button type="button" className="btn-secondary" onClick={onEditarEvento}>
                  Editar evento
                </button>
              )}
              {!perfilCompleto && (
                <button type="button" className="btn-secondary" onClick={onIrParaConfiguracoes}>
                  Ir para Configurações
                </button>
              )}
            </div>
          </div>
        ) : (
          <button type="button" className="btn-primary contrato-btn-gerar" onClick={onRevisar}>
            Gerar contrato
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="card contrato-card">
      <div className="contrato-card-top">
        <div>
          <p className="contrato-numero">Contrato {contrato.numero}</p>
          <span className={`status-pill ${statusClass[contrato.status]}`}>
            {statusLabel[contrato.status]}
          </span>
        </div>
      </div>

      {erro && <p className="field-error">{erro}</p>}

      <div className="contrato-acoes">
        <button
          type="button"
          className="btn-secondary"
          onClick={handleVisualizarOriginal}
          disabled={!!carregando}
        >
          <Eye size={16} strokeWidth={1.9} />
          {carregando === "visualizar" ? "Abrindo..." : "Visualizar"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleCompartilhar}
          disabled={!!carregando}
        >
          <Share2 size={16} strokeWidth={1.9} />
          {carregando === "compartilhar" ? "Preparando..." : "Compartilhar PDF"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleGerarNovamente}
          disabled={!!carregando}
        >
          <RefreshCw size={16} strokeWidth={1.9} />
          {carregando === "regenerar" ? "Gerando..." : "Gerar PDF novamente"}
        </button>
        <button type="button" className="btn-secondary" onClick={onImportar} disabled={!!carregando}>
          <UploadCloud size={16} strokeWidth={1.9} />
          Importar assinado
        </button>
      </div>

      {contrato.status === "assinado" && (
        <div className="contrato-assinado-box">
          <p className="contrato-assinado-titulo">Contrato assinado</p>
          <p className="contrato-assinado-arquivo">{contrato.assinadoArquivoNome}</p>
          <div className="contrato-acoes">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleVisualizarOriginal}
              disabled={!!carregando}
            >
              Visualizar original
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleVisualizarAssinado}
              disabled={!!carregando}
            >
              Visualizar assinado
            </button>
          </div>
          <button
            type="button"
            className="link-btn contrato-remover-link"
            onClick={() => setConfirmRemoverAssinatura(true)}
          >
            Remover assinatura importada
          </button>
        </div>
      )}

      <ConfirmSheet
        open={confirmRegenerar}
        title="Gerar nova versão do PDF?"
        description="Os dados do evento foram alterados desde a geração anterior. Deseja gerar uma nova versão do PDF?"
        confirmLabel="Gerar nova versão"
        tone="positive"
        confirming={carregando === "regenerar"}
        onCancel={() => setConfirmRegenerar(false)}
        onConfirm={confirmarRegenerar}
      />

      <ConfirmSheet
        open={confirmRemoverAssinatura}
        title="Remover contrato assinado?"
        description="O arquivo assinado será removido da sua conta. Você poderá importar novamente depois."
        confirmLabel="Remover"
        tone="negative"
        confirming={carregando === "removerAssinatura"}
        onCancel={() => setConfirmRemoverAssinatura(false)}
        onConfirm={confirmarRemoverAssinatura}
      />
    </div>
  );
}
