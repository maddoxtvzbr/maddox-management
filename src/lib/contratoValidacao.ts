import type { Evento } from "../types";

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
