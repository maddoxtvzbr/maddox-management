import type { Evento, Parcela, ContratoSnapshot, EnderecoContratante } from "../types";
import { round2 } from "./financeiro";

function formatarEnderecoContratante(endereco?: EnderecoContratante): string | undefined {
  if (!endereco) return undefined;
  const partes = [
    endereco.rua && endereco.numero
      ? `${endereco.rua}, ${endereco.numero}`
      : endereco.rua || undefined,
    endereco.bairro,
    endereco.cidade && endereco.estado
      ? `${endereco.cidade} - ${endereco.estado}`
      : endereco.cidade
  ].filter((parte): parte is string => Boolean(parte));
  return partes.length ? partes.join(", ") : undefined;
}

// Monta o snapshot a partir dos dados reais e atuais do evento/parcelas.
// Nunca inventa valores de parcela: usa as parcelas de fato existentes no
// financeiro (mesmo que tenham sido alteradas manualmente).
export function construirSnapshotContrato(evento: Evento, parcelas: Parcela[]): ContratoSnapshot {
  const entrada = parcelas.find((p) => p.descricao === "Entrada");
  const saldo = parcelas.find((p) => p.descricao === "Saldo final");
  const metade = round2(evento.valorContratado / 2);

  return {
    contratanteNome: evento.cliente,
    contratanteCpfCnpj: evento.cpfCnpj,
    contratanteTelefone: evento.telefone,
    contratanteEmail: evento.email,
    contratanteEndereco: formatarEnderecoContratante(evento.endereco),
    tipoEvento: evento.tipoEvento,
    dataEvento: evento.data,
    horarioInicio: evento.horario,
    horarioTermino: evento.horarioTermino,
    local: evento.local,
    enderecoEvento: evento.enderecoEvento,
    cidadeEvento: evento.cidade,
    valorTotal: evento.valorContratado,
    parcela1Valor: entrada?.valor ?? metade,
    parcela1Vencimento: entrada?.vencimento ?? "",
    parcela2Valor: saldo?.valor ?? metade,
    parcela2Vencimento: saldo?.vencimento ?? "",
    formaPagamento: evento.formaPagamento
  };
}

export function snapshotsIguais(a: ContratoSnapshot, b: ContratoSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
