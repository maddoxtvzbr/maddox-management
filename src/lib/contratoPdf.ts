import type { ContratoSnapshot } from "../types";
import type { DadosContratado } from "../config/contratado";
import { formatCurrencyBRL, formatDateShort } from "./format";

export interface DadosGeracaoContrato {
  numero: string;
  snapshot: ContratoSnapshot;
  autorizaImagem: boolean;
  foro: string;
  contratado: DadosContratado;
}

function calcularDuracao(inicio?: string, termino?: string): string | null {
  if (!inicio || !termino) return null;
  const [h1, m1] = inicio.split(":").map(Number);
  const [h2, m2] = termino.split(":").map(Number);
  if ([h1, m1, h2, m2].some((n) => Number.isNaN(n))) return null;
  let minutos = h2 * 60 + m2 - (h1 * 60 + m1);
  if (minutos <= 0) minutos += 24 * 60; // atravessa a meia-noite
  const horas = Math.floor(minutos / 60);
  const min = minutos % 60;
  return min === 0 ? `${horas}h` : `${horas}h${String(min).padStart(2, "0")}`;
}

function clausula(titulo: string, corpo: string) {
  return {
    unbreakable: true,
    margin: [0, 0, 0, 12] as [number, number, number, number],
    stack: [
      { text: titulo, style: "clauseTitle" },
      { text: corpo, style: "body" }
    ]
  };
}

function blocoAssinatura(titulo: string, linhas: string[]) {
  return {
    unbreakable: true,
    margin: [0, 0, 0, 22] as [number, number, number, number],
    stack: [
      { text: titulo, style: "signatureTitle" },
      ...linhas.map((linha) => ({ text: linha, style: "signatureLine" })),
      {
        text: "Assinatura: _______________________________________________",
        style: "signatureLine",
        margin: [0, 14, 0, 0] as [number, number, number, number]
      }
    ]
  };
}

