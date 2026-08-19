import type { Evento, ContratoSnapshot } from "../types";

export interface CampoFaltante {
  campo: string;
  label: string;
}

// Campos mínimos exigidos pela Etapa 5 para gerar contrato. A maioria já é
// obrigatória desde o "Completar fechamento" (Etapa 3) — horário e local é
// que eram opcionais naquela etapa e passam a ser exigidos aqui.
export function validarDadosContrato(evento: Evento): CampoFaltante[] {
  const faltando: CampoFaltante[] = [];

  if (!evento.cliente?.trim()) faltando.push({ campo: "cliente", label: "Nome completo" });
  if (!evento.cpfCnpj?.trim()) faltando.push({ campo: "cpfCnpj", label: "CPF/CNPJ" });
  if (!evento.telefone?.trim()) faltando.push({ campo: "telefone", label: "Telefone" });
  if (!evento.tipoEvento?.trim()) faltando.push({ campo: "tipoEvento", label: "Tipo de evento" });
  if (!evento.data) faltando.push({ campo: "data", label: "Data do evento" });
  if (!evento.horario?.trim()) faltando.push({ campo: "horario", label: "Horário" });
  if (!evento.cidade?.trim()) faltando.push({ campo: "cidade", label: "Cidade" });
  if (!evento.local?.trim()) faltando.push({ campo: "local", label: "Local" });
  if (!evento.valorContratado || evento.valorContratado <= 0) {
    faltando.push({ campo: "valorContratado", label: "Valor contratado" });
  }

  return faltando;
}

// Segunda camada de validação, feita em cima dos dados já "congelados" no
// snapshot, bem em cima da hora de gerar o PDF de fato (defesa extra: mesmo
// que algo passe pelas checagens anteriores, aqui a mensagem aponta
// exatamente o campo que falta, em vez de um erro genérico).
export function validarSnapshotParaGeracao(snapshot: ContratoSnapshot): string | null {
  const obrigatorios: { valor: string | number | undefined; label: string }[] = [
    { valor: snapshot.contratanteNome?.trim(), label: "nome do contratante" },
    { valor: snapshot.contratanteCpfCnpj?.trim(), label: "CPF/CNPJ do contratante" },
    { valor: snapshot.contratanteTelefone?.trim(), label: "telefone do contratante" },
    { valor: snapshot.tipoEvento?.trim(), label: "tipo de evento" },
    { valor: snapshot.dataEvento, label: "data do evento" },
    { valor: snapshot.horarioInicio?.trim(), label: "horário do evento" },
    { valor: snapshot.local?.trim(), label: "local do evento" },
    { valor: snapshot.cidadeEvento?.trim(), label: "cidade do evento" }
  ];

  for (const item of obrigatorios) {
    if (!item.valor) return `Falta preencher: ${item.label}.`;
  }

  if (!snapshot.valorTotal || snapshot.valorTotal <= 0) {
    return "Falta preencher: valor contratado.";
  }
  if (!snapshot.parcela1Valor || snapshot.parcela1Valor <= 0) {
    return "Falta preencher: valor da primeira parcela.";
  }
  if (!snapshot.parcela2Valor || snapshot.parcela2Valor <= 0) {
    return "Falta preencher: valor da segunda parcela.";
  }

  // Forma de pagamento é opcional de propósito — não bloqueia a geração.
  return null;
}
