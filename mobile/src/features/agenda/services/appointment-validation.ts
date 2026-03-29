import { api } from '@/services/api/client';
import type { AppointmentStatus } from '@/features/agenda/types';

export type StatusDisponibilidade = 'disponivel' | 'ocupado' | 'indisponivel';

export type VerificacaoCompleta = {
  status: StatusDisponibilidade;
  motivo?: string;
  dotColor: 'blue' | 'green' | 'red';
  isOcupado?: boolean;
};

export type HorarioVerificado = {
  horario: string;
  verificacao: VerificacaoCompleta;
};

type Disponibilidade = {
  id: string;
  profissionalId?: string;
  profissional_id?: string;
  recursoId?: string | null;
  recurso_id?: string | null;
  diaSemana?: number | null;
  dia_semana?: number | null;
  dataEspecifica?: string | Date | null;
  data_especifica?: string | Date | null;
  horaInicio?: string | Date;
  hora_inicio?: string | Date;
  horaFim?: string | Date;
  hora_fim?: string | Date;
  tipo?: string;
  recurso?: { id?: string; nome?: string } | null;
};

type Agendamento = {
  id: string;
  profissionalId: string;
  recursoId?: string;
  dataHoraInicio: string;
  dataHoraFim?: string;
  pacienteNome?: string;
  profissionalNome?: string;
  servicoNome?: string;
  status: AppointmentStatus | string;
};

type Recurso = {
  id: string;
  nome: string;
};

export const OPCOES_HORARIOS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00',
];

function toYmd(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeYmd(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return toYmd(value);
  if (typeof value === 'string') {
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
    if (match) return match[1];
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return toYmd(parsed);
  }
  return null;
}

function parseMinutes(value: unknown): number | null {
  if (!value) return null;
  if (value instanceof Date) return value.getHours() * 60 + value.getMinutes();
  if (typeof value === 'string') {
    if (value.includes('T')) {
      const hhmm = /T(\d{2}):(\d{2})/.exec(value);
      if (hhmm) {
        return Number(hhmm[1]) * 60 + Number(hhmm[2]);
      }
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return null;
      return parsed.getHours() * 60 + parsed.getMinutes();
    }
    if (value.includes(':')) {
      const [h, m] = value.split(':').map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      return h * 60 + m;
    }
  }
  return null;
}

function parseDataEspecifica(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }
  return null;
}

function isStatusCancelado(status: string) {
  return ['CANCELADO', 'cancelado', 'CANCELLED', 'cancelled'].includes(status);
}

function verificarHorarioOcupado(
  profissionalId: string,
  data: Date,
  horario: string,
  agendamentos: Agendamento[],
  agendamentoIgnorarId?: string,
) {
  const [hora, minuto] = horario.split(':').map(Number);
  const dataHoraSolicitada = new Date(data);
  dataHoraSolicitada.setHours(hora, minuto, 0, 0);

  const conflito = agendamentos.find((item) => {
    if (item.id === agendamentoIgnorarId) return false;
    if (item.profissionalId !== profissionalId) return false;
    if (isStatusCancelado(item.status)) return false;
    const dataHora = new Date(item.dataHoraInicio);
    if (Number.isNaN(dataHora.getTime())) return false;
    const mesmoDia = dataHora.toDateString() === dataHoraSolicitada.toDateString();
    const mesmaHora = dataHora.getHours() === dataHoraSolicitada.getHours();
    const mesmoMinuto = dataHora.getMinutes() === dataHoraSolicitada.getMinutes();
    return mesmoDia && mesmaHora && mesmoMinuto;
  });

  return {
    ocupado: Boolean(conflito),
    motivo: conflito ? 'Horário já possui agendamento para este profissional.' : undefined,
  };
}

