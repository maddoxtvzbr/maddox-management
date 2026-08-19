import { useEffect, useState } from "react";
import BottomNav from "./components/BottomNav";
import "./components/BottomNav.css";
import Home from "./pages/Home";
import Orcamentos from "./pages/Orcamentos";
import Agenda from "./pages/Agenda";
import Financeiro from "./pages/Financeiro";
import EventoDetail from "./pages/Eventos/EventoDetail";
import Configuracoes from "./pages/Configuracoes";
import Login from "./pages/Login/Login";
import UpdatePrompt from "./components/UpdatePrompt";
import OfflineBanner from "./components/OfflineBanner";
import { useAuth } from "./auth/AuthContext";
import { existemDadosLocaisPendentes, migracaoJaFoiFeita, migrarDadosLocais } from "./lib/migracao";
import ConfirmSheet from "./components/ConfirmSheet";

export type Tab = "inicio" | "orcamentos" | "agenda" | "financeiro";

const MIGRACAO_PERGUNTADA_KEY = "maddox:migracao-perguntada";

export default function App() {
  const { session, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("inicio");
  // Estado global: o detalhe de um evento e a tela de Configurações podem
  // ser abertos a partir de qualquer aba, então vivem aqui no topo.
  const [eventoAberto, setEventoAberto] = useState<string | null>(null);
  const [configAberta, setConfigAberta] = useState(false);
  const [mostrarPromptMigracao, setMostrarPromptMigracao] = useState(false);
  const [migrando, setMigrando] = useState(false);

  useEffect(() => {
    if (!session) return;
    const jaPerguntou = localStorage.getItem(MIGRACAO_PERGUNTADA_KEY) === "1";
    if (!jaPerguntou && !migracaoJaFoiFeita() && existemDadosLocaisPendentes()) {
      setMostrarPromptMigracao(true);
    }
  }, [session]);

  // Após logout, limpa qualquer estado de navegação em memória — assim,
  // se outra pessoa entrar com outra conta neste mesmo aparelho, começa
  // sempre do zero (nenhum evento/tela de outra sessão fica "aberto").
  useEffect(() => {
    if (!session) {
      setEventoAberto(null);
      setConfigAberta(false);
      setTab("inicio");
      setMostrarPromptMigracao(false);
    }
  }, [session]);

  async function handleMigrarAgora() {
    setMigrando(true);
    await migrarDadosLocais();
    setMigrando(false);
    setMostrarPromptMigracao(false);
    localStorage.setItem(MIGRACAO_PERGUNTADA_KEY, "1");
  }

  function handleMigrarDepois() {
    setMostrarPromptMigracao(false);
    localStorage.setItem(MIGRACAO_PERGUNTADA_KEY, "1");
  }

  return (
    <>
      <div className="top-banners">
        <UpdatePrompt />
        <OfflineBanner />
      </div>

      {loading && <div className="app-loading" aria-hidden="true" />}

      {!loading && !session && <Login />}

      {!loading && session && (
        <div className="app-shell">
          {tab === "inicio" && (
            <Home onOpenEvento={setEventoAberto} onAbrirConfiguracoes={() => setConfigAberta(true)} />
          )}
          {tab === "orcamentos" && <Orcamentos onOpenEvento={setEventoAberto} />}
          {tab === "agenda" && <Agenda onOpenEvento={setEventoAberto} />}
          {tab === "financeiro" && <Financeiro onOpenEvento={setEventoAberto} />}

          <BottomNav active={tab} onChange={setTab} />

          {eventoAberto && (
            <div className="orc-overlay evento-overlay">
              <EventoDetail
                eventoId={eventoAberto}
                onBack={() => setEventoAberto(null)}
                onIrParaConfiguracoes={() => setConfigAberta(true)}
              />
            </div>
          )}

          {configAberta && (
            <div className="orc-overlay configuracoes-overlay">
              <Configuracoes onBack={() => setConfigAberta(false)} />
            </div>
          )}

          <ConfirmSheet
            open={mostrarPromptMigracao}
            title="Encontramos dados salvos neste aparelho"
            description="Você deseja enviá-los para sua conta para não correr risco de perda?"
            confirmLabel="Migrar agora"
            cancelLabel="Depois"
            tone="positive"
            confirming={migrando}
            onCancel={handleMigrarDepois}
            onConfirm={handleMigrarAgora}
          />
        </div>
      )}
    </>
  );
}
