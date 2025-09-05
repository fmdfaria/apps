export interface SerieInfo {
  serieId: string;
  isMaster: boolean;
  totalAgendamentos: number;
  agendamentos: Array<{
    id: string;
    dataHoraInicio: Date;
    dataHoraFim: Date;
    status: string;
    isMaster: boolean;
    instanciaData: Date;
  }>;
  temGoogleCalendar: boolean;
  googleEventId?: string;
}

export interface SeriePosition {
  isAnterior: boolean;
  isAtual: boolean;
  isFuturo: boolean;
  posicao: number;
  totalNaSerie: number;
}

export interface SerieUpdateOptions {
  tipoOperacao: 'apenas_esta' | 'esta_e_futuras' | 'toda_serie';
  agendamentoId: string;
  dados: any;
}