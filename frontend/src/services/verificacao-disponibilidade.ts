import { getAgendamentos } from './agendamentos';
import { getDisponibilidadesProfissional } from './disponibilidades';
import { parseDataLocal } from '@/lib/utils';
import type { Agendamento } from '@/types/Agendamento';
import type { DisponibilidadeProfissional } from '@/types/DisponibilidadeProfissional';

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
): boolean => {
  // Criar data/hora para comparação (usar timezone local)
  const dataHoraSolicitada = new Date(data);
  const [hora, minuto] = horario.split(':').map(Number);
  dataHoraSolicitada.setHours(hora, minuto, 0, 0);

  // Verificar se existe agendamento no mesmo horário
  const ocupado = agendamentos.some(agendamento => {
    if (agendamento.profissionalId !== profissionalId) {
      return false;
    }
    
    // Verificar status cancelado (diferentes variações)
    const statusCancelado = ['CANCELADO', 'cancelado', 'CANCELLED', 'cancelled'].includes(agendamento.status);
    if (statusCancelado) {
      return false;
    }

    // Parse manual sem conversão de timezone (igual ao CalendarioPage)
    let dataHoraAgendamento: Date;
    try {
      // Parse manual da string ISO igual ao CalendarioPage
      const [datePart, timePart] = agendamento.dataHoraInicio.split('T');
      const [horaStr, minutoStr] = timePart.split(':');
      const [ano, mes, dia] = datePart.split('-');
      
      // Criar data manualmente sem conversão de timezone
      dataHoraAgendamento = new Date(
        parseInt(ano),
        parseInt(mes) - 1, // mês é 0-indexed
        parseInt(dia),
        parseInt(horaStr),
        parseInt(minutoStr),
        0,
        0
      );
      
      // Verificar se a data é válida
      if (isNaN(dataHoraAgendamento.getTime())) {
        console.error('❌ Data inválida:', agendamento.dataHoraInicio);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao parsear data:', agendamento.dataHoraInicio, error);
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
    
    const resultado = saoIguais || comparacaoAlternativa;
    
    // Log quando encontrar conflito
    if (resultado) {
      console.log('🔵 Conflito encontrado:', {
        horario,
        agendamentoId: agendamento.id,
        dataHoraInicio: agendamento.dataHoraInicio
      });
    }
    
    return resultado;
  });

  return ocupado;
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
  
  // Verificar se há alguma disponibilidade para este horário
  for (const disponibilidade of disponibilidadesProfissional) {
    // Verificar se é uma data específica ou dia da semana
    const isDataEspecifica = disponibilidade.dataEspecifica && 
      disponibilidade.dataEspecifica.toDateString() === data.toDateString();
    const isDiaSemana = disponibilidade.diaSemana !== null && disponibilidade.diaSemana === diaSemana;
    
    if (isDataEspecifica || isDiaSemana) {
      const inicioDisponibilidade = disponibilidade.horaInicio.getHours() * 60 + disponibilidade.horaInicio.getMinutes();
      const fimDisponibilidade = disponibilidade.horaFim.getHours() * 60 + disponibilidade.horaFim.getMinutes();
      
      // Se o horário está dentro do intervalo da disponibilidade
      if (horarioMinutos >= inicioDisponibilidade && horarioMinutos < fimDisponibilidade) {
        // Se é tipo 'folga', retornar folga
        if (disponibilidade.tipo === 'folga') {
          return 'folga';
        }
        // Se é tipo 'presencial', retornar presencial
        if (disponibilidade.tipo === 'presencial') {
          return 'presencial';
        }
        // Se é tipo 'online', retornar online
        if (disponibilidade.tipo === 'online') {
          return 'online';
        }
        // Para compatibilidade com versões antigas, tratar 'disponivel' como 'presencial'
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
  const ocupado = verificarHorarioOcupado(profissionalId, data, horario, agendamentos);
  
  switch (statusDisponibilidade) {
    case 'presencial':
      return {
        status: ocupado ? 'ocupado' : 'disponivel',
        motivo: ocupado ? 'Horário já possui agendamento (presencial)' : 'Disponível para atendimento presencial',
        dotColor: 'blue',
        isOcupado: ocupado
      };
    case 'online':
      return {
        status: ocupado ? 'ocupado' : 'disponivel',
        motivo: ocupado ? 'Horário já possui agendamento (online)' : 'Disponível para atendimento online',
        dotColor: 'green',
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
    
    console.log('🔍 Debug de filtro de data:', {
      dataSelecionadaOriginal: data,
      dataSelecionadaFormatada: dataSolicitadaStr,
      agendamentosParaComparar: agendamentos.map(a => ({
        id: a.id,
        dataHoraInicio: a.dataHoraInicio,
        dataExtraida: a.dataHoraInicio.split('T')[0],
        profissionalId: a.profissionalId
      }))
    });

    // Já vem filtrado pelo backend, mas manter fallback defensivo
    const agendamentosDaData = agendamentos.filter(a => a.dataHoraInicio.split('T')[0] === dataSolicitadaStr);

    // Debug apenas se necessário
    if (agendamentosDaData.length > 0) {
      console.log('📋 Agendamentos encontrados na data:', {
        data: data.toDateString(),
        profissionalId,
        total: agendamentosDaData.length,
        agendamentos: agendamentosDaData.map(a => {
          // Parse manual igual ao CalendarioPage
          const [datePart, timePart] = a.dataHoraInicio.split('T');
          const [hora, minuto] = timePart.split(':');
          return {
            id: a.id,
            horario: `${hora}:${minuto}`,
            status: a.status
          };
        })
      });
    } else {
      console.log('📋 Nenhum agendamento encontrado na data:', {
        data: data.toDateString(),  
        profissionalId,
        totalAgendamentosDisponiveisDoProfissional: agendamentos.length,
        datasComAgendamentos: agendamentos.map(a => a.dataHoraInicio.split('T')[0])
      });
    }

    // Lista de horários padrão (de 07:00 às 18:00, de 30 em 30 minutos)
    const horarios = [];
    for (let hora = 7; hora <= 18; hora++) {
      horarios.push(`${hora.toString().padStart(2, '0')}:00`);
      if (hora < 18) {
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
      console.log('🔵 Horários ocupados encontrados:', ocupados.map(r => r.horario));
    }

    return resultados;

  } catch (error) {
    console.error('Erro ao verificar horários do profissional:', error);
    // Retornar horários padrão como indisponíveis em caso de erro
    const horarios = [];
    for (let hora = 7; hora <= 18; hora++) {
      horarios.push(`${hora.toString().padStart(2, '0')}:00`);
      if (hora < 18) {
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
    // Formatar data para busca (início e fim do dia)
    const dataInicio = new Date(data);
    dataInicio.setHours(0, 0, 0, 0);
    
    const dataFim = new Date(data);
    dataFim.setHours(23, 59, 59, 999);

    // Carregar dados necessários
    const [disponibilidades, agendamentos] = await Promise.all([
      getAllDisponibilidades(),
      getAgendamentos()
      // Buscar todos os agendamentos e filtrar depois
    ]);

    // Filtrar agendamentos apenas da data e horário solicitados (usar parse manual igual ao CalendarioPage)
    const agendamentosDaDataHorario = agendamentos.filter(agendamento => {
      // Parse da string de data sem conversão de timezone (igual ao CalendarioPage)
      const agendamentoDateStr = agendamento.dataHoraInicio.split('T')[0]; // "2025-08-04"
      
      // Formatar data solicitada sem conversão UTC (igual ao CalendarioPage)
      const year = data.getFullYear();
      const month = (data.getMonth() + 1).toString().padStart(2, '0');
      const day = data.getDate().toString().padStart(2, '0');
      const dataSolicitadaStr = `${year}-${month}-${day}`; // "2025-08-04"
      
      return agendamentoDateStr === dataSolicitadaStr;
    });

    // Debug simplificado para profissionais
    if (agendamentosDaDataHorario.length > 0) {
      console.log('📅 Verificando profissionais - agendamentos encontrados:', agendamentosDaDataHorario.length);
    }

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