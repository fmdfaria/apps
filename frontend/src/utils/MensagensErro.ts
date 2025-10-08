import type { Agendamento } from '@/types/Agendamento';

/**
 * Utilitários para gerar mensagens de erro mais informativas no frontend
 */

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
 * Gerar mensagem detalhada para horário ocupado
 */
export const gerarMensagemHorarioOcupado = (
  agendamentoConflitante?: Agendamento,
  tipoAtendimento?: 'presencial' | 'online'
): string => {
  const tipo = tipoAtendimento === 'online' ? 'online' : 'presencial';
  
  if (agendamentoConflitante) {
    const dataHora = formatarDataHoraBR(new Date(agendamentoConflitante.dataHoraInicio));
    const nomePaciente = agendamentoConflitante.pacienteNome || agendamentoConflitante.paciente?.nomeCompleto || 'outro paciente';
    const nomeServico = agendamentoConflitante.servicoNome || agendamentoConflitante.servico?.nome || 'um atendimento';
    
    return `Horário ocupado: ${nomeServico} (${tipo}) já agendado para ${dataHora} com ${nomePaciente}`;
  }
  
  return `Horário já possui agendamento (${tipo})`;
};

/**
 * Gerar mensagem para campos obrigatórios
 */
export const gerarMensagemCampoObrigatorio = (campos: string[]): string => {
  if (campos.length === 1) {
    return `O campo ${campos[0]} é obrigatório.`;
  } else if (campos.length === 2) {
    return `Os campos ${campos[0]} e ${campos[1]} são obrigatórios.`;
  } else {
    const ultimoCampo = campos.pop();
    return `Os campos ${campos.join(', ')} e ${ultimoCampo} são obrigatórios.`;
  }
};

/**
 * Gerar mensagem para data passada
 */
export const gerarMensagemDataPassada = (operacao: string = 'agendamento'): string => {
  return `Data inválida: Não é possível criar ${operacao} para datas passadas. Selecione uma data futura.`;
};

/**
 * Gerar mensagem para operação não permitida em agendamento passado
 */
export const gerarMensagemOperacaoAgendamentoPassado = (operacao: string): string => {
  return `Operação não permitida: Não é possível ${operacao} de agendamentos que já ocorreram.`;
};

/**
 * Gerar mensagem de erro mais específica baseada no erro do backend
 */
export const processarErroBackend = (error: any): string => {
  const mensagemBackend = error?.response?.data?.message || error?.message || '';
  
  // Se já é uma mensagem melhorada do backend, usar ela
  if (mensagemBackend.includes('Conflito de agendamento:') || 
      mensagemBackend.includes('Conflito de recurso:') || 
      mensagemBackend.includes('Conflito de paciente:')) {
    return mensagemBackend;
  }
  
  // Para outras mensagens, verificar padrões conhecidos e melhorar
  if (mensagemBackend.includes('profissional já possui agendamento')) {
    return 'Conflito de agendamento: O profissional selecionado já possui um agendamento neste horário.';
  }
  
  if (mensagemBackend.includes('recurso já possui agendamento')) {
    return 'Conflito de recurso: O recurso selecionado já está sendo usado neste horário.';
  }
  
  if (mensagemBackend.includes('paciente já possui agendamento')) {
    return 'Conflito de paciente: Este paciente já possui um agendamento neste horário com o profissional selecionado.';
  }
  
  if (mensagemBackend.includes('Serviço não encontrado')) {
    return 'Serviço não encontrado: O serviço selecionado não existe ou foi desativado.';
  }
  
  // Retorna a mensagem original se não conseguiu melhorar
  return mensagemBackend || 'Ocorreu um erro inesperado. Tente novamente.';
};
