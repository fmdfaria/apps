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
  dataPagamento?: string | null; // Formato YYYY-MM-DD
} 