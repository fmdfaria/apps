export interface EvolucaoPaciente {
  id: string;
  pacienteId: string;
  agendamentoId?: string;
  profissionalId?: string;
  dataEvolucao: string;
  objetivoSessao?: string;
  descricaoEvolucao?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Dados relacionados vindos das JOINs
  pacienteNome?: string;
  profissionalNome?: string;
  profissionalEspecialidades?: string[];
  agendamentoData?: string;
  agendamentoHora?: string;
}

export interface CreateEvolucaoPacienteData {
  pacienteId: string;
  agendamentoId?: string;
  profissionalId?: string;
  dataEvolucao: string;
  objetivoSessao?: string;
  descricaoEvolucao?: string;
}

export interface UpdateEvolucaoPacienteData {
  pacienteId?: string;
  agendamentoId?: string;
  profissionalId?: string;
  dataEvolucao?: string;
  objetivoSessao?: string;
  descricaoEvolucao?: string;
}