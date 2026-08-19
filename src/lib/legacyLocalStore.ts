// Acesso somente-leitura às chaves ANTIGAS do localStorage (usadas nas
// Etapas 2 a 5, antes do Supabase). Este arquivo existe só para a migração
// conseguir ler o que já estava salvo no aparelho — nenhuma tela deve
// importar isso fora do fluxo de migração.

import { readJSON } from "./storage";
import type { Orcamento, Evento, Parcela, Pagamento, Despesa, Contrato } from "../types";

const KEYS = {
  orcamentos: "maddox:orcamentos",
  eventos: "maddox:eventos",
  parcelas: "maddox:parcelas",
  pagamentos: "maddox:pagamentos",
  despesas: "maddox:despesas",
  contratos: "maddox:contratos"
};

export function lerOrcamentosLocais(): Orcamento[] {
  return readJSON<Orcamento[]>(KEYS.orcamentos, []);
}

export function lerEventosLocais(): Evento[] {
  return readJSON<Evento[]>(KEYS.eventos, []);
}

export function lerParcelasLocais(): Parcela[] {
  return readJSON<Parcela[]>(KEYS.parcelas, []);
}

export function lerPagamentosLocais(): Pagamento[] {
  return readJSON<Pagamento[]>(KEYS.pagamentos, []);
}

export function lerDespesasLocais(): Despesa[] {
  return readJSON<Despesa[]>(KEYS.despesas, []);
}

export function lerContratosLocais(): Contrato[] {
  return readJSON<Contrato[]>(KEYS.contratos, []);
}

export function existemDadosLocais(): boolean {
  return (
    lerOrcamentosLocais().length > 0 ||
    lerEventosLocais().length > 0 ||
    lerParcelasLocais().length > 0 ||
    lerPagamentosLocais().length > 0 ||
    lerDespesasLocais().length > 0 ||
    lerContratosLocais().length > 0
  );
}
