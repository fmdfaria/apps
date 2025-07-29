export interface PrecoServicoProfissional {
  id: string;
  profissionalId: string;
  servicoId: string;
  precoProfissional?: number | null;  // % do profissional
  precoClinica?: number | null;       // % da clínica
} 