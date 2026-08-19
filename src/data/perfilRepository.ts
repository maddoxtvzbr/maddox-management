import type { Perfil, PerfilInput } from "../types";
import { supabase } from "../lib/supabaseClient";

function fromRow(row: Record<string, unknown>): Perfil {
  return {
    id: row.id as string,
    nomeArtistico: (row.artistic_name as string) || "DJ MADDOX",
    nomeCompleto: (row.full_name as string) ?? undefined,
    documento: (row.document as string) ?? undefined,
    telefone: (row.phone as string) ?? undefined,
    email: (row.email as string) ?? undefined,
    cep: (row.postal_code as string) ?? undefined,
    endereco: (row.address as string) ?? undefined,
    numero: (row.address_number as string) ?? undefined,
    bairro: (row.neighborhood as string) ?? undefined,
    cidade: (row.city as string) ?? undefined,
    estado: (row.state as string) ?? undefined,
    foroPadrao: (row.default_forum as string) || "Rio Verde - Goiás"
  };
}

// O gatilho handle_new_user (ver SQL) cria a linha automaticamente quando o
// usuário é criado no Supabase Auth, então normalmente sempre existe — mas
// tratamos o caso de não existir ainda (upsert) por segurança.
export async function getPerfil(): Promise<Perfil | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (userError || !userId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? fromRow(data) : null;
}

export async function salvarPerfil(input: PerfilInput): Promise<Perfil> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Usuário não autenticado.");

  const payload = {
    id: userId,
    artistic_name: input.nomeArtistico.trim() || "DJ MADDOX",
    full_name: input.nomeCompleto?.trim() || null,
    document: input.documento?.trim() || null,
    phone: input.telefone?.trim() || null,
    email: input.email?.trim() || null,
    postal_code: input.cep?.trim() || null,
    address: input.endereco?.trim() || null,
    address_number: input.numero?.trim() || null,
    neighborhood: input.bairro?.trim() || null,
    city: input.cidade?.trim() || null,
    state: input.estado?.trim() || null,
    default_forum: input.foroPadrao.trim() || "Rio Verde - Goiás"
  };

  const { data, error } = await supabase.from("profiles").upsert(payload).select().single();
  if (error) throw error;
  return fromRow(data);
}
