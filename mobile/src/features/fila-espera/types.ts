export type HorarioPreferencia = string;

export type FilaEsperaPayload = {
  pacienteId: string;
  servicoId: string;
  profissionalId?: string | null;
  horarioPreferencia: HorarioPreferencia;
  observacao?: string | null;
  status?: string | null;
  ativo?: boolean;
};

export type FilaEsperaOption = {
  id: string;
  nome: string;
};

export type FilaEsperaItem = {
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
  pacienteNome?: string;
  servicoNome?: string;
  profissionalNome?: string;
};
