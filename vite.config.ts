import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // "prompt": o app avisa "Nova versão disponível" e só atualiza quando
      // o usuário confirmar (em vez de trocar a versão sozinho no meio do
      // uso, o que poderia interromper um formulário sendo preenchido).
      registerType: "prompt",
      // O registro do service worker é feito manualmente em
      // src/components/UpdatePrompt.tsx (via virtual:pwa-register), então
      // desativamos a injeção automática do plugin para não registrar duas vezes.
      injectRegister: null,
      includeAssets: ["apple-touch-icon.png", "favicon.png"],
      manifest: {
        id: "/",
        name: "MADDOX Management",
        short_name: "MADDOX",
        description: "Gestão de orçamentos, eventos, contratos e financeiro do DJ MADDOX.",
        theme_color: "#1A1815",
        background_color: "#FAF7F1",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/pwa-192-maskable.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/pwa-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        // Só faz cache dos arquivos estáticos do próprio app (JS, CSS, HTML,
        // ícones, fontes do build). Chamadas ao Supabase vão para outro
        // domínio (supabase.co) e nunca passam pelo cache do service worker
        // porque nenhuma regra de "runtimeCaching" foi adicionada para elas
        // — de propósito, para nunca guardar dados privados/financeiros.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        navigateFallback: "/index.html"
      },
      devOptions: {
        enabled: false
      }
    })
  ]
});