function verificarDisponibilidadeHorario(
  profissionalId: string,
  data: Date,
  horario: string,
  disponibilidades: Disponibilidade[],
): 'presencial' | 'online' | 'folga' | 'nao_configurado' {
  const diaSemana = data.getDay();
  const [hora, minuto] = horario.split(':').map(Number);
  const horarioMinutos = hora * 60 + minuto;
  const ymdSelecionado = toYmd(data);

  const doProfissional = disponibilidades.filter((item) => {
    const id = item.profissionalId ?? item.profissional_id;
    return id === profissionalId;
  });

  const matches = (item: Disponibilidade) => {
    const inicio = parseMinutes(item.horaInicio ?? item.hora_inicio);
    const fim = parseMinutes(item.horaFim ?? item.hora_fim);
    if (inicio === null || fim === null) return false;
    return horarioMinutos >= inicio && horarioMinutos < fim;
  };

  for (const item of doProfissional) {
    const ymdDataEspecifica = normalizeYmd(item.dataEspecifica ?? item.data_especifica);
    if (!ymdDataEspecifica) continue;
    if (ymdDataEspecifica !== ymdSelecionado) continue;
    if (!matches(item)) continue;
    const tipo = (item.tipo || '').toLowerCase();
    if (tipo === 'folga') return 'folga';
    if (tipo === 'online') return 'online';
    if (tipo === 'presencial' || tipo === 'disponivel') return 'presencial';
  }

  for (const item of doProfissional) {
    const ymdDataEspecifica = normalizeYmd(item.dataEspecifica ?? item.data_especifica);
    if (ymdDataEspecifica) continue;
    const diaRaw = item.diaSemana ?? item.dia_semana;
    const dia = typeof diaRaw === 'string' ? Number(diaRaw) : diaRaw;
    if (dia === null || dia === undefined || dia !== diaSemana) continue;
    if (!matches(item)) continue;
    const tipo = (item.tipo || '').toLowerCase();
    if (tipo === 'folga') return 'folga';
    if (tipo === 'online') return 'online';
    if (tipo === 'presencial' || tipo === 'disponivel') return 'presencial';
  }

  return 'nao_configurado';
}

function verificarStatusCompleto(
  profissionalId: string,
  data: Date,
  horario: string,
  disponibilidades: Disponibilidade[],
  agendamentos: Agendamento[],
  agendamentoIgnorarId?: string,
): VerificacaoCompleta {
  const disponibilidade = verificarDisponibilidadeHorario(profissionalId, data, horario, disponibilidades);
  const ocupacao = verificarHorarioOcupado(profissionalId, data, horario, agendamentos, agendamentoIgnorarId);

  if (disponibilidade === 'presencial') {
    return {
      status: ocupacao.ocupado ? 'ocupado' : 'disponivel',
      motivo: ocupacao.ocupado ? ocupacao.motivo : 'Disponível para atendimento presencial.',
      dotColor: 'green',
      isOcupado: ocupacao.ocupado,
    };
  }

  if (disponibilidade === 'online') {
    return {
      status: ocupacao.ocupado ? 'ocupado' : 'disponivel',
      motivo: ocupacao.ocupado ? ocupacao.motivo : 'Disponível para atendimento on-line.',
      dotColor: 'blue',
      isOcupado: ocupacao.ocupado,
    };
  }

  if (disponibilidade === 'folga') {
    return {
      status: 'indisponivel',
      motivo: 'Profissional está de folga neste horário.',
      dotColor: 'red',
      isOcupado: false,
    };
  }

  return {
    status: 'indisponivel',
    motivo: 'Profissional não atende neste horário.',
    dotColor: 'red',
    isOcupado: false,
  };
}

export async function verificarHorariosProfissional(
  profissionalId: string,
  data: Date,
  agendamentoIgnorarId?: string,
) {
  const dataStr = toYmd(data);
  const disponibilidadesPromise = api.get<Disponibilidade[]>('/disponibilidades-profissionais', { params: { profissionalId } });
  const agendamentosPromise = api
    .get<{ data: Agendamento[] }>('/agendamentos', {
      params: {
        profissionalId,
        dataInicio: dataStr,
        dataFim: dataStr,
      },
    })
    .catch(async () =>
      api.get<{ data: Agendamento[] }>('/agendamentos', {
        params: {
          profissionalId,
          dataHoraInicio: `${dataStr}T00:00:00`,
        },
      }),
    );

  const [disponibilidadesResp, agendamentosResp] = await Promise.all([disponibilidadesPromise, agendamentosPromise]);

  const disponibilidades = Array.isArray(disponibilidadesResp.data) ? disponibilidadesResp.data : [];
  const agendamentos = Array.isArray(agendamentosResp.data?.data) ? agendamentosResp.data.data : [];

  return OPCOES_HORARIOS.map((horario) => ({
    horario,
    verificacao: verificarStatusCompleto(
      profissionalId,
      data,
      horario,
      disponibilidades,
      agendamentos,
      agendamentoIgnorarId,
    ),
  })) as HorarioVerificado[];
}

