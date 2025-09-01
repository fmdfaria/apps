import { getAllDisponibilidades } from './disponibilidades';
import { getAgendamentos } from './agendamentos';
import { formatarDataHoraLocal } from '@/utils/dateUtils';

// Interface para conflitos de recorrência
export interface ConflitosRecorrencia {
  datasComConflito: Array<{
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
  }>;
  totalConflitos: number;
  totalDatas: number;
}

// Função para verificar se um horário está ocupado por agendamento
const verificarHorarioOcupado = (
  profissionalId: string,
  recursoId: string,
  data: Date,
  horario: string,
  agendamentos: any[]
): { ocupado: boolean; agendamentoConflitante?: any } => {
  // Converter data para string no formato YYYY-MM-DD para comparação
  const dataSolicitada = `${data.getFullYear()}-${(data.getMonth() + 1).toString().padStart(2, '0')}-${data.getDate().toString().padStart(2, '0')}`;

  // Verificar se existe agendamento no mesmo horário
  const agendamentoConflitante = agendamentos.find(agendamento => {
    const mesmoProfissional = agendamento.profissionalId === profissionalId;
    const mesmoRecurso = agendamento.recursoId === recursoId;
    if (!mesmoProfissional && !mesmoRecurso) {
      return false;
    }
    
    // Verificar status cancelado (diferentes variações)
    const statusCancelado = ['CANCELADO', 'cancelado', 'CANCELLED', 'cancelled'].includes(agendamento.status);
    if (statusCancelado) {
      return false;
    }

    // Usar formatarDataHoraLocal para parsing correto (igual ao CalendarioPage)
    const { data: dataAgendamento, hora: horaAgendamento } = formatarDataHoraLocal(agendamento.dataHoraInicio);
    
    // Comparar data (string) e horário (string) diretamente
    return dataAgendamento === dataSolicitada && horaAgendamento === horario;
  });

  return {
    ocupado: !!agendamentoConflitante,
    agendamentoConflitante
  };
};

// Função para verificar disponibilidade de horário
const verificarDisponibilidadeHorario = (
  profissionalId: string, 
  data: Date, 
  horario: string,
  disponibilidades: any[]
): 'presencial' | 'online' | 'folga' | 'nao_configurado' => {
  const diaSemana = data.getDay();
  const [hora, minuto] = horario.split(':').map(Number);
  const horarioMinutos = hora * 60 + minuto;
  
  // Filtrar disponibilidades do profissional
  const disponibilidadesProfissional = disponibilidades.filter(d => d.profissionalId === profissionalId);
  
  // Verificar se há alguma disponibilidade para este horário
  for (const disponibilidade of disponibilidadesProfissional) {
    // Verificar se é uma data específica ou dia da semana
    const isDataEspecifica = disponibilidade.dataEspecifica && 
      new Date(disponibilidade.dataEspecifica).toDateString() === data.toDateString();
    const isDiaSemana = disponibilidade.diaSemana !== null && disponibilidade.diaSemana === diaSemana;
    
    if (isDataEspecifica || isDiaSemana) {
      let inicioDisponibilidade, fimDisponibilidade;
      
      // Tratar diferentes formatos de horário
      if (typeof disponibilidade.horaInicio === 'string' && disponibilidade.horaInicio.includes('T')) {
        const dataInicio = new Date(disponibilidade.horaInicio);
        const dataFim = new Date(disponibilidade.horaFim);
        inicioDisponibilidade = dataInicio.getHours() * 60 + dataInicio.getMinutes();
        fimDisponibilidade = dataFim.getHours() * 60 + dataFim.getMinutes();
      } else if (typeof disponibilidade.horaInicio === 'object' && disponibilidade.horaInicio.getHours) {
        inicioDisponibilidade = disponibilidade.horaInicio.getHours() * 60 + disponibilidade.horaInicio.getMinutes();
        fimDisponibilidade = disponibilidade.horaFim.getHours() * 60 + disponibilidade.horaFim.getMinutes();
      } else if (typeof disponibilidade.horaInicio === 'string' && disponibilidade.horaInicio.includes(':')) {
        const [hI, mI] = disponibilidade.horaInicio.split(':').map(Number);
        const [hF, mF] = disponibilidade.horaFim.split(':').map(Number);
        inicioDisponibilidade = hI * 60 + mI;
        fimDisponibilidade = hF * 60 + mF;
      } else {
        continue;
      }
      
      // Se o horário está dentro do intervalo da disponibilidade
      if (horarioMinutos >= inicioDisponibilidade && horarioMinutos < fimDisponibilidade) {
        if (disponibilidade.tipo === 'folga') return 'folga';
        if (disponibilidade.tipo === 'presencial') return 'presencial';
        if (disponibilidade.tipo === 'online') return 'online';
        if (disponibilidade.tipo === 'disponivel') return 'presencial'; // Compatibilidade
      }
    }
  }
  
  return 'nao_configurado';
};

// Função para verificar status completo
const verificarStatusCompleto = (
  profissionalId: string,
  recursoId: string,
  data: Date,
  horario: string,
  disponibilidades: any[],
  agendamentos: any[]
): { status: 'disponivel' | 'ocupado' | 'indisponivel'; motivo: string; agendamentoConflitante?: any } => {
  // 1. Verificar disponibilidade primeiro
  const statusDisponibilidade = verificarDisponibilidadeHorario(profissionalId, data, horario, disponibilidades);
  
  // 2. Depois verificar se está ocupado
  const { ocupado, agendamentoConflitante } = verificarHorarioOcupado(profissionalId, recursoId, data, horario, agendamentos);
  
  switch (statusDisponibilidade) {
    case 'presencial':
      return {
        status: ocupado ? 'ocupado' : 'disponivel',
        motivo: ocupado ? 'Horário já possui agendamento (presencial)' : 'Disponível para atendimento presencial',
        agendamentoConflitante
      };
    case 'online':
      return {
        status: ocupado ? 'ocupado' : 'disponivel',
        motivo: ocupado ? 'Horário já possui agendamento (online)' : 'Disponível para atendimento online',
        agendamentoConflitante
      };
    case 'folga':
      return {
        status: 'indisponivel',
        motivo: 'Profissional está de folga'
      };
    case 'nao_configurado':
      return {
        status: 'indisponivel',
        motivo: 'Profissional não atende neste horário'
      };
    default:
      return {
        status: 'indisponivel',
        motivo: 'Disponibilidade não configurada'
      };
  }
};

// Função para gerar datas da recorrência
const gerarDatasRecorrencia = (
  dataInicial: Date,
  tipo: 'semanal' | 'quinzenal' | 'mensal',
  repeticoes?: number,
  ate?: string
): Date[] => {
  const datas: Date[] = [new Date(dataInicial)];
  let dataAtual = new Date(dataInicial);
  let contador = 1;

  // Determinar limite
  const dataLimite = ate ? new Date(ate + 'T23:59:59') : null;
  const maxRepeticoes = repeticoes || 52; // Máximo padrão

  while (contador < maxRepeticoes) {
    // Calcular próxima data baseada no tipo
    switch (tipo) {
      case 'semanal':
        dataAtual.setDate(dataAtual.getDate() + 7);
        break;
      case 'quinzenal':
        dataAtual.setDate(dataAtual.getDate() + 14);
        break;
      case 'mensal':
        dataAtual.setMonth(dataAtual.getMonth() + 1);
        break;
    }

    // Verificar se passou do limite
    if (dataLimite && dataAtual > dataLimite) {
      break;
    }

    datas.push(new Date(dataAtual));
    contador++;
  }

  return datas;
};

// Função principal para verificar conflitos em recorrência
export const verificarConflitosRecorrencia = async (
  profissionalId: string,
  recursoId: string,
  dataHoraInicio: string,
  recorrencia: {
    tipo: 'semanal' | 'quinzenal' | 'mensal';
    repeticoes?: number;
    ate?: string;
  }
): Promise<ConflitosRecorrencia> => {
  try {
    // Usar formatarDataHoraLocal para parsing correto (sem conversões timezone)
    const { data: dataStr, hora: horario } = formatarDataHoraLocal(dataHoraInicio);
    
    // Converter data string para objeto Date
    const [ano, mes, dia] = dataStr.split('-').map(Number);
    const dataInicial = new Date(ano, mes - 1, dia); // mes é 0-indexed

    // Gerar todas as datas da recorrência
    const todasDatas = gerarDatasRecorrencia(
      dataInicial,
      recorrencia.tipo,
      recorrencia.repeticoes,
      recorrencia.ate
    );

    // Carregar dados necessários
    const [disponibilidades, agendamentosProf, agendamentosRecurso] = await Promise.all([
      getAllDisponibilidades(),
      getAgendamentos({ profissionalId }),
      getAgendamentos({ recursoId })
    ]);

    // Unificar agendamentos por profissional e por recurso (evitar duplicados por id)
    const mergeMap = new Map<string, any>();
    for (const ag of [...agendamentosProf.data, ...agendamentosRecurso.data]) {
      if (!mergeMap.has(ag.id)) mergeMap.set(ag.id, ag);
    }
    const agendamentos = Array.from(mergeMap.values());

    const datasComConflito: ConflitosRecorrencia['datasComConflito'] = [];

    // Verificar cada data
    for (const data of todasDatas) {
      const verificacao = verificarStatusCompleto(
        profissionalId,
        recursoId,
        data,
        horario,
        disponibilidades,
        agendamentos
      );

      // Se não está disponível ou está ocupado, é um conflito
      if (verificacao.status === 'ocupado' || verificacao.status === 'indisponivel') {
        const dataFormatada = data.toLocaleDateString('pt-BR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        const conflito: any = {
          data: data.toISOString().split('T')[0],
          dataFormatada,
          hora: horario,
          motivo: verificacao.motivo || 'Conflito não especificado',
          tipo: verificacao.status === 'ocupado' ? 'ocupado' : 'indisponivel'
        };

        // Se há agendamento conflitante, incluir os dados
        if (verificacao.agendamentoConflitante) {
          conflito.agendamentoConflitante = {
            id: verificacao.agendamentoConflitante.id,
            pacienteNome: verificacao.agendamentoConflitante.pacienteNome || 'Paciente não informado',
            profissionalNome: verificacao.agendamentoConflitante.profissionalNome || 'Profissional não informado',
            servicoNome: verificacao.agendamentoConflitante.servicoNome || 'Serviço não informado',
            dataHoraInicio: verificacao.agendamentoConflitante.dataHoraInicio
          };
        }

        datasComConflito.push(conflito);
      }
    }

    return {
      datasComConflito,
      totalConflitos: datasComConflito.length,
      totalDatas: todasDatas.length
    };

  } catch (error) {
    console.error('Erro ao verificar conflitos de recorrência:', error);
    return {
      datasComConflito: [],
      totalConflitos: 0,
      totalDatas: 0
    };
  }
};

// Verificar conflitos para uma lista explícita de datas/horas (ISO, com ou sem offset)
export const verificarConflitosParaDatas = async (
  profissionalId: string,
  recursoId: string,
  datasHorasISO: string[],
  pacienteId?: string
): Promise<ConflitosRecorrencia> => {
  try {
    const [disponibilidades, agendamentosProf, agendamentosRecurso, agendamentosPaciente] = await Promise.all([
      getAllDisponibilidades(),
      getAgendamentos({ profissionalId }),
      getAgendamentos({ recursoId }),
      pacienteId ? getAgendamentos({ pacienteId }) : Promise.resolve({ data: [], pagination: { page: 1, limit: 0, total: 0, totalPages: 1 } })
    ]);

    const mergeMap = new Map<string, any>();
    for (const ag of [...agendamentosProf.data, ...agendamentosRecurso.data, ...agendamentosPaciente.data]) {
      if (!mergeMap.has(ag.id)) mergeMap.set(ag.id, ag);
    }
    const agendamentos = Array.from(mergeMap.values());

    const datasComConflito: ConflitosRecorrencia['datasComConflito'] = [];

    for (const iso of datasHorasISO) {
      // Usar formatarDataHoraLocal para parsing correto (sem conversões de timezone)
      const { data: dataStr, hora: horario } = formatarDataHoraLocal(iso);
      
      // Converter data string para objeto Date
      const [ano, mes, dia] = dataStr.split('-').map(Number);
      const data = new Date(ano, mes - 1, dia); // mes é 0-indexed

      const verificacao = verificarStatusCompleto(
        profissionalId,
        recursoId,
        data,
        horario,
        disponibilidades,
        agendamentos
      );

      if (verificacao.status === 'ocupado' || verificacao.status === 'indisponivel') {
        const dataFormatada = data.toLocaleDateString('pt-BR', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        const conflito: any = {
          data: iso.split('T')[0],
          dataFormatada,
          hora: horario,
          motivo: verificacao.motivo || 'Conflito não especificado',
          tipo: verificacao.status === 'ocupado' ? 'ocupado' : 'indisponivel'
        };

        if (verificacao.agendamentoConflitante) {
          conflito.agendamentoConflitante = {
            id: verificacao.agendamentoConflitante.id,
            pacienteNome: verificacao.agendamentoConflitante.pacienteNome || 'Paciente não informado',
            profissionalNome: verificacao.agendamentoConflitante.profissionalNome || 'Profissional não informado',
            servicoNome: verificacao.agendamentoConflitante.servicoNome || 'Serviço não informado',
            dataHoraInicio: verificacao.agendamentoConflitante.dataHoraInicio
          };
        }

        datasComConflito.push(conflito);
      }
    }

    return {
      datasComConflito,
      totalConflitos: datasComConflito.length,
      totalDatas: datasHorasISO.length
    };
  } catch (error) {
    console.error('Erro ao verificar conflitos para datas explícitas:', error);
    return {
      datasComConflito: [],
      totalConflitos: 0,
      totalDatas: 0
    };
  }
};