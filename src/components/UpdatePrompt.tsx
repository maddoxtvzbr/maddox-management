import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";

// Registra o service worker uma única vez, para o app inteiro. Como o
// registerType está como "prompt" (vite.config.ts), a nova versão fica
// esperando até o usuário confirmar — evita trocar a versão no meio de um
// formulário sendo preenchido.
export default function UpdatePrompt() {
  const [precisaAtualizar, setPrecisaAtualizar] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const update = registerSW({
      onNeedRefresh() {
        setPrecisaAtualizar(true);
      },
      onRegisterError(error) {
        console.error("[UpdatePrompt] Falha ao registrar o service worker", error);
      }
    });
    setUpdateSW(() => update);
  }, []);

  if (!precisaAtualizar) return null;

  return (
    <div className="update-banner">
      <span className="update-banner-text">Nova versão disponível</span>
      <button
        type="button"
        className="update-banner-btn"
        disabled={atualizando}
        onClick={() => {
          setAtualizando(true);
          updateSW?.(true);
        }}
      >
        {atualizando ? "Atualizando..." : "Atualizar"}
      </button>
    </div>
  );
}
