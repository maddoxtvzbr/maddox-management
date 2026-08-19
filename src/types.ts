// Estado de um orçamento. Esta é a regra central do sistema:
// somente orçamentos "fechado" podem gerar evento, agenda, contrato e financeiro.
export type OrcamentoStatus = "aberto" | "fechado" | "nao_fechou";

export interface Orcamento {
  id: string;
  nomeCliente: string;
  telefone: string;
  tipoEvento: string;
  data: string; // formato ISO yyyy-mm-dd
  horario?: string; // formato HH:mm
  cidade: string;
  local?: string;
  valor: number; // valor em reais
  observacoes?: string;
  status: OrcamentoStatus;
  motivoNaoFechou?: string;
  // Presente somente depois que "Completar fechamento" foi concluído.
  // É o único indicador confiável de que o orçamento já virou evento —
  // nunca inferir isso pelo nome do cliente ou pela data.
  eventId?: string;
  criadoEm: string; // ISO datetime
  atualizadoEm: string; // ISO datetime
}

// Dados de entrada do formulário (criação e edição).
// O status nunca é definido aqui: todo orçamento novo nasce "aberto",
// e a edição nunca altera o status atual.
export interface NovoOrcamentoInput {
  nomeCliente: string;
  telefone: string;
  tipoEvento: string;
  data: string;
  horario?: string;
  cidade: string;
  local?: string;
  valor: number;
  observacoes?: string;
}

// ---------- Evento (gerado a partir de um orçamento FECHADO) ----------

export type FormaPagamento = "PIX" | "Dinheiro" | "Transferência" | "Cartão" | "Outro";

export interface EnderecoContratante {
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}

// Único status desta etapa. O modelo já prevê outros futuramente
// (ex: "cancelado"), mas cancelamento não é implementado ainda.
export type EventoStatus = "confirmado";

export interface Evento {
  id: string;
  quoteId: string; // id do orçamento que originou este evento

  // Contratante
  cliente: string;
  cpfCnpj: string;
  telefone: string;
  email?: string;
  endereco?: EnderecoContratante;

  // Evento
  tipoEvento: string;
  data: string; // ISO yyyy-mm-dd
  horario?: string;
  horarioTermino?: string;
  horarioMontagem?: string;
  cidade: string;
  local?: string;
  enderecoEvento?: string;
  observacoes?: string;

  // Financeiro
  valorContratado: number;
  valorOrcamentoOriginal: number;
  formaPagamento?: FormaPagamento;

  status: EventoStatus;
  createdAt: string;
  updatedAt: string;
}

// Dados coletados no formulário de "Completar fechamento".
export interface FechamentoInput {
  cliente: string;
  cpfCnpj: string;
  telefone: string;
  email?: string;
  endereco?: EnderecoContratante;
  tipoEvento: string;
  data: string;
  horario?: string;
  horarioTermino?: string;
  horarioMontagem?: string;
  cidade: string;
  local?: string;
  enderecoEvento?: string;
  observacoes?: string;
  valorContratado: number;
  formaPagamento?: FormaPagamento;
}

// Dados básicos editáveis de um evento já confirmado.
export interface EventoEditInput {
  data: string;
  horario?: string;
  cidade: string;
  local?: string;
  observacoes?: string;
}

// ---------- Parcela (gerada automaticamente ao confirmar o evento) ----------

// O status de uma parcela nunca é armazenado diretamente: ele é sempre
// calculado a partir do valor da parcela, da soma dos pagamentos vinculados
// e da data de vencimento (ver src/lib/financeiro.ts). Isso evita a parcela
// "dessincronizar" do histórico real de pagamentos.
export type ParcelaStatus = "a_receber" | "pago" | "vencido";

export interface Parcela {
  id: string;
  eventoId: string;
  descricao: string; // "Entrada" | "Saldo final"
  valor: number;
  vencimento: string; // ISO yyyy-mm-dd
  createdAt: string;
  updatedAt: string;
}

