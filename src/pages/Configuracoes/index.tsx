import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { ChevronLeft, LogOut, Smartphone } from "lucide-react";
import type { Perfil, PerfilInput } from "../../types";
import { getPerfil, salvarPerfil } from "../../data/perfilRepository";
import { exportarBackup, importarBackup } from "../../lib/backup";
import {
  existemDadosLocaisPendentes,
  migrarDadosLocais,
  migracaoJaFoiFeita
} from "../../lib/migracao";
import { useAuth } from "../../auth/AuthContext";
import { useInstallPrompt } from "../../lib/useInstallPrompt";
import ConfirmSheet from "../../components/ConfirmSheet";
import "./Configuracoes.css";

interface ConfiguracoesProps {
  onBack: () => void;
}

const FORM_VAZIO: PerfilInput = {
  nomeArtistico: "DJ MADDOX",
  nomeCompleto: "",
  documento: "",
  telefone: "",
  email: "",
  cep: "",
  endereco: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  foroPadrao: "Rio Verde - Goiás"
};

export default function Configuracoes({ onBack }: ConfiguracoesProps) {
  const { signOut } = useAuth();
  const { podeInstalar, instalado, instalar } = useInstallPrompt();
  const [form, setForm] = useState<PerfilInput>(FORM_VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [mensagemBackup, setMensagemBackup] = useState<string | null>(null);

  const [temDadosLocais, setTemDadosLocais] = useState(false);
  const [jaMigrou, setJaMigrou] = useState(false);
  const [confirmMigrar, setConfirmMigrar] = useState(false);
  const [migrando, setMigrando] = useState(false);
  const [mensagemMigracao, setMensagemMigracao] = useState<string | null>(null);

  const [confirmSair, setConfirmSair] = useState(false);

  useEffect(() => {
    getPerfil()
      .then((perfil: Perfil | null) => {
        if (perfil) {
          setForm({
            nomeArtistico: perfil.nomeArtistico,
            nomeCompleto: perfil.nomeCompleto ?? "",
            documento: perfil.documento ?? "",
            telefone: perfil.telefone ?? "",
            email: perfil.email ?? "",
            cep: perfil.cep ?? "",
            endereco: perfil.endereco ?? "",
            numero: perfil.numero ?? "",
            bairro: perfil.bairro ?? "",
            cidade: perfil.cidade ?? "",
            estado: perfil.estado ?? "",
            foroPadrao: perfil.foroPadrao
          });
        }
      })
      .catch(() => setErro("Não foi possível carregar seus dados. Verifique sua conexão."))
      .finally(() => setCarregando(false));

    setTemDadosLocais(existemDadosLocaisPendentes());
    setJaMigrou(migracaoJaFoiFeita());
  }, []);

  function set<K extends keyof PerfilInput>(key: K, value: PerfilInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSalvo(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (salvando) return;
    setErro(null);
    setSalvando(true);
    try {
      await salvarPerfil(form);
      setSalvo(true);
    } catch {
      setErro("Não foi possível salvar. Verifique sua conexão e tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleExportar() {
    setExportando(true);
    setMensagemBackup(null);
    try {
      await exportarBackup();
    } catch {
      setMensagemBackup("Não foi possível gerar o backup. Tente novamente.");
    } finally {
      setExportando(false);
    }
  }

  async function handleImportar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportando(true);
    setMensagemBackup(null);
    const resultado = await importarBackup(file);
    setMensagemBackup(resultado.mensagem);
    setImportando(false);
  }

  async function handleMigrar() {
    setMigrando(true);
    setMensagemMigracao(null);
    const resultado = await migrarDadosLocais();
    setMensagemMigracao(resultado.mensagem);
    setMigrando(false);
    setConfirmMigrar(false);
    if (resultado.sucesso) setJaMigrou(true);
  }

  return (
    <div className="orc-form-screen">
      <header className="orc-form-header">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Voltar">
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <h1>Configurações</h1>
        <span className="orc-form-header-spacer" />
      </header>

      <div className="orc-form-scroll">
        {temDadosLocais && (
          <section className="card contrato-alerta">
            <p className="contrato-alerta-titulo">Encontramos dados salvos neste aparelho</p>
            <p className="field-hint">
              {jaMigrou
                ? "Já migramos esses dados para sua conta. Você pode migrar novamente sem risco de duplicar."
                : "Você deseja enviá-los para sua conta para não correr risco de perda?"}
            </p>
            {mensagemMigracao && <p className="field-hint">{mensagemMigracao}</p>}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setConfirmMigrar(true)}
              disabled={migrando}
            >
              {migrando ? "Migrando..." : jaMigrou ? "Migrar novamente" : "Migrar agora"}
            </button>
          </section>
        )}

        <form className="form-section" onSubmit={handleSubmit}>
          <p className="form-section-title">Meus dados / Dados do contratado</p>

          {carregando ? (
            <p className="field-hint">Carregando...</p>
          ) : (
            <>
              <label className="field">
                <span className="field-label">Nome artístico</span>
                <input
                  className="field-input"
                  value={form.nomeArtistico}
                  onChange={(e) => set("nomeArtistico", e.target.value)}
                />
              </label>

              <label className="field">
                <span className="field-label">Nome completo ou razão social</span>
                <input
                  className="field-input"
                  value={form.nomeCompleto}
                  onChange={(e) => set("nomeCompleto", e.target.value)}
                />
              </label>

              <label className="field">
                <span className="field-label">CPF/CNPJ</span>
                <input
                  className="field-input"
                  value={form.documento}
                  onChange={(e) => set("documento", e.target.value)}
                  inputMode="numeric"
                />
              </label>

              <label className="field">
                <span className="field-label">Telefone</span>
                <input
                  className="field-input"
                  value={form.telefone}
                  onChange={(e) => set("telefone", e.target.value)}
                  inputMode="tel"
                />
              </label>

              <label className="field">
                <span className="field-label">E-mail</span>
                <input
                  className="field-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </label>

              <div className="field-row">
                <label className="field">
                  <span className="field-label">CEP (opcional)</span>
                  <input
                    className="field-input"
                    value={form.cep}
                    onChange={(e) => set("cep", e.target.value)}
                    inputMode="numeric"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Número</span>
                  <input
                    className="field-input"
                    value={form.numero}
                    onChange={(e) => set("numero", e.target.value)}
                  />
                </label>
              </div>

              <label className="field">
                <span className="field-label">Endereço</span>
                <input
                  className="field-input"
                  value={form.endereco}
                  onChange={(e) => set("endereco", e.target.value)}
                />
              </label>

              <label className="field">
                <span className="field-label">Bairro</span>
                <input
                  className="field-input"
                  value={form.bairro}
                  onChange={(e) => set("bairro", e.target.value)}
                />
              </label>

              <div className="field-row">
                <label className="field">
                  <span className="field-label">Cidade</span>
                  <input
                    className="field-input"
                    value={form.cidade}
                    onChange={(e) => set("cidade", e.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="field-label">Estado</span>
                  <input
                    className="field-input"
                    value={form.estado}
                    onChange={(e) => set("estado", e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="GO"
                  />
                </label>
              </div>

              <label className="field">
                <span className="field-label">Foro padrão</span>
                <input
                  className="field-input"
                  value={form.foroPadrao}
                  onChange={(e) => set("foroPadrao", e.target.value)}
                />
              </label>

              {erro && <span className="field-error">{erro}</span>}
              {salvo && !erro && <span className="login-aviso">Dados salvos.</span>}

              <button type="submit" className="btn-primary" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar dados"}
              </button>
            </>
          )}
        </form>

        <section className="form-section">
          <p className="form-section-title">Backup</p>
          <p className="field-hint">
            Gera um arquivo com seus orçamentos, eventos, parcelas, pagamentos, despesas e dados de
            contratos (os PDFs não entram no arquivo).
          </p>
          <button type="button" className="btn-secondary" onClick={handleExportar} disabled={exportando}>
            {exportando ? "Gerando..." : "Exportar backup"}
          </button>

          <label className="btn-secondary upload-dropzone-inline">
            {importando ? "Importando..." : "Importar backup"}
            <input
              type="file"
              accept="application/json,.json"
              onChange={handleImportar}
              hidden
              disabled={importando}
            />
          </label>
          {mensagemBackup && <p className="field-hint">{mensagemBackup}</p>}
        </section>

        <section className="form-section">
          <p className="form-section-title">Aplicativo</p>

          {instalado ? (
            <p className="field-hint">Aplicativo instalado neste dispositivo.</p>
          ) : podeInstalar ? (
            <>
              <p className="field-hint">
                Instale o MADDOX Management na tela inicial para abrir como um aplicativo.
              </p>
              <button type="button" className="btn-secondary" onClick={instalar}>
                <Smartphone size={16} strokeWidth={1.9} />
                Instalar MADDOX Management
              </button>
            </>
          ) : (
            <p className="field-hint">
              No iPhone: toque em Compartilhar e depois em "Adicionar à Tela de Início". No
              Android, o navegador pode oferecer a opção de instalar automaticamente ao visitar o
              app algumas vezes.
            </p>
          )}
        </section>

        <section className="form-section">
          <p className="form-section-title">Conta</p>
          <button
            type="button"
            className="btn-secondary tone-negative"
            onClick={() => setConfirmSair(true)}
          >
            <LogOut size={16} strokeWidth={1.9} />
            Sair
          </button>
        </section>
      </div>

      <ConfirmSheet
        open={confirmMigrar}
        title="Migrar dados deste aparelho?"
        description="Vamos enviar os orçamentos, eventos, parcelas, pagamentos, despesas e contratos salvos aqui para sua conta. Isso é seguro mesmo se você já migrou antes."
        confirmLabel="Migrar agora"
        tone="positive"
        confirming={migrando}
        onCancel={() => setConfirmMigrar(false)}
        onConfirm={handleMigrar}
      />

      <ConfirmSheet
        open={confirmSair}
        title="Sair da sua conta?"
        confirmLabel="Sair"
        tone="negative"
        onCancel={() => setConfirmSair(false)}
        onConfirm={signOut}
      />
    </div>
  );
}
