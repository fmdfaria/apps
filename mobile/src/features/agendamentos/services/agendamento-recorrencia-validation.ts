import { api } from '@/services/api/client';
import { getAgendamentos } from '@/features/agendamentos/services/agendamentos-api';
import type {
  Agendamento,
  DisponibilidadeProfissional,
  GetAgendamentosParams,
  RecorrenciaAgendamento,
} from '@/features/agendamentos/types';

export type ConflitoRecorrencia = {
  data: string;
  dataFormatada: string;
  hora: string;
  motivo: string;
  tipo: 'ocupado' | 'indisponivel';
  agendamentoConflitante?: {
    id: string;
    pacienteNome: string;
    profissionalNome: string;
    servicoNome: string;
    dataHoraInicio: string;
  };
};

export type ConflitosRecorrencia = {
  datasComConflito: ConflitoRecorrencia[];
  totalConflitos: number;
  totalDatas: number;
};

function toYmd(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseMinutes(value: string) {
  const [hour, minute] = value.split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

function parseMinutesFromUnknown(value: unknown) {
  if (!value) return null;

  if (value instanceof Date) {
    return value.getHours() * 60 + value.getMinutes();
  }

  if (typeof value === 'string') {
    if (value.includes('T')) {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      return date.getHours() * 60 + date.getMinutes();
    }

    return parseMinutes(value);
  }

  return null;
}

function normalizeYmd(value: unknown): string | null {
  if (!value) return null;

  if (value instanceof Date) {
    return toYmd(value);
  }

  if (typeof value === 'string') {
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
    if (match) return match[1];

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return toYmd(parsed);
  }

  return null;
}

function isStatusCancelado(status: string) {
  const normalized = status.trim().toUpperCase();
  return normalized === 'CANCELADO' || normalized === 'CANCELLED';
}

function extractDateAndTimeFromIso(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const ymd = toYmd(date);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return {
    ymd,
    hora: `${hh}:${mm}`,
    minutos: date.getHours() * 60 + date.getMinutes(),
  };
}

function getAgendamentoFimMinutos(agendamento: Agendamento, inicioMinutos: number) {
  if (agendamento.dataHoraFim) {
    const fim = extractDateAndTimeFromIso(agendamento.dataHoraFim);
    if (fim) {
      return fim.minutos;
    }
  }

  return inicioMinutos + 60;
}

function getDisponibilidadesDoDia(
  profissionalId: string,
  dataRef: Date,
  disponibilidades: DisponibilidadeProfissional[],
) {
  const ymdSelecionado = toYmd(dataRef);
  const diaSemana = dataRef.getDay();

  const doProfissional = disponibilidades.filter((disp) => {
    const dispProfissionalId = disp.profissionalId ?? disp.profissional_id;
    return dispProfissionalId === profissionalId;
  });

  const especificas = doProfissional.filter((disp) => {
    const ymd = normalizeYmd(disp.dataEspecifica ?? disp.data_especifica);
    return ymd === ymdSelecionado;
  });

  if (especificas.length > 0) {
    return especificas;
  }

  return doProfissional.filter((disp) => {
    const ymd = normalizeYmd(disp.dataEspecifica ?? disp.data_especifica);
    if (ymd) return false;

    const diaRaw = disp.diaSemana ?? disp.dia_semana;
    const dia = typeof diaRaw === 'string' ? Number(diaRaw) : diaRaw;
    return dia === diaSemana;
  });
}

function isHorarioDentroDaDisponibilidade(
  disp: DisponibilidadeProfissional,
  horarioMinutos: number,
) {
  const inicio = parseMinutesFromUnknown(disp.horaInicio ?? disp.hora_inicio);
  const fim = parseMinutesFromUnknown(disp.horaFim ?? disp.hora_fim);

  if (inicio === null || fim === null) {
    return false;
  }

  return horarioMinutos >= inicio && horarioMinutos < fim;
}

function getTipoDisponibilidade(disp: DisponibilidadeProfissional) {
  const tipo = (disp.tipo || '').trim().toLowerCase();
  if (tipo === 'folga') return 'folga';
  if (tipo === 'online') return 'online';
  if (tipo === 'presencial' || tipo === 'disponivel') return 'presencial';
  return 'desconhecido';
}

function validarDisponibilidadeProfissionalNoHorario(
  profissionalId: string,
  dataRef: Date,
  horarioMinutos: number,
  disponibilidades: DisponibilidadeProfissional[],
) {
  const candidatas = getDisponibilidadesDoDia(profissionalId, dataRef, disponibilidades).filter((disp) =>
    isHorarioDentroDaDisponibilidade(disp, horarioMinutos),
  );

  if (candidatas.length === 0) {
    return {
      disponivel: false,
      motivo: 'Profissional não atende neste horário.',
    };
  }

  const temFolga = candidatas.some((disp) => getTipoDisponibilidade(disp) === 'folga');
  if (temFolga) {
    return {
      disponivel: false,
      motivo: 'Profissional está de folga neste horário.',
    };
  }

  const temAtendimento = candidatas.some((disp) => {
    const tipo = getTipoDisponibilidade(disp);
    return tipo === 'presencial' || tipo === 'online';
  });

  if (!temAtendimento) {
    return {
      disponivel: false,
      motivo: 'Disponibilidade não configurada para este horário.',
    };
  }

  return {
    disponivel: true,
    motivo: '',
  };
}

function validarRecursoNoHorario(
  profissionalId: string,
  recursoId: string,
  dataRef: Date,
  horarioMinutos: number,
  disponibilidades: DisponibilidadeProfissional[],
) {
  const candidatas = getDisponibilidadesDoDia(profissionalId, dataRef, disponibilidades).filter((disp) =>
    isHorarioDentroDaDisponibilidade(disp, horarioMinutos),
  );

  const alternativas = candidatas
    .map((disp) => {
      const id = disp.recursoId ?? disp.recurso_id;
      if (!id) return null;

      const inicio = parseMinutesFromUnknown(disp.horaInicio ?? disp.hora_inicio);
      const fim = parseMinutesFromUnknown(disp.horaFim ?? disp.hora_fim);
      if (inicio === null || fim === null) return null;

      const nome = disp.recurso?.nome || 'Recurso';
      return {
        recursoId: id,
        recursoNome: nome,
        horaInicio: `${String(Math.floor(inicio / 60)).padStart(2, '0')}:${String(inicio % 60).padStart(2, '0')}`,
        horaFim: `${String(Math.floor(fim / 60)).padStart(2, '0')}:${String(fim % 60).padStart(2, '0')}`,
      };
    })
    .filter(
      (
        item,
      ): item is {
        recursoId: string;
        recursoNome: string;
        horaInicio: string;
        horaFim: string;
      } => Boolean(item),
    );

  if (alternativas.some((item) => item.recursoId === recursoId)) {
    return { valido: true, motivo: '' };
  }

  const alternativasTexto = alternativas.length
    ? alternativas.map((item) => `${item.recursoNome} (${item.horaInicio}-${item.horaFim})`).join(', ')
    : 'nenhuma';

  return {
    valido: false,
    motivo: `Recurso não configurado para este horário. Alternativas: ${alternativasTexto}.`,
  };
}

function buscarConflitoNoHorario(
  dataRef: Date,
  horarioMinutos: number,
  agendamentos: Agendamento[],
  filtro: (agendamento: Agendamento) => boolean,
) {
  const ymdSelecionado = toYmd(dataRef);

  return agendamentos.find((agendamento) => {
    if (!filtro(agendamento)) return false;
    if (isStatusCancelado(agendamento.status)) return false;

    const inicio = extractDateAndTimeFromIso(agendamento.dataHoraInicio);
    if (!inicio) return false;
    if (inicio.ymd !== ymdSelecionado) return false;

    const fimMinutos = getAgendamentoFimMinutos(agendamento, inicio.minutos);
    return horarioMinutos >= inicio.minutos && horarioMinutos < fimMinutos;
  });
}

function formatarDataExtenso(data: Date) {
  return data.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function gerarDatasRecorrencia(
  dataInicial: Date,
  recorrencia: RecorrenciaAgendamento,
) {
  const tipo = recorrencia.tipo;
  const maxRepeticoes = recorrencia.repeticoes || 52;
  const datas = [new Date(dataInicial)];
  const cursor = new Date(dataInicial);

  let limite: Date | null = null;
  if (recorrencia.ate) {
    const parsed = new Date(`${recorrencia.ate}T23:59:59`);
    if (!Number.isNaN(parsed.getTime())) {
      limite = parsed;
    }
  }

  let contador = 1;
  while (contador < maxRepeticoes) {
    if (tipo === 'quinzenal') {
      cursor.setDate(cursor.getDate() + 14);
    } else if (tipo === 'mensal') {
      cursor.setMonth(cursor.getMonth() + 1);
    } else {
      cursor.setDate(cursor.getDate() + 7);
    }

    if (limite && cursor > limite) {
      break;
    }

    datas.push(new Date(cursor));
    contador += 1;
  }

  return datas;
}

async function carregarAgendamentosNoIntervalo(params: GetAgendamentosParams) {
  const limit = 200;
  const resultados: Agendamento[] = [];
  let pagina = 1;
  let totalPaginas = 1;

  do {
    const response = await getAgendamentos({
      ...params,
      page: pagina,
      limit,
      includeArquivados: true,
    });
    resultados.push(...response.data);
    totalPaginas = response.pagination.totalPages || 1;
    pagina += 1;
  } while (pagina <= totalPaginas);

  return resultados;
}

function toConflitoAgendamento(agendamento: Agendamento) {
  return {
    id: agendamento.id,
    pacienteNome: agendamento.pacienteNome || 'Paciente não informado',
    profissionalNome: agendamento.profissionalNome || 'Profissional não informado',
    servicoNome: agendamento.servicoNome || 'Serviço não informado',
    dataHoraInicio: agendamento.dataHoraInicio,
  };
}

export async function verificarConflitosRecorrencia(params: {
  profissionalId: string;
  recursoId: string;
  dataHoraInicio: string;
  recorrencia: RecorrenciaAgendamento;
}) {
  try {
    const parsed = extractDateAndTimeFromIso(params.dataHoraInicio);
    if (!parsed) {
      return {
        datasComConflito: [],
        totalConflitos: 0,
        totalDatas: 0,
      } satisfies ConflitosRecorrencia;
    }

    const dataInicial = new Date(`${parsed.ymd}T00:00:00`);
    const datas = gerarDatasRecorrencia(dataInicial, params.recorrencia);
    const hora = parsed.hora;
    const horarioMinutos = parsed.minutos;

    const datasYmd = datas.map((item) => toYmd(item));
    const dataInicio = datasYmd[0];
    const dataFim = datasYmd[datasYmd.length - 1];

    const [disponibilidadesResp, agendamentosProfissional, agendamentosRecurso] = await Promise.all([
      api.get<DisponibilidadeProfissional[]>('/disponibilidades-profissionais'),
      carregarAgendamentosNoIntervalo({
        profissionalId: params.profissionalId,
        dataInicio,
        dataFim,
      }),
      carregarAgendamentosNoIntervalo({
        recursoId: params.recursoId,
        dataInicio,
        dataFim,
      }),
    ]);

    const disponibilidades = Array.isArray(disponibilidadesResp.data) ? disponibilidadesResp.data : [];
    const agendamentosMap = new Map<string, Agendamento>();
    for (const item of [...agendamentosProfissional, ...agendamentosRecurso]) {
      agendamentosMap.set(item.id, item);
    }
    const agendamentos = Array.from(agendamentosMap.values());

    const conflitos: ConflitoRecorrencia[] = [];

    for (const dataRef of datas) {
      const disponibilidadeProfissional = validarDisponibilidadeProfissionalNoHorario(
        params.profissionalId,
        dataRef,
        horarioMinutos,
        disponibilidades,
      );

      if (!disponibilidadeProfissional.disponivel) {
        conflitos.push({
          data: toYmd(dataRef),
          dataFormatada: formatarDataExtenso(dataRef),
          hora,
          motivo: disponibilidadeProfissional.motivo,
          tipo: 'indisponivel',
        });
        continue;
      }

      const conflitoProfissional = buscarConflitoNoHorario(
        dataRef,
        horarioMinutos,
        agendamentos,
        (agendamento) => agendamento.profissionalId === params.profissionalId,
      );

      if (conflitoProfissional) {
        conflitos.push({
          data: toYmd(dataRef),
          dataFormatada: formatarDataExtenso(dataRef),
          hora,
          motivo: 'Horário já possui agendamento para este profissional.',
          tipo: 'ocupado',
          agendamentoConflitante: toConflitoAgendamento(conflitoProfissional),
        });
        continue;
      }

      const recursoValido = validarRecursoNoHorario(
        params.profissionalId,
        params.recursoId,
        dataRef,
        horarioMinutos,
        disponibilidades,
      );

      if (!recursoValido.valido) {
        conflitos.push({
          data: toYmd(dataRef),
          dataFormatada: formatarDataExtenso(dataRef),
          hora,
          motivo: recursoValido.motivo,
          tipo: 'indisponivel',
        });
        continue;
      }

      const conflitoRecurso = buscarConflitoNoHorario(
        dataRef,
        horarioMinutos,
        agendamentos,
        (agendamento) => agendamento.recursoId === params.recursoId,
      );

      if (conflitoRecurso) {
        conflitos.push({
          data: toYmd(dataRef),
          dataFormatada: formatarDataExtenso(dataRef),
          hora,
          motivo: 'Recurso já está em uso neste horário.',
          tipo: 'ocupado',
          agendamentoConflitante: toConflitoAgendamento(conflitoRecurso),
        });
      }
    }

    return {
      datasComConflito: conflitos,
      totalConflitos: conflitos.length,
      totalDatas: datas.length,
    } satisfies ConflitosRecorrencia;
  } catch {
    return {
      datasComConflito: [],
      totalConflitos: 0,
      totalDatas: 0,
    } satisfies ConflitosRecorrencia;
  }
}

export function formatarConflitosRecorrenciaParaMensagem(
  conflitos: ConflitosRecorrencia,
  limite = 5,
) {
  if (!conflitos.totalConflitos) {
    return '';
  }

  const linhas = conflitos.datasComConflito.slice(0, limite).map((item) => {
    return `${item.dataFormatada} às ${item.hora}: ${item.motivo}`;
  });

  if (conflitos.totalConflitos > limite) {
    linhas.push(`... e mais ${conflitos.totalConflitos - limite} conflito(s).`);
  }

  return linhas.join('\n');
}