function getDiaSemanaNome(index: number) {
  return ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'][index] || 'dia';
}

export async function validarRecursoConformeDisponibilidade(params: {
  profissionalId: string;
  recursoId: string;
  dataHora: string;
}) {
  const [disponibilidadesResp, recursosResp] = await Promise.all([
    api.get<Disponibilidade[]>('/disponibilidades-profissionais', { params: { profissionalId: params.profissionalId } }),
    api.get<Recurso[]>('/recursos'),
  ]);

  const disponibilidades = Array.isArray(disponibilidadesResp.data) ? disponibilidadesResp.data : [];
  const recursos = Array.isArray(recursosResp.data) ? recursosResp.data : [];
  const recursoMap = new Map(recursos.map((item) => [item.id, item.nome]));

  const [datePart, timePart] = params.dataHora.split('T');
  const dataRef = new Date(`${datePart}T00:00:00`);
  const diaSemana = dataRef.getDay();
  const ymdSelecionado = normalizeYmd(datePart);
  const horarioMinutos = parseMinutes(timePart);

  if (horarioMinutos === null) {
    return {
      valido: false,
      mensagem: 'Horário inválido para validar o recurso.',
      alternativas: [] as Array<{ recursoId: string; recursoNome: string; horaInicio: string; horaFim: string }>,
    };
  }

  const filtradas = disponibilidades.filter((disp) => {
    const id = disp.profissionalId ?? disp.profissional_id;
    if (id !== params.profissionalId) return false;

    const ymdDataEspecifica = normalizeYmd(disp.dataEspecifica ?? disp.data_especifica);
    if (ymdDataEspecifica) {
      return ymdDataEspecifica === ymdSelecionado;
    }

    const diaRaw = disp.diaSemana ?? disp.dia_semana;
    const dia = typeof diaRaw === 'string' ? Number(diaRaw) : diaRaw;
    return dia === diaSemana;
  });

  const alternativas = filtradas
    .map((disp) => {
      const inicioMin = parseMinutes(disp.horaInicio ?? disp.hora_inicio);
      const fimMin = parseMinutes(disp.horaFim ?? disp.hora_fim);
      const recursoId = (disp.recursoId ?? disp.recurso_id) || '';
      if (inicioMin === null || fimMin === null || !recursoId) return null;
      if (!(horarioMinutos >= inicioMin && horarioMinutos < fimMin)) return null;

      const horaInicio = `${String(Math.floor(inicioMin / 60)).padStart(2, '0')}:${String(inicioMin % 60).padStart(2, '0')}`;
      const horaFim = `${String(Math.floor(fimMin / 60)).padStart(2, '0')}:${String(fimMin % 60).padStart(2, '0')}`;
      const recursoNome = disp.recurso?.nome || recursoMap.get(recursoId) || 'Recurso';
      return { recursoId, recursoNome, horaInicio, horaFim };
    })
    .filter((item): item is { recursoId: string; recursoNome: string; horaInicio: string; horaFim: string } => Boolean(item));

  const temRecursoExato = alternativas.some((item) => item.recursoId === params.recursoId);
  if (temRecursoExato) {
    return {
      valido: true,
      mensagem: '',
      alternativas,
    };
  }

  const recursoAtual = recursoMap.get(params.recursoId) || 'recurso atual';
  const textoAlternativas = alternativas.length
    ? alternativas.map((item) => `${item.recursoNome} (${item.horaInicio}-${item.horaFim})`).join(', ')
    : 'nenhuma';

  return {
    valido: false,
    mensagem: `O profissional não tem disponibilidade para o recurso ${recursoAtual} na ${getDiaSemanaNome(diaSemana)} às ${timePart}. Disponibilidades: ${textoAlternativas}.`,
    alternativas,
  };
}
