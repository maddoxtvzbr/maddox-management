import type { Perfil } from "../types";

// Placeholders usados SOMENTE quando o campo correspondente ainda não foi
// preenchido em Configurações. Nunca inventamos CPF, CNPJ ou endereço reais.
const PLACEHOLDER_NOME_COMPLETO = "[Nome completo / razão social do CONTRATADO — a definir]";
const PLACEHOLDER_CPF_CNPJ = "[CPF/CNPJ do CONTRATADO — a definir]";
const PLACEHOLDER_ENDERECO = "[Endereço do CONTRATADO — a definir]";
const PLACEHOLDER_TELEFONE = "[Telefone do CONTRATADO — a definir]";
const PLACEHOLDER_EMAIL = "[E-mail do CONTRATADO — a definir]";

export const FORO_PADRAO = "Rio Verde - Goiás";

export interface DadosContratado {
  nomeArtistico: string;
  nomeCompleto: string;
  cpfCnpj: string;
  endereco: string;
  cidade: string;
  telefone: string;
  email: string;
  foroPadrao: string;
}

function montarEnderecoPerfil(perfil: Perfil): string | null {
  const partes = [
    perfil.endereco && perfil.numero ? `${perfil.endereco}, ${perfil.numero}` : perfil.endereco,
    perfil.bairro,
    perfil.cidade && perfil.estado ? `${perfil.cidade} - ${perfil.estado}` : perfil.cidade
  ].filter((p): p is string => Boolean(p && p.trim()));
  return partes.length ? partes.join(", ") : null;
}

// Monta os dados do CONTRATADO a partir do perfil salvo em Configurações,
// preenchendo com placeholder apenas o que ainda não foi cadastrado.
export function montarDadosContratado(perfil: Perfil | null): DadosContratado {
  return {
    nomeArtistico: perfil?.nomeArtistico?.trim() || "DJ MADDOX",
    nomeCompleto: perfil?.nomeCompleto?.trim() || PLACEHOLDER_NOME_COMPLETO,
    cpfCnpj: perfil?.documento?.trim() || PLACEHOLDER_CPF_CNPJ,
    endereco: (perfil && montarEnderecoPerfil(perfil)) || PLACEHOLDER_ENDERECO,
    cidade:
      perfil?.cidade && perfil?.estado
        ? `${perfil.cidade} - ${perfil.estado}`
        : perfil?.cidade || "Rio Verde - GO",
    telefone: perfil?.telefone?.trim() || PLACEHOLDER_TELEFONE,
    email: perfil?.email?.trim() || PLACEHOLDER_EMAIL,
    foroPadrao: perfil?.foroPadrao?.trim() || FORO_PADRAO
  };
}

// Campos mínimos exigidos para o contrato não sair com placeholder no lugar
// de dado real. Usado para bloquear a geração e apontar para Configurações.
export function perfilCompletoParaContrato(perfil: Perfil | null): boolean {
  if (!perfil) return false;
  return Boolean(
    perfil.nomeCompleto?.trim() &&
      perfil.documento?.trim() &&
      perfil.telefone?.trim() &&
      montarEnderecoPerfil(perfil)
  );
}
