export type StatusAgendamento = 
  | 'AGENDADO' 
  | 'SOLICITADO'
  | 'LIBERADO' 
  | 'ATENDIDO' 
  | 'FINALIZADO' 
  | 'CANCELADO'
  | 'ARQUIVADO';

export type TipoAtendimento = 'presencial' | 'online';

export type TipoRecorrencia = 'semanal' | 'quinzenal' | 'mensal';

export interface RecorrenciaAgendamento {
  tipo: TipoRecorrencia;
  repeticoes?: number;
  ate?: string; // Data no formato YYYY-MM-DD
}

export interface Agendamento {
  id: string;
  
  // Etapa 1 - Agendar
  pacienteId: string;
  profissionalId: string;
  tipoAtendimento: TipoAtendimento;
  recursoId: string;
  convenioId: string;
  servicoId: string;
  dataHoraInicio: string; // ISO string
  dataHoraFim?: string; // Calculado automaticamente
  recorrencia?: RecorrenciaAgendamento;
  
  // Etapa 2 - Liberar
  codLiberacao?: string;
  statusCodLiberacao?: string;
  dataCodLiberacao?: string;
  
  // Etapa 3 - Atender (futuro - evolução)
  dataAtendimento?: string;
  observacoesAtendimento?: string;
  
  // Etapa 4 - Aprovar
  dataAprovacao?: string;
  motivoCancelamento?: string;
  aprovadoPor?: string;
  
  // Campos gerais
  status: StatusAgendamento;
  criadoEm: string;
  atualizadoEm: string;
  
  // Campos calculados/relacionais (para exibição)
  pacienteNome?: string;
  pacienteWhatsapp?: string;
  profissionalNome?: string;
  convenioNome?: string;
  servicoNome?: string;
  recursoNome?: string;
} 