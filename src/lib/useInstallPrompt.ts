import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  const navegadorStandalone = (navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia("(display-mode: standalone)").matches || navegadorStandalone === true;
}

export function useInstallPrompt() {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null);
  const [instalado, setInstalado] = useState(isStandalone());

  useEffect(() => {
    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setEvento(e as BeforeInstallPromptEvent);
    }
    function handleInstalled() {
      setInstalado(true);
      setEvento(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    const mq = window.matchMedia("(display-mode: standalone)");
    const handleChange = () => setInstalado(isStandalone());
    mq.addEventListener?.("change", handleChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
      mq.removeEventListener?.("change", handleChange);
    };
  }, []);

  async function instalar(): Promise<void> {
    if (!evento) return;
    await evento.prompt();
    await evento.userChoice;
    setEvento(null);
  }

  return {
    // true só quando o navegador ofereceu o prompt nativo (tipicamente
    // Android/Chrome) e o app ainda não está instalado.
    podeInstalar: !!evento && !instalado,
    instalado,
    instalar
  };
}
