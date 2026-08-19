import { createClient } from "@supabase/supabase-js";

// Único lugar do projeto que cria o cliente Supabase. Qualquer repositório
// que precise falar com o banco importa `supabase` daqui.
//
// As variáveis vêm do arquivo .env (nunca comitado — veja .env.example).
// Somente a chave "anon" pública é usada aqui; a service_role NUNCA deve
// aparecer no frontend.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigurado = Boolean(supabaseUrl && supabaseAnonKey);

if (!supabaseConfigurado) {
  // Não lança erro — deixamos a tela de login mostrar um aviso claro em vez
  // de quebrar o app inteiro com uma tela branca.
  console.error(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configurados. " +
      "Copie .env.example para .env e preencha com os dados do seu projeto."
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
