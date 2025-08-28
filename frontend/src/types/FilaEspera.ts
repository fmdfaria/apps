export type HorarioPreferencia = 'MANHÃ' | 'TARDE' | 'NOITE';

export interface FilaEspera {
  id: string;
  pacienteId: string;
  servicoId: string;
  profissionalId?: string | null;
  horarioPreferencia: HorarioPreferencia;
  observacao?: string | null;
  status?: string | null;
  ativo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}


