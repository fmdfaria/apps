export interface PrecoServicoProfissional {
  id: string;
  profissionalId: string;
  servicoId: string;
  precoProfissional?: number | null;    // Valor direto do profissional
  precoClinica?: number | null;         // Valor direto da clínica
  percentualClinica?: number | null;    // % da clínica
  percentualProfissional?: number | null; // % do profissional
} 