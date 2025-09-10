export interface PrecoParticular {
  id: string;
  pacienteId: string;
  servicoId: string;
  preco: number;
  duracaoMinutos?: number;
  percentualClinica?: number;
  percentualProfissional?: number;
  precoPaciente?: number;
  tipoPagamento?: string | null;
  pagamentoAntecipado?: boolean | null;
  diaPagamento?: number | null; // Dia do mês (1-31)
  notaFiscal?: boolean | null;
} 