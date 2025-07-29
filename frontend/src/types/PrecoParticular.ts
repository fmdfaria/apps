export interface PrecoParticular {
  id: string;
  pacienteId: string;
  servicoId: string;
  preco: number;
  duracaoMinutos?: number;
  percentualClinica?: number;
  percentualProfissional?: number;
  precoPaciente?: number;
} 