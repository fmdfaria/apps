export const OPCOES_HORARIOS = [
  { id: '07:00', nome: '07:00', sigla: 'Manhã' },
  { id: '07:30', nome: '07:30', sigla: 'Manhã' },
  { id: '08:00', nome: '08:00', sigla: 'Manhã' },
  { id: '08:30', nome: '08:30', sigla: 'Manhã' },
  { id: '09:00', nome: '09:00', sigla: 'Manhã' },
  { id: '09:30', nome: '09:30', sigla: 'Manhã' },
  { id: '10:00', nome: '10:00', sigla: 'Manhã' },
  { id: '10:30', nome: '10:30', sigla: 'Manhã' },
  { id: '11:00', nome: '11:00', sigla: 'Manhã' },
  { id: '11:30', nome: '11:30', sigla: 'Manhã' },
  { id: '12:00', nome: '12:00', sigla: 'Almoço' },
  { id: '12:30', nome: '12:30', sigla: 'Almoço' },
  { id: '13:00', nome: '13:00', sigla: 'Tarde' },
  { id: '13:30', nome: '13:30', sigla: 'Tarde' },
  { id: '14:00', nome: '14:00', sigla: 'Tarde' },
  { id: '14:30', nome: '14:30', sigla: 'Tarde' },
  { id: '15:00', nome: '15:00', sigla: 'Tarde' },
  { id: '15:30', nome: '15:30', sigla: 'Tarde' },
  { id: '16:00', nome: '16:00', sigla: 'Tarde' },
  { id: '16:30', nome: '16:30', sigla: 'Tarde' },
  { id: '17:00', nome: '17:00', sigla: 'Tarde' },
  { id: '17:30', nome: '17:30', sigla: 'Tarde' },
  { id: '18:00', nome: '18:00', sigla: 'Tarde' },
  { id: '18:30', nome: '18:30', sigla: 'Tarde' },
  { id: '19:00', nome: '19:00', sigla: 'Noite' },
  { id: '19:30', nome: '19:30', sigla: 'Noite' },
  { id: '20:00', nome: '20:00', sigla: 'Noite' },
  { id: '20:30', nome: '20:30', sigla: 'Noite' }
];

export const RECORRENCIA_PADRAO = {
  tipo: 'semanal' as const,
  repeticoes: 4,
  ate: ''
};

export const FORM_DATA_PADRAO = {
  pacienteId: '',
  profissionalId: '',
  tipoAtendimento: 'presencial' as const,
  recursoId: '',
  convenioId: '',
  servicoId: '',
  dataHoraInicio: '',
  recorrencia: undefined
}; 