import jsPDF from 'jspdf';
import type { Agendamento } from '@/types/Agendamento';
import type { ContaPagar } from '@/types/ContaPagar';

interface GerarPDFAgendamentosParams {
  agendamentos: Agendamento[];
  contaPagar?: ContaPagar;
  titulo: string;
  calcularValor?: (agendamento: Agendamento) => number;
}

export const gerarPDFAgendamentos = ({
  agendamentos,
  contaPagar,
  titulo,
  calcularValor
}: GerarPDFAgendamentosParams) => {
  // Criar documento PDF em formato A4
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Função para formatar data/hora
  const formatarDataHora = (dataISO: string) => {
    if (!dataISO) return { data: '', hora: '' };
    const date = new Date(dataISO);
    const brasilDate = new Date(date.getTime() - (3 * 60 * 60 * 1000));
    const dia = brasilDate.getUTCDate().toString().padStart(2, '0');
    const mes = (brasilDate.getUTCMonth() + 1).toString().padStart(2, '0');
    const ano = brasilDate.getUTCFullYear().toString();
    const hora = brasilDate.getUTCHours().toString().padStart(2, '0');
    const minuto = brasilDate.getUTCMinutes().toString().padStart(2, '0');
    return {
      data: `${dia}/${mes}/${ano}`,
      hora: `${hora}:${minuto}`
    };
  };

  // Função para formatar valor
  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  // Função para calcular valor total
  const calcularValorTotal = () => {
    return agendamentos.reduce((total, agendamento) => {
      if (calcularValor) {
        return total + calcularValor(agendamento);
      } else {
        const preco = parseFloat((agendamento as any).servico?.preco || '0');
        return total + preco;
      }
    }, 0);
  };

  // CABEÇALHO
  doc.setFillColor(220, 38, 38); // Vermelho tema financeiro
  doc.rect(0, 0, pageWidth, 25, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RELAÇÃO DE ATENDIMENTOS', margin, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, margin, 19);

  yPosition = 35;

  // INFORMAÇÕES DA CONTA A PAGAR
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(titulo, margin, yPosition);
  yPosition += 8;

  if (contaPagar) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    // Linha 1: Descrição e Número do Documento
    doc.text(`Descrição: ${contaPagar.descricao}`, margin, yPosition);
    if (contaPagar.numeroDocumento) {
      doc.text(`Nº Doc: ${contaPagar.numeroDocumento}`, pageWidth - margin - 50, yPosition);
    }
    yPosition += 5;

    // Linha 2: Profissional
    if (contaPagar.profissional?.nome) {
      doc.text(`Profissional: ${contaPagar.profissional.nome}`, margin, yPosition);
    }
    yPosition += 5;

    // Linha 3: Datas
    doc.text(`Emissão: ${new Date(contaPagar.dataEmissao).toLocaleDateString('pt-BR')}`, margin, yPosition);
    doc.text(`Vencimento: ${new Date(contaPagar.dataVencimento).toLocaleDateString('pt-BR')}`, margin + 50, yPosition);

    yPosition += 8;
  }

  // RESUMO
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPosition, pageWidth - 2 * margin, 12, 'F');

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total de Atendimentos: ${agendamentos.length}`, margin + 3, yPosition + 7);
  doc.text(`Valor Total: ${formatarValor(calcularValorTotal())}`, pageWidth / 2, yPosition + 7);

  if (agendamentos.length > 0) {
    const primeiraData = formatarDataHora(agendamentos[0].dataHoraInicio).data;
    const ultimaData = formatarDataHora(agendamentos[agendamentos.length - 1].dataHoraInicio).data;
    doc.text(`Período: ${primeiraData} - ${ultimaData}`, pageWidth - margin - 70, yPosition + 7);
  }

  yPosition += 18;

  // TABELA DE AGENDAMENTOS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);

  // Cabeçalho da tabela
  const tableStartY = yPosition;
  const colWidths = [30, 50, 45, 50, 28, 22];
  const colHeaders = ['Data/Hora', 'Paciente', 'Profissional', 'Serviço', 'Valor', 'Status'];

  doc.setFillColor(200, 200, 200);
  doc.rect(margin, tableStartY, pageWidth - 2 * margin, 8, 'F');

  let xPosition = margin + 2;
  colHeaders.forEach((header, index) => {
    doc.text(header, xPosition, tableStartY + 5.5);
    xPosition += colWidths[index];
  });

  yPosition = tableStartY + 8;

  // Linhas da tabela
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  agendamentos.forEach((agendamento, index) => {
    // Verifica se precisa de nova página
    if (yPosition > pageHeight - 30) {
      doc.addPage();
      yPosition = margin;

      // Repete cabeçalho da tabela
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setFillColor(200, 200, 200);
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F');

      xPosition = margin + 2;
      colHeaders.forEach((header, index) => {
        doc.text(header, xPosition, yPosition + 5.5);
        xPosition += colWidths[index];
      });

      yPosition += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
    }

    // Cor alternada para linhas
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 6, 'F');
    }

    const { data, hora } = formatarDataHora(agendamento.dataHoraInicio);
    const valor = calcularValor
      ? calcularValor(agendamento)
      : parseFloat((agendamento as any).servico?.preco || '0');

    xPosition = margin + 2;

    // Data/Hora
    doc.text(`${data} ${hora}`, xPosition, yPosition + 4);
    xPosition += colWidths[0];

    // Paciente
    const paciente = (agendamento.pacienteNome || 'Não informado').substring(0, 28);
    doc.text(paciente, xPosition, yPosition + 4);
    xPosition += colWidths[1];

    // Profissional
    const profissional = (agendamento.profissionalNome || 'Não informado').substring(0, 25);
    doc.text(profissional, xPosition, yPosition + 4);
    xPosition += colWidths[2];

    // Serviço
    const servico = (agendamento.servicoNome || 'Não informado').substring(0, 28);
    doc.text(servico, xPosition, yPosition + 4);
    xPosition += colWidths[3];

    // Valor
    doc.text(formatarValor(valor), xPosition, yPosition + 4);
    xPosition += colWidths[4];

    // Status
    doc.text(agendamento.status, xPosition, yPosition + 4);

    yPosition += 6;
  });

  // Linha final da tabela
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);

  // RODAPÉ FINAL
  yPosition += 10;

  if (contaPagar?.observacoes) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Observações:', margin, yPosition);
    doc.setFont('helvetica', 'normal');

    // Quebra de texto para observações longas
    const observacoesLines = doc.splitTextToSize(contaPagar.observacoes, pageWidth - 2 * margin - 30);
    doc.text(observacoesLines, margin + 25, yPosition);
    yPosition += observacoesLines.length * 4 + 5;
  }

  // Gerar nome do arquivo
  const dataAtual = new Date().toISOString().split('T')[0];
  const contaId = contaPagar?.id ? `_${contaPagar.id.substring(0, 8)}` : '';
  const nomeArquivo = `agendamentos_conta_pagar${contaId}_${dataAtual}.pdf`;

  // Fazer download
  doc.save(nomeArquivo);
};