// Monta a definição do documento (pdfmake docDefinition) a partir dos dados
// já existentes no sistema. Nenhum texto de cláusula é inventado aqui —
// tudo segue exatamente o modelo fornecido; apenas os dados variáveis
// (nome, valores, datas etc.) são preenchidos automaticamente.
export function montarDocDefinition(dados: DadosGeracaoContrato) {
  const { numero, snapshot, autorizaImagem, foro, contratado } = dados;
  const c = contratado;

  const duracao = calcularDuracao(snapshot.horarioInicio, snapshot.horarioTermino);
  const enderecoEventoTexto = [snapshot.local, snapshot.enderecoEvento, snapshot.cidadeEvento]
    .filter(Boolean)
    .join(", ");

  const objetoTexto =
    `O presente contrato tem como objeto a prestação de serviços artísticos de discotecagem ` +
    `pelo profissional artisticamente conhecido como ${c.nomeArtistico}, a ser realizada no evento ` +
    `do tipo ${snapshot.tipoEvento}, a se realizar em ${formatDateShort(snapshot.dataEvento)}` +
    `${enderecoEventoTexto ? `, no local ${enderecoEventoTexto}` : ""}` +
    `${snapshot.horarioInicio ? `, com início previsto para ${snapshot.horarioInicio}` : ""}` +
    `${snapshot.horarioTermino ? ` e término previsto para ${snapshot.horarioTermino}` : ""}` +
    `${duracao ? `, com duração aproximada de ${duracao}` : ""}.`;

  const valorTexto =
    `O valor total pactuado pela prestação dos serviços objeto deste contrato é de ` +
    `${formatCurrencyBRL(snapshot.valorTotal)}. O pagamento será realizado em duas parcelas: ` +
    `50% (cinquenta por cento), no valor de ${formatCurrencyBRL(snapshot.parcela1Valor)}, devido na ` +
    `assinatura do presente contrato` +
    `${snapshot.parcela1Vencimento ? `, com vencimento em ${formatDateShort(snapshot.parcela1Vencimento)}` : ""}; ` +
    `e 50% (cinquenta por cento), no valor de ${formatCurrencyBRL(snapshot.parcela2Valor)}, devido até o dia ` +
    `imediatamente anterior à data do evento` +
    `${snapshot.parcela2Vencimento ? `, com vencimento em ${formatDateShort(snapshot.parcela2Vencimento)}` : ""}.`;

  const horarioTexto =
    `A apresentação está prevista para iniciar às ${snapshot.horarioInicio ?? "[a definir]"} e encerrar às ` +
    `${snapshot.horarioTermino ?? "[a definir]"}` +
    `${duracao ? `, com duração aproximada de ${duracao}` : ""}. Eventual contratação de hora adicional ` +
    `deverá ser formalizada separadamente entre as partes, não estando automaticamente incluída neste contrato.`;

  const imagemTexto = autorizaImagem
    ? `O CONTRATANTE autoriza a utilização razoável de registros de imagem e vídeo do evento pelo ` +
      `${c.nomeArtistico}, para fins de portfólio e divulgação profissional do trabalho do CONTRATADO.`
    : `Não há, no âmbito deste contrato, autorização para utilização promocional de imagens do ` +
      `CONTRATANTE e/ou do evento pelo CONTRATADO.`;

  const preamboloTexto =
    `Pelo presente instrumento particular, de um lado ${snapshot.contratanteNome}, portador(a) do CPF/CNPJ ` +
    `nº ${snapshot.contratanteCpfCnpj}${snapshot.contratanteEndereco ? `, com endereço em ${snapshot.contratanteEndereco}` : ""}, ` +
    `doravante denominado(a) CONTRATANTE, e de outro lado ${c.nomeCompleto}, portador do CPF/CNPJ nº ${c.cpfCnpj}, ` +
    `com endereço em ${c.endereco}, artisticamente conhecido como ${c.nomeArtistico}, doravante denominado ` +
    `CONTRATADO, têm entre si justo e contratado o seguinte:`;

  return {
    pageSize: "A4",
    pageMargins: [56, 70, 56, 60] as [number, number, number, number],

    header: {
      margin: [56, 24, 56, 0] as [number, number, number, number],
      columns: [
        { text: "MADDOX", style: "brand" },
        { text: `Contrato ${numero}`, style: "brandMeta", alignment: "right" as const }
      ]
    },

    footer: (currentPage: number, pageCount: number) => ({
      margin: [56, 0, 56, 24] as [number, number, number, number],
      columns: [
        { text: `Contrato ${numero}`, style: "footerText" },
        { text: `Página ${currentPage} de ${pageCount}`, style: "footerText", alignment: "right" as const }
      ]
    }),

    content: [
      { text: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS ARTÍSTICOS", style: "title" },
      {
        text: `Número: ${numero}`,
        style: "subtitle",
        margin: [0, 0, 0, 18] as [number, number, number, number]
      },

      {
        text: preamboloTexto,
        style: "body",
        margin: [0, 0, 0, 18] as [number, number, number, number]
      },

      clausula("CLÁUSULA 1ª – DO OBJETO", objetoTexto),
      clausula("CLÁUSULA 2ª – DO VALOR E DA FORMA DE PAGAMENTO", valorTexto),
      clausula(
        "CLÁUSULA 3ª – DA RESERVA DA DATA",
        "A confirmação da contratação e a reserva definitiva da data do evento somente se efetivam " +
          "mediante a formalização do presente contrato e o pagamento da primeira parcela, nas condições " +
          "estabelecidas na Cláusula 2ª."
      ),
      clausula(
        "CLÁUSULA 4ª – DO SISTEMA DE SOM",
        "O CONTRATADO é contratado exclusivamente para a prestação do serviço artístico de discotecagem. " +
          "Salvo contratação expressa de estrutura adicional, o CONTRATADO não fornece o sistema de " +
          "sonorização/PA responsável por atender o público do evento. Caberá ao CONTRATANTE fornecer ou " +
          "contratar sistema de som profissional, compatível com o tamanho do ambiente e com a quantidade " +
          "de público esperada, devidamente instalado, testado e em perfeito funcionamento, adequado para " +
          "apresentação profissional de DJ. O equipamento de discotecagem do CONTRATADO deverá possuir " +
          "conexão com o sistema de som disponibilizado para o evento, devendo ser prevista conexão " +
          "profissional do tipo XLR balanceada, ou solução tecnicamente compatível previamente acordada " +
          "entre as partes."
      ),
      clausula(
        "CLÁUSULA 5ª – DA RESPONSABILIDADE POR SOM DE TERCEIROS",
        "O CONTRATADO não será responsável por falhas decorrentes do sistema de sonorização fornecido " +
          "pelo CONTRATANTE ou por terceiros, incluindo, sem limitação, volume insuficiente, distorção, " +
          "falha de caixas, amplificação, cabeamento, processamento, energia ou quaisquer interrupções e " +
          "defeitos técnicos correlatos. Havendo condição insegura capaz de causar dano a pessoas ou a " +
          "equipamentos, o CONTRATADO poderá interromper ou deixar de iniciar a apresentação até a " +
          "regularização da situação."
      ),
      clausula(
        "CLÁUSULA 6ª – DO RIDER TÉCNICO",
        "Para a montagem do equipamento do CONTRATADO, o local do evento deverá disponibilizar " +
          "mesa/bancada profissional com aproximadamente 1,20 m (um metro e vinte centímetros) de altura, " +
          "firme, estável, nivelada, segura e com espaço adequado ao setup. O local também deverá dispor " +
          "de alimentação elétrica adequada, tomadas em boas condições, proteção contra chuva e líquidos, " +
          "espaço seguro e conexão com o sistema de áudio do evento."
      ),
      clausula(
        "CLÁUSULA 7ª – DO RIDER DE HOSPITALIDADE",
        "O CONTRATANTE deverá disponibilizar, para o CONTRATADO e sua equipe: 1 (uma) garrafa de whisky " +
          "Old Parr, Jack Daniel's ou similar/equivalente; 8 (oito) energéticos; e 8 (oito) águas minerais " +
          "sem gás. Quanto à alimentação, deverá ser disponibilizada 1 (uma) pizza grande, ou salgados " +
          "variados em quantidade adequada, ou, quando houver buffet contratado para o evento, alimentação " +
          "correspondente ao que estiver sendo servido pelo próprio buffet."
      ),
      clausula(
        "CLÁUSULA 8ª – DAS LICENÇAS E ALVARÁS",
        "É de responsabilidade do CONTRATANTE e/ou do organizador do evento providenciar as licenças, " +
          "autorizações e alvarás legalmente necessários à realização do evento, incluindo, quando " +
          "aplicável, alvarás, licenças e autorizações do local, autorizações públicas, regras municipais " +
          "e demais obrigações relacionadas à realização do evento e à execução pública musical. O " +
          "CONTRATADO não será responsabilizado caso o evento seja impedido, interrompido ou cancelado em " +
          "razão da ausência ou irregularidade dessas obrigações, quando de responsabilidade do " +
          "CONTRATANTE ou do organizador."
      ),
      clausula(
        "CLÁUSULA 9ª – DA INFRAESTRUTURA E ENERGIA",
        "O CONTRATANTE deverá garantir condições adequadas e seguras para a realização da apresentação. " +
          "O CONTRATADO não responderá pela impossibilidade ou interrupção da apresentação causada por " +
          "falta de energia, instalação elétrica inadequada, gerador insuficiente, falhas estruturais do " +
          "local ou falhas de equipamentos de terceiros."
      ),
      clausula(
        "CLÁUSULA 10ª – DO REPERTÓRIO",
        "A seleção musical e a condução artística do evento serão realizadas pelo CONTRATADO, conforme " +
          "sua experiência profissional, leitura de pista, perfil dos convidados e características do " +
          "evento. O CONTRATANTE poderá, previamente, informar estilos musicais desejados, músicas " +
          "especiais e músicas que não deseja que sejam tocadas. Pedidos realizados durante o evento " +
          "poderão ser atendidos de acordo com a adequação artística e técnica, a critério do CONTRATADO."
      ),
      clausula("CLÁUSULA 11ª – DO HORÁRIO", horarioTexto),
      clausula(
        "CLÁUSULA 12ª – DO CANCELAMENTO E DO INADIMPLEMENTO",
        "Em caso de cancelamento injustificado por parte do CONTRATANTE, ou de descumprimento de " +
          "obrigação essencial deste contrato, será devida multa compensatória correspondente a 30% " +
          "(trinta por cento) do valor total contratado, sem prejuízo de eventuais valores já pagos e " +
          "devidos até a data do cancelamento. O descumprimento de obrigações acessórias não será " +
          "automaticamente equiparado ao cancelamento total do contrato, devendo a situação ser tratada " +
          "conforme sua real gravidade e conforme a boa-fé entre as partes."
      ),
      clausula(
        "CLÁUSULA 13ª – DA FORÇA MAIOR",
        "Nos casos de situações extraordinárias, alheias à vontade e ao controle razoável das partes, " +
          "que impossibilitem a realização do evento na data prevista, as partes buscarão, " +
          "preferencialmente e nesta ordem: (i) o reagendamento da apresentação; (ii) o aproveitamento " +
          "dos valores já pagos na nova data; e (iii) a composição amigável entre as partes. A nova data " +
          "ficará sujeita à disponibilidade de agenda do CONTRATADO."
      ),
      clausula(
        "CLÁUSULA 14ª – DOS DANOS A EQUIPAMENTOS",
        "O CONTRATANTE deverá proporcionar ambiente seguro para os equipamentos do CONTRATADO. Danos " +
          "comprovadamente causados por convidados, funcionários, fornecedores ou terceiros vinculados ao " +
          "evento poderão gerar obrigação de ressarcimento, conforme a responsabilidade apurada. Não será " +
          "permitido o depósito de bebidas ou outros líquidos sobre ou junto aos equipamentos do " +
          "CONTRATADO."
      ),
      clausula(
        "CLÁUSULA 15ª – DOS SERVIÇOS DE TERCEIROS",
        "O CONTRATADO não será responsável pela qualidade ou por eventuais falhas de fornecedores " +
          "contratados pelo CONTRATANTE, tais como empresa de som, iluminação, gerador, buffet, espaço do " +
          "evento, cerimonial, estrutura ou segurança."
      ),
      clausula("CLÁUSULA 16ª – DO DIREITO DE IMAGEM", imagemTexto),
      clausula(
        "CLÁUSULA 17ª – DAS COMUNICAÇÕES",
        "As partes concordam com a utilização dos dados de contato informados neste contrato, incluindo " +
          "WhatsApp, telefone e e-mail, para comunicações relacionadas a esta contratação e ao evento."
      ),
      clausula(
        "CLÁUSULA 18ª – DO FORO",
        `Fica eleito o foro da comarca de ${foro} para dirimir quaisquer questões oriundas do presente ` +
          `contrato, com renúncia a qualquer outro, por mais privilegiado que seja.`
      ),

      {
        text: "E por estarem assim justas e contratadas, as partes firmam o presente instrumento.",
        style: "body",
        margin: [0, 6, 0, 36] as [number, number, number, number]
      },

      blocoAssinatura("CONTRATANTE", [
        `Nome: ${snapshot.contratanteNome}`,
        `CPF/CNPJ: ${snapshot.contratanteCpfCnpj}`
      ]),
      blocoAssinatura(`CONTRATADO — ${c.nomeArtistico}`, [
        `Nome: ${c.nomeCompleto}`,
        `CPF/CNPJ: ${c.cpfCnpj}`
      ]),
      blocoAssinatura("TESTEMUNHA 1", [
        "Nome: _______________________________",
        "CPF: _______________________________"
      ]),
      blocoAssinatura("TESTEMUNHA 2", [
        "Nome: _______________________________",
        "CPF: _______________________________"
      ])
    ],

    styles: {
      brand: { fontSize: 12, bold: true, color: "#1a1815" },
      brandMeta: { fontSize: 9, color: "#8a8175" },
      footerText: { fontSize: 8, color: "#b3aca0" },
      title: { fontSize: 15, bold: true, alignment: "center" as const, margin: [0, 6, 0, 2] as [number, number, number, number] },
      subtitle: { fontSize: 9, color: "#8a8175", alignment: "center" as const },
      clauseTitle: { fontSize: 10.5, bold: true, margin: [0, 0, 0, 4] as [number, number, number, number] },
      body: { fontSize: 10, lineHeight: 1.35, alignment: "justify" as const, color: "#1a1815" },
      signatureTitle: { fontSize: 10, bold: true, margin: [0, 0, 0, 4] as [number, number, number, number] },
      signatureLine: { fontSize: 9.5, color: "#1a1815", margin: [0, 2, 0, 0] as [number, number, number, number] }
    },
    defaultStyle: {
      font: "Roboto"
    }
  };
}
