// Camada genérica de persistência local. Este é o único arquivo do projeto
// que deve tocar diretamente em window.localStorage — qualquer outra parte
// do app deve passar por aqui (ou pelos repositórios em src/data).
//
// Quando o Supabase for adicionado, os repositórios passam a chamar a API
// do Supabase em vez de readJSON/writeJSON, sem exigir mudanças nas telas.

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`[storage] Falha ao ler "${key}"`, error);
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    // Pode falhar em modo privado do Safari/iOS ou se o armazenamento estiver cheio.
    console.error(`[storage] Falha ao salvar "${key}"`, error);
    return false;
  }
}
