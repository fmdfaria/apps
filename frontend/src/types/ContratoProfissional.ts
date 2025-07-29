export interface ContratoProfissional {
  id: string;
  profissionalId: string;
  dataInicio: string;
  dataFim?: string | null;
  arquivoContrato?: string | null;
  observacao?: string | null;
} 