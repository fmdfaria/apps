import { Agendamento } from "../../core/domain/entities/Agendamento";

/**
 * Utilitários para gerar mensagens de erro detalhadas relacionadas a agendamentos
 */

export interface DetalhesConflito {
  agendamentoExistente: Agendamento;
  profissionalNome?: string;
  pacienteNome?: string;
  recursoNome?: string;
  servicoNome?: string;
}

/**
 * Formatar data/hora em português brasileiro
 */
export const formatarDataHoraBR = (data: Date): string => {
  const diasSemana = [
    'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 
    'Quinta-feira', 'Sexta-feira', 'Sábado'
  ];
  
  const diaSemana = diasSemana[data.getDay()];
  const dataFormatada = data.toLocaleDateString('pt-BR');
  const horaFormatada = data.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return `${diaSemana}, ${dataFormatada} às ${horaFormatada}`;
};

/**
 * Gerar mensagem de erro para conflito de profissional
 */
export const gerarMensagemConflitoP = (detalhes: DetalhesConflito): string => {
  const { agendamentoExistente, profissionalNome, pacienteNome, servicoNome } = detalhes;
  
  const dataHoraFormatada = formatarDataHoraBR(agendamentoExistente.dataHoraInicio);
  const nomeProfissional = profissionalNome || 'Profissional';
  const nomePacienteExistente = pacienteNome || 'outro paciente';
  const nomeServicoExistente = servicoNome || 'um atendimento';
  
  return `Conflito de agendamento: ${nomeProfissional} já possui ${nomeServicoExistente} agendado para ${dataHoraFormatada} com ${nomePacienteExistente}.`;
};

/**
 * Gerar mensagem de erro para conflito de recurso
 */
export const gerarMensagemConflitoRecurso = (detalhes: DetalhesConflito): string => {
  const { agendamentoExistente, profissionalNome, recursoNome, servicoNome } = detalhes;
  
  const dataHoraFormatada = formatarDataHoraBR(agendamentoExistente.dataHoraInicio);
  const nomeRecurso = recursoNome || 'Recurso';
  const nomeProfissionalExistente = profissionalNome || 'outro profissional';
  const nomeServicoExistente = servicoNome || 'um atendimento';
  
  return `Conflito de recurso: ${nomeRecurso} já está ocupado em ${dataHoraFormatada} com ${nomeServicoExistente} do profissional ${nomeProfissionalExistente}.`;
};

/**
 * Gerar mensagem de erro para conflito de paciente
 */
export const gerarMensagemConflitoPaciente = (detalhes: DetalhesConflito): string => {
  const { agendamentoExistente, pacienteNome, profissionalNome, servicoNome } = detalhes;
  
  const dataHoraFormatada = formatarDataHoraBR(agendamentoExistente.dataHoraInicio);
  const nomePaciente = pacienteNome || 'Paciente';
  const nomeProfissionalExistente = profissionalNome || 'outro profissional';
  const nomeServicoExistente = servicoNome || 'um atendimento';
  
  return `Conflito de paciente: ${nomePaciente} já possui ${nomeServicoExistente} agendado para ${dataHoraFormatada} com ${nomeProfissionalExistente}.`;
};

/**
 * Gerar mensagem detalhada para agendamento não encontrado
 */
export const gerarMensagemAgendamentoNaoEncontrado = (id: string, contexto?: string): string => {
  const contextoMsg = contexto ? ` ${contexto}` : '';
  return `Agendamento não encontrado: O agendamento com ID ${id}${contextoMsg} não existe ou foi removido.`;
};

/**
 * Gerar mensagem para agendamento não encontrado em série
 */
export const gerarMensagemAgendamentoNaoEncontradoSerie = (
  agendamentoId: string, 
  serieId: string, 
  totalAgendamentos?: number
): string => {
  const totalMsg = totalAgendamentos ? ` (${totalAgendamentos} agendamentos)` : '';
  return `Agendamento não encontrado na série: O agendamento ${agendamentoId} não pertence à série ${serieId}${totalMsg}.`;
};

/**
 * Gerar mensagem para erro de serviço não encontrado
 */
export const gerarMensagemServicoNaoEncontrado = (servicoId: string): string => {
  return `Serviço não encontrado: O serviço com ID ${servicoId} não existe ou foi desativado. Verifique se o serviço está ativo.`;
};