// ---------- Pagamento (recebimento registrado contra uma parcela) ----------

// Histórico de recebimentos. Uma parcela pode ter vários (pagamento parcial),
// e a soma dos valores aqui é que determina quanto da parcela já foi pago —
// nunca um campo solto do tipo "paid: true".
export interface Pagamento {
  id: string;
  eventoId: string;
  parcelaId: string;
  valor: number;
  dataPagamento: string; // ISO yyyy-mm-dd
  formaPagamento: FormaPagamento;
  observacoes?: string;
  createdAt: string;
}

export interface NovoPagamentoInput {
  eventoId: string;
  parcelaId: string;
  valor: number;
  dataPagamento: string;
  formaPagamento: FormaPagamento;
  observacoes?: string;
}

// ---------- Despesa (lançamento vinculado a um evento) ----------

export type CategoriaDespesa =
  | "Combustível"
  | "Pedágio"
  | "Alimentação"
  | "Hospedagem"
  | "Equipe"
  | "Equipamentos"
  | "Locação"
  | "Outro";

export interface Despesa {
  id: string;
  eventoId: string;
  descricao: string;
  categoria: CategoriaDespesa;
  valor: number;
  data: string; // ISO yyyy-mm-dd
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NovaDespesaInput {
  eventoId: string;
  descricao: string;
  categoria: CategoriaDespesa;
  valor: number;
  data: string;
  observacoes?: string;
}

// ---------- Perfil (dados do DJ / contratado, Configurações) ----------

export interface Perfil {
  id: string;
  nomeArtistico: string;
  nomeCompleto?: string;
  documento?: string; // CPF/CNPJ
  telefone?: string;
  email?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  foroPadrao: string;
}

export interface PerfilInput {
  nomeArtistico: string;
  nomeCompleto?: string;
  documento?: string;
  telefone?: string;
  email?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  foroPadrao: string;
}

// ---------- Contrato (gerado a partir de um evento confirmado) ----------

// "Congelamos" os dados usados na geração do contrato aqui. O PDF em si
// nunca é armazenado para o contrato original — ele é sempre RE-GERADO a
// partir deste snapshot quando o usuário visualiza/compartilha/regenera.
// Isso evita guardar arquivos grandes no localStorage e garante que o texto
// do contrato não mude sozinho entre uma visualização e outra.
export interface ContratoSnapshot {
  contratanteNome: string;
  contratanteCpfCnpj: string;
  contratanteTelefone: string;
  contratanteEmail?: string;
  contratanteEndereco?: string;
  tipoEvento: string;
  dataEvento: string; // ISO yyyy-mm-dd
  horarioInicio?: string;
  horarioTermino?: string;
  local?: string;
  enderecoEvento?: string;
  cidadeEvento: string;
  valorTotal: number;
  parcela1Valor: number;
  parcela1Vencimento: string;
  parcela2Valor: number;
  parcela2Vencimento: string;
  formaPagamento?: FormaPagamento;
}

export type ContratoStatus = "gerado" | "assinado";

export interface Contrato {
  id: string;
  eventoId: string;
  // Número sequencial permanente (ex: "MAD-2026-0001"). Nunca muda, mesmo
  // ao regenerar o PDF — o número pertence ao contrato, não ao arquivo.
  numero: string;
  status: ContratoStatus;
  autorizaImagem: boolean;
  foro: string;
  snapshot: ContratoSnapshot;
  geradoEm: string; // ISO datetime da primeira geração
  atualizadoEm: string; // ISO datetime da última regeneração
  // Caminho do arquivo dentro do bucket privado "contracts" no Supabase
  // Storage. Sempre acessado via URL assinada (o bucket não é público).
  originalFilePath?: string;
  assinadoArquivoNome?: string;
  assinadoArquivoCaminho?: string;
  assinadoImportadoEm?: string;
}


