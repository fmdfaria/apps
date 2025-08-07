export interface DisponibilidadeProfissional {
  id: string;
  profissionalId: string;
  horaInicio: Date;
  horaFim: Date;
  tipo: 'presencial' | 'online' | 'folga';
  diaSemana?: number | null; // 0 (domingo) a 6 (sábado)
  dataEspecifica?: Date | null;
  observacao?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateDisponibilidadeDto {
  profissionalId: string;
  horaInicio: string; // ISO string
  horaFim: string; // ISO string
  tipo: 'presencial' | 'online' | 'folga';
  diaSemana?: number | null;
  dataEspecifica?: string | null; // ISO string
  observacao?: string | null;
}

export interface UpdateDisponibilidadeDto extends Omit<CreateDisponibilidadeDto, 'profissionalId'> {}

export interface HorarioSemana {
  diaSemana: number; // 0-6
  nomeDia: string;
  ativo: boolean;
  intervalos: IntervaloHorario[];
}

export interface IntervaloHorario {
  id?: string;
  horaInicio: string; // "HH:mm"
  horaFim: string; // "HH:mm"
  tipo: 'presencial' | 'online' | 'folga';
  observacao?: string;
  // Controle de estado para detectar alterações
  isNew?: boolean;
}

 