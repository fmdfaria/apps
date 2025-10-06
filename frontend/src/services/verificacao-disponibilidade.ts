import { getAgendamentos } from './agendamentos';
import { getDisponibilidadesProfissional, getAllDisponibilidades } from './disponibilidades';
import { parseDataLocal } from '@/lib/utils';
import type { Agendamento } from '@/types/Agendamento';
import type { DisponibilidadeProfissional } from '@/types/DisponibilidadeProfissional';
import { gerarMensagemHorarioOcupado } from '@/utils/MensagensErro';

export type StatusDisponibilidade = 'disponivel' | 'ocupado' | 'indisponivel';

export interface VerificacaoCompleta {
  status: StatusDisponibilidade;
  motivo?: string;
  dotColor: 'blue' | 'green' | 'red';
  isOcupado?: boolean;
}

export interface HorarioVerificado {
  horario: string;
  verificacao: VerificacaoCompleta;
}

export interface ProfissionalVerificado {
  profissionalId: string;
  nome: string;
  verificacao: VerificacaoCompleta;
}

// Função para verificar se um horário está ocupado por agendamento
const verificarHorarioOcupado = (
  profissionalId: string,
  data: Date,
  horario: string,
  agendamentos: Agendamento[]
): { ocupado: boolean; agendamentoConflitante?: Agendamento } => {
  // Criar data/hora para comparação (usar timezone local)
  const dataHoraSolicitada = new Date(data);
  const [hora, minuto] = horario.split(':').map(Number);
  dataHoraSolicitada.setHours(hora, minuto, 0, 0);

  // Verificar se existe agendamento no mesmo horário
  const agendamentoConflitante = agendamentos.find(agendamento => {
    if (agendamento.profissionalId !== profissionalId) {
      return false;
    }
    
    // Verificar status cancelado (diferentes variações)
    const statusCancelado = ['CANCELADO', 'cancelado', 'CANCELLED', 'cancelled'].includes(agendamento.status);
    if (statusCancelado) {
      return false;
    }

    // Interpretar ISO com sufixo Z como horário local correto (ex.: 10:30Z => 07:30 -03:00)
    const dataHoraAgendamento = new Date(agendamento.dataHoraInicio);
    if (isNaN(dataHoraAgendamento.getTime())) {
      return false;
    }
    
    // Criar versões normalizadas para comparação (sem segundos e milissegundos)
    const solicitadaFormatada = new Date(dataHoraSolicitada);
    solicitadaFormatada.setSeconds(0, 0);
    
    const agendamentoFormatada = new Date(dataHoraAgendamento);
    agendamentoFormatada.setSeconds(0, 0);
    
    // Comparação principal
    const saoIguais = solicitadaFormatada.getTime() === agendamentoFormatada.getTime();
    
    // Comparação alternativa: verificar se estão no mesmo dia e horário
    const mesmoDia = solicitadaFormatada.toDateString() === agendamentoFormatada.toDateString();
    const mesmaHora = solicitadaFormatada.getHours() === agendamentoFormatada.getHours();
    const mesmoMinuto = solicitadaFormatada.getMinutes() === agendamentoFormatada.getMinutes();
    const comparacaoAlternativa = mesmoDia && mesmaHora && mesmoMinuto;
    
    return saoIguais || comparacaoAlternativa;
  });

  return { ocupado: !!agendamentoConflitante, agendamentoConflitante };
};

// Função para verificar disponibilidade de horário (baseada no CalendarioPage)
const verificarDisponibilidadeHorario = (
  profissionalId: string, 
  data: Date, 
  horario: string,
  disponibilidades: DisponibilidadeProfissional[]
): 'presencial' | 'online' | 'folga' | 'nao_configurado' => {
  const diaSemana = data.getDay(); // 0 = domingo, 1 = segunda, etc.
  const [hora, minuto] = horario.split(':').map(Number);
  const horarioMinutos = hora * 60 + minuto;
  
  // Filtrar disponibilidades do profissional
  const disponibilidadesProfissional = disponibilidades.filter(d => d.profissionalId === profissionalId);
  
  // Debug removido para melhorar performance
  
  // PRIORIDADE: Primeiro verificar datas específicas, depois dias da semana
  
  // 1. Verificar se há disponibilidade de data específica (tem prioridade)
  for (const disponibilidade of disponibilidadesProfissional) {
    const isDataEspecifica = disponibilidade.dataEspecifica && 
      disponibilidade.dataEspecifica.toDateString() === data.toDateString();
    
    if (isDataEspecifica) {
      let inicioDisponibilidade, fimDisponibilidade;
      
      // Tratar diferentes formatos de horário
      const horaInicioRaw = disponibilidade.horaInicio;
      const horaFimRaw = disponibilidade.horaFim;
      
      if (typeof horaInicioRaw === 'string' && horaInicioRaw.includes('T')) {
        const dataInicio = new Date(horaInicioRaw);
        const dataFim = new Date(horaFimRaw as any);
        inicioDisponibilidade = dataInicio.getHours() * 60 + dataInicio.getMinutes();
        fimDisponibilidade = dataFim.getHours() * 60 + dataFim.getMinutes();
      } else if (typeof horaInicioRaw === 'object' && (horaInicioRaw as any).getHours) {
        inicioDisponibilidade = (horaInicioRaw as Date).getHours() * 60 + (horaInicioRaw as Date).getMinutes();
        fimDisponibilidade = (horaFimRaw as Date).getHours() * 60 + (horaFimRaw as Date).getMinutes();
      } else if (typeof horaInicioRaw === 'string' && horaInicioRaw.includes(':')) {
        const [hI, mI] = (horaInicioRaw as string).split(':').map(Number);
        const [hF, mF] = (horaFimRaw as string).split(':').map(Number);
        inicioDisponibilidade = hI * 60 + mI;
        fimDisponibilidade = hF * 60 + mF;
      } else {
        continue; // Formato não reconhecido, pular esta disponibilidade
      }
      
      // Se o horário está dentro do intervalo da disponibilidade específica
      if (horarioMinutos >= inicioDisponibilidade && horarioMinutos < fimDisponibilidade) {
        if (disponibilidade.tipo === 'folga') {
          return 'folga';
        }
        if (disponibilidade.tipo === 'presencial') {
          return 'presencial';
        }
        if (disponibilidade.tipo === 'online') {
          return 'online';
        }
        if (disponibilidade.tipo === 'disponivel') {
          return 'presencial';
        }
      }
    }
  }
  
  // 2. Se não houver disponibilidade específica, verificar disponibilidade semanal
  for (const disponibilidade of disponibilidadesProfissional) {
    const isDiaSemana = disponibilidade.diaSemana !== null && 
      disponibilidade.diaSemana === diaSemana && 
      !disponibilidade.dataEspecifica; // Garantir que não seja data específica
    
    if (isDiaSemana) {
      let inicioDisponibilidade, fimDisponibilidade;
      
      // Tratar diferentes formatos de horário
      const horaInicioRaw = disponibilidade.horaInicio;
      const horaFimRaw = disponibilidade.horaFim;
      
      if (typeof horaInicioRaw === 'string' && horaInicioRaw.includes('T')) {
        const dataInicio = new Date(horaInicioRaw);
        const dataFim = new Date(horaFimRaw as any);
        inicioDisponibilidade = dataInicio.getHours() * 60 + dataInicio.getMinutes();
        fimDisponibilidade = dataFim.getHours() * 60 + dataFim.getMinutes();
      } else if (typeof horaInicioRaw === 'object' && (horaInicioRaw as any).getHours) {
        inicioDisponibilidade = (horaInicioRaw as Date).getHours() * 60 + (horaInicioRaw as Date).getMinutes();
        fimDisponibilidade = (horaFimRaw as Date).getHours() * 60 + (horaFimRaw as Date).getMinutes();
      } else if (typeof horaInicioRaw === 'string' && horaInicioRaw.includes(':')) {
        const [hI, mI] = (horaInicioRaw as string).split(':').map(Number);
        const [hF, mF] = (horaFimRaw as string).split(':').map(Number);
        inicioDisponibilidade = hI * 60 + mI;
        fimDisponibilidade = hF * 60 + mF;
      } else {
        continue; // Formato não reconhecido, pular esta disponibilidade
      }
      
      // Se o horário está dentro do intervalo da disponibilidade semanal
      if (horarioMinutos >= inicioDisponibilidade && horarioMinutos < fimDisponibilidade) {
        if (disponibilidade.tipo === 'folga') {
          return 'folga';
        }
        if (disponibilidade.tipo === 'presencial') {
          return 'presencial';
        }
        if (disponibilidade.tipo === 'online') {
          return 'online';
        }
        if (disponibilidade.tipo === 'disponivel') {
          return 'presencial';
        }
      }
    }
  }
  
  // Se não há disponibilidades registradas para este horário, retornar não configurado
  return 'nao_configurado';
};

// Função principal para verificar status completo
const verificarStatusCompleto = (
  profissionalId: string,
  data: Date,
  horario: string,
  disponibilidades: DisponibilidadeProfissional[],
  agendamentos: Agendamento[]
): VerificacaoCompleta => {
  // 1. Verificar disponibilidade primeiro
  const statusDisponibilidade = verificarDisponibilidadeHorario(profissionalId, data, horario, disponibilidades);
  
  // 2. Depois verificar se está ocupado
  const resultadoOcupacao = verificarHorarioOcupado(profissionalId, data, horario, agendamentos);
  const ocupado = resultadoOcupacao.ocupado;
  
  switch (statusDisponibilidade) {
    case 'presencial':
      return {
        status: ocupado ? 'ocupado' : 'disponivel',
        motivo: ocupado ? gerarMensagemHorarioOcupado(resultadoOcupacao.agendamentoConflitante, 'presencial') : 'Disponível para atendimento presencial',
        dotColor: 'green',
        isOcupado: ocupado
      };
    case 'online':
      return {
        status: ocupado ? 'ocupado' : 'disponivel',
        motivo: ocupado ? gerarMensagemHorarioOcupado(resultadoOcupacao.agendamentoConflitante, 'online') : 'Disponível para atendimento online',
        dotColor: 'blue',
        isOcupado: ocupado
      };
    case 'folga':
      return {
        status: 'indisponivel',
        motivo: 'Profissional está de folga',
        dotColor: 'red',
        isOcupado: false
      };
    case 'nao_configurado':
      return {
        status: 'indisponivel',
        motivo: 'Profissional não atende neste horário',
        dotColor: 'red',
        isOcupado: false
      };
    default:
      return {
        status: 'indisponivel',
        motivo: 'Disponibilidade não configurada',
        dotColor: 'red',
        isOcupado: false
      };
  }
};

// Serviço principal para verificar horários de um profissional
export const verificarHorariosProfissional = async (
  profissionalId: string,
  data: Date
): Promise<HorarioVerificado[]> => {
  try {
    // Formatar data YYYY-MM-DD
    const year = data.getFullYear();
    const month = (data.getMonth() + 1).toString().padStart(2, '0');
    const day = data.getDate().toString().padStart(2, '0');
    const dataStr = `${year}-${month}-${day}`;

    // Carregar dados necessários com filtros específicos (evita chamadas desnecessárias)
    const [disponibilidades, agendamentosResp] = await Promise.all([
      getDisponibilidadesProfissional(profissionalId),
      getAgendamentos({ profissionalId, dataInicio: dataStr, dataFim: dataStr })
    ]);
    const agendamentos = agendamentosResp.data;

    const dataSolicitadaStr = dataStr;
    
    // Debug removido para melhorar performance

    // Já vem filtrado pelo backend, mas manter fallback defensivo
    const agendamentosDaData = agendamentos.filter(a => a.dataHoraInicio.split('T')[0] === dataSolicitadaStr);

    // Debug removido para melhorar performance

    // Lista de horários padrão (de 06:00 às 22:00, de 30 em 30 minutos)
    const horarios = [];
    for (let hora = 6; hora <= 22; hora++) {
      horarios.push(`${hora.toString().padStart(2, '0')}:00`);
      if (hora < 22) {
        horarios.push(`${hora.toString().padStart(2, '0')}:30`);
      }
    }

    // Verificar cada horário
    const resultados = horarios.map(horario => ({
      horario,
      verificacao: verificarStatusCompleto(profissionalId, data, horario, disponibilidades, agendamentosDaData)
    }));

    // Log para debug se encontrar horários ocupados
    const ocupados = resultados.filter(r => r.verificacao.status === 'ocupado');
    if (ocupados.length > 0) {
      // console.log('🔵 Horários ocupados encontrados:', ocupados.map(r => r.horario));
    }

    return resultados;

  } catch (error) {
    console.error('Erro ao verificar horários do profissional:', error);
    // Retornar horários padrão como indisponíveis em caso de erro
    const horarios = [];
    for (let hora = 6; hora <= 22; hora++) {
      horarios.push(`${hora.toString().padStart(2, '0')}:00`);
      if (hora < 22) {
        horarios.push(`${hora.toString().padStart(2, '0')}:30`);
      }
    }

    return horarios.map(horario => ({
      horario,
      verificacao: {
        status: 'indisponivel' as const,
        motivo: 'Erro ao verificar disponibilidade',
        dotColor: 'red' as const
      }
    }));
  }
};

// Serviço para verificar profissionais disponíveis em um horário
export const verificarProfissionaisDisponibilidade = async (
  profissionaisIds: string[],
  data: Date,
  horario: string,
  nomesProfissionais: { [id: string]: string }
): Promise<ProfissionalVerificado[]> => {
  try {
    // Formatar data para enviar como filtro ao backend (YYYY-MM-DD)
    const year = data.getFullYear();
    const month = (data.getMonth() + 1).toString().padStart(2, '0');
    const day = data.getDate().toString().padStart(2, '0');
    const dataStr = `${year}-${month}-${day}`;

    // OTIMIZAÇÃO: Carregar dados necessários COM FILTRO DE DATA no backend
    const [disponibilidades, agendamentosResp] = await Promise.all([
      getAllDisponibilidades(),
      getAgendamentos({ dataInicio: dataStr, dataFim: dataStr })
    ]);

    // Os agendamentos já vêm filtrados pelo backend, não precisa filtrar novamente
    const agendamentosDaDataHorario = agendamentosResp.data;

    // Verificar cada profissional
    return profissionaisIds.map(profissionalId => ({
      profissionalId,
      nome: nomesProfissionais[profissionalId] || 'Profissional não encontrado',
      verificacao: verificarStatusCompleto(profissionalId, data, horario, disponibilidades, agendamentosDaDataHorario)
    }));

  } catch (error) {
    console.error('Erro ao verificar profissionais disponíveis:', error);
    // Retornar todos como indisponíveis em caso de erro
    return profissionaisIds.map(profissionalId => ({
      profissionalId,
      nome: nomesProfissionais[profissionalId] || 'Profissional não encontrado',
      verificacao: {
        status: 'indisponivel' as const,
        motivo: 'Erro ao verificar disponibilidade',
        dotColor: 'red' as const
      }
    }));
  }
};