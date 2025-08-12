import { useState, useEffect, useCallback } from 'react';
import { AppToast } from '@/services/toast';
import type { CreateAgendamentoData, AgendamentoFormData } from '@/services/agendamentos';
import type { TipoRecorrencia } from '@/types/Agendamento';
import { getProfissionaisByServico, getServicosConveniosByProfissional, type ServicoConvenioProfissional } from '@/services/profissionais-servicos';
import { createAgendamento, getAgendamentoFormData } from '@/services/agendamentos';
import { FORM_DATA_PADRAO, RECORRENCIA_PADRAO, OPCOES_HORARIOS } from '../utils/agendamento-constants';
import type { 
  TipoFluxo, 
  RecorrenciaState, 
  AgendamentoFormState, 
  AgendamentoDataState, 
  AgendamentoLoadingState,
  AgendamentoFormContext 
} from '../types/agendamento-form';

interface UseAgendamentoFormProps {
  isOpen: boolean;
  preenchimentoInicial?: {
    profissionalId?: string;
    dataHoraInicio?: string;
    pacienteId?: string;
    servicoId?: string;
    convenioId?: string;
    recursoId?: string;
    tipoAtendimento?: 'presencial' | 'online';
    tipoFluxo?: TipoFluxo;
  };
  onSuccess: () => void;
  onClose: () => void;
}

export const useAgendamentoForm = ({ 
  isOpen, 
  preenchimentoInicial, 
  onSuccess, 
  onClose 
}: UseAgendamentoFormProps): AgendamentoFormContext => {
  // Estados do formulário
  const [formData, setFormData] = useState<CreateAgendamentoData>(FORM_DATA_PADRAO);
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [horaAgendamento, setHoraAgendamento] = useState('');
  const [temRecorrencia, setTemRecorrencia] = useState(true);
  const [recorrencia, setRecorrencia] = useState<RecorrenciaState>(RECORRENCIA_PADRAO);
  const [tipoFluxo, setTipoFluxo] = useState<TipoFluxo | null>(null);

  // Estados de dados
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [profissionaisPorServico, setProfissionaisPorServico] = useState<any[]>([]);
  const [convenios, setConvenios] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [recursos, setRecursos] = useState<any[]>([]);
  const [conveniosDoProfissional, setConveniosDoProfissional] = useState<any[]>([]);
  const [servicosDoProfissional, setServicosDoProfissional] = useState<any[]>([]);
  const [disponibilidades, setDisponibilidades] = useState<any[]>([]);

  // Estados de loading
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingProfissionaisPorServico, setLoadingProfissionaisPorServico] = useState(false);

  // Estados para modal de confirmação de recursos
  const [showResourceConfirmation, setShowResourceConfirmation] = useState(false);
  const [resourceConfirmationData, setResourceConfirmationData] = useState<{
    recursoNome: string;
    profissionalNome: string;
    dadosParaEnvio: any;
  } | null>(null);

  // Estado para controlar se o usuário selecionou manualmente um recurso
  const [userSelectedResource, setUserSelectedResource] = useState(false);

  // Função para carregar todos os dados necessários
  const carregarDados = useCallback(async (filtros?: { data?: string; profissionalId?: string }) => {
    setLoadingData(true);
    try {
      const formData = await getAgendamentoFormData(filtros);
      
      // Os dados já vêm ordenados da API
      setPacientes(formData.pacientes);
      setProfissionais(formData.profissionais);
      setConvenios(formData.convenios);
      setServicos(formData.servicos);
      setRecursos(formData.recursos);
      setDisponibilidades(formData.disponibilidades || []);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      AppToast.error('Erro ao carregar dados do formulário', {
        description: 'Ocorreu um problema ao carregar os dados. Tente novamente.'
      });
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Função para carregar profissionais por serviço
  const carregarProfissionaisPorServico = useCallback(async (servicoId: string) => {
    setLoadingProfissionaisPorServico(true);
    try {
      const profissionaisData = await getProfissionaisByServico(servicoId);
      setProfissionaisPorServico(profissionaisData);
    } catch (error) {
      console.error('Erro ao carregar profissionais do serviço:', error);
      AppToast.error('Erro ao carregar profissionais do serviço', {
        description: 'Não foi possível carregar os profissionais deste serviço.'
      });
      setProfissionaisPorServico([]);
    } finally {
      setLoadingProfissionaisPorServico(false);
    }
  }, []);

  // Função para carregar convênios e serviços do profissional
  const carregarDadosDoProfissional = useCallback(async (profissionalId: string) => {
    try {
      const dadosProfissional: ServicoConvenioProfissional = await getServicosConveniosByProfissional(profissionalId);
      
      // Extrair convênios únicos do profissional
      const conveniosUnicos = dadosProfissional.convenios.sort((a, b) => 
        a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
      );
      setConveniosDoProfissional(conveniosUnicos);
      
      // Extrair serviços únicos do profissional
      const servicosUnicos = dadosProfissional.servicos
        .map(s => ({
          id: s.id,
          nome: s.nome,
          duracaoMinutos: s.duracaoMinutos,
          preco: s.valor,
          convenioId: s.convenio.id
        }))
        .filter((servico, index, self) => 
          index === self.findIndex(s => s.id === servico.id)
        )
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
      
      setServicosDoProfissional(servicosUnicos);
      
    } catch (error) {
      console.error('Erro ao carregar dados do profissional:', error);
      AppToast.error('Erro ao carregar dados do profissional', {
        description: 'Não foi possível carregar os convênios e serviços deste profissional.'
      });
      setConveniosDoProfissional([]);
      setServicosDoProfissional([]);
    }
  }, []);

  // Função para resetar o formulário
  const resetForm = useCallback(() => {
    setTipoFluxo(null);
    setFormData(FORM_DATA_PADRAO);
    setDataAgendamento('');
    setHoraAgendamento('');
    setTemRecorrencia(true);
    setRecorrencia(RECORRENCIA_PADRAO);
    
    // Limpar dados carregados para próxima sessão
    setPacientes([]);
    setProfissionais([]);
    setProfissionaisPorServico([]);
    setConvenios([]);
    setServicos([]);
    setRecursos([]);
    setConveniosDoProfissional([]);
    setServicosDoProfissional([]);
    setDisponibilidades([]);
    setLoadingData(false);
    setLoadingProfissionaisPorServico(false);
    
    // Limpar estados do modal de confirmação
    setShowResourceConfirmation(false);
    setResourceConfirmationData(null);
    
    // Resetar flag de seleção manual
    setUserSelectedResource(false);
  }, []);

  // Função para validar se o recurso está conforme a disponibilidade cadastrada
  const validarRecursoConformeDisponibilidade = useCallback(async (
    profissionalId: string, 
    recursoId: string, 
    dataHoraCompleta: string
  ): Promise<boolean> => {
    if (!disponibilidades.length) return true; // Se não há disponibilidades, aceita qualquer recurso

    // Extrair data e hora
    const [data, hora] = dataHoraCompleta.split('T');
    const dataObj = new Date(data + 'T00:00:00');
    const diaSemana = dataObj.getDay();
    const [horaNum, minutoNum] = hora.split(':').map(Number);
    const horarioMinutos = horaNum * 60 + minutoNum;

    // Buscar disponibilidades do profissional
    const disponibilidadesProfissional = disponibilidades.filter(disp => {
      if (disp.profissionalId !== profissionalId) return false;
      
      // Verificar se é para data específica
      if (disp.dataEspecifica) {
        const dataDisp = new Date(disp.dataEspecifica);
        return dataDisp.getFullYear() === dataObj.getFullYear() &&
               dataDisp.getMonth() === dataObj.getMonth() &&
               dataDisp.getDate() === dataObj.getDate();
      }
      
      // Verificar se é para dia da semana
      if (disp.diaSemana !== null && disp.diaSemana !== undefined) {
        return disp.diaSemana === diaSemana;
      }
      
      return false;
    });

    // Verificar se existe uma disponibilidade com o recurso selecionado no horário específico
    const disponibilidadeComRecurso = disponibilidadesProfissional.find(disp => {
      if (disp.recursoId !== recursoId) return false;
      
      if (disp.horaInicio && disp.horaFim) {
        let horaInicioDisp, horaFimDisp;
        
        // Tratar diferentes formatos de horário (mesmo código da auto-seleção)
        if (typeof disp.horaInicio === 'string' && disp.horaInicio.includes('T')) {
          const dataInicio = new Date(disp.horaInicio);
          const dataFim = new Date(disp.horaFim);
          horaInicioDisp = dataInicio.getHours() * 60 + dataInicio.getMinutes();
          horaFimDisp = dataFim.getHours() * 60 + dataFim.getMinutes();
        }
        else if (typeof disp.horaInicio === 'object' && disp.horaInicio.getHours) {
          horaInicioDisp = disp.horaInicio.getHours() * 60 + disp.horaInicio.getMinutes();
          horaFimDisp = disp.horaFim.getHours() * 60 + disp.horaFim.getMinutes();
        } 
        else if (typeof disp.horaInicio === 'string' && disp.horaInicio.includes(':')) {
          const [hI, mI] = disp.horaInicio.split(':').map(Number);
          const [hF, mF] = disp.horaFim.split(':').map(Number);
          horaInicioDisp = hI * 60 + mI;
          horaFimDisp = hF * 60 + mF;
        }
        else {
          return false;
        }
        
        // Verificar se o horário está dentro do intervalo
        return horarioMinutos >= horaInicioDisp && horarioMinutos < horaFimDisp;
      }
      
      return false;
    });

    return !!disponibilidadeComRecurso; // Retorna true se encontrou a disponibilidade, false se não encontrou
  }, [disponibilidades]);

  // Função para submeter o formulário
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!formData.pacienteId || !formData.profissionalId || !formData.servicoId || 
        !formData.convenioId || !formData.recursoId || !dataAgendamento || !horaAgendamento) {
      AppToast.validation('Campos obrigatórios', 'Preencha todos os campos obrigatórios para continuar.');
      return;
    }

    // Combinar data e hora
    const dataHoraCombinada = `${dataAgendamento}T${horaAgendamento}`;
    
    // Validação adicional: verificar se a data/hora não é no passado
    const dataHoraSelecionada = new Date(dataHoraCombinada);
    const agora = new Date();
    
    if (dataHoraSelecionada <= agora) {
      AppToast.validation('Data inválida', 'A data e hora do agendamento deve ser no futuro.');
      return;
    }

    // Validação de recurso x disponibilidade
    const recursoConforme = await validarRecursoConformeDisponibilidade(
      formData.profissionalId, 
      formData.recursoId, 
      dataHoraCombinada
    );

    if (!recursoConforme) {
      const recursoNome = recursos.find(r => r.id === formData.recursoId)?.nome || 'Recurso selecionado';
      const profissionalNome = profissionais.find(p => p.id === formData.profissionalId)?.nome || 'Profissional';
      
      // Preparar dados para envio
      const dadosParaEnvio = {
        ...formData,
        dataHoraInicio: dataHoraCombinada,
        recorrencia: temRecorrencia ? {
          tipo: recorrencia.tipo,
          ...(recorrencia.repeticoes && { repeticoes: recorrencia.repeticoes }),
          ...(recorrencia.ate && { ate: recorrencia.ate })
        } : undefined
      };

      // Mostrar modal de confirmação moderno
      setResourceConfirmationData({
        recursoNome,
        profissionalNome,
        dadosParaEnvio
      });
      setShowResourceConfirmation(true);
      return; // Parar execução até confirmação
    }

    // Se chegou até aqui, o recurso está conforme - prosseguir com criação
    setLoading(true);
    try {
      const dadosParaEnvio = {
        ...formData,
        dataHoraInicio: dataHoraCombinada,
        recorrencia: temRecorrencia ? {
          tipo: recorrencia.tipo,
          ...(recorrencia.repeticoes && { repeticoes: recorrencia.repeticoes }),
          ...(recorrencia.ate && { ate: recorrencia.ate })
        } : undefined
      };

      await createAgendamento(dadosParaEnvio);
      AppToast.created('Agendamento', 'O agendamento foi criado com sucesso!');
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      AppToast.error('Erro ao criar agendamento', {
        description: 'Não foi possível criar o agendamento. Tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  }, [formData, dataAgendamento, horaAgendamento, temRecorrencia, recorrencia, resetForm, onSuccess, onClose]);

  // Função para confirmar criação com recurso inconsistente
  const handleResourceConfirmation = useCallback(async () => {
    if (!resourceConfirmationData) return;

    setShowResourceConfirmation(false);
    setLoading(true);

    try {
      await createAgendamento(resourceConfirmationData.dadosParaEnvio);
      AppToast.created('Agendamento', 'O agendamento foi criado com sucesso!');
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      AppToast.error('Erro ao criar agendamento', {
        description: 'Não foi possível criar o agendamento. Tente novamente.'
      });
    } finally {
      setLoading(false);
      setResourceConfirmationData(null);
    }
  }, [resourceConfirmationData, resetForm, onSuccess, onClose]);

  // Função para cancelar e escolher outro recurso
  const handleResourceCancel = useCallback(() => {
    setShowResourceConfirmation(false);
    setResourceConfirmationData(null);
    // O usuário permanece no formulário para escolher outro recurso
  }, []);

  // Effect para carregar dados quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      // Se há preenchimento inicial com profissional e data, passar como filtros
      const filtros: { data?: string; profissionalId?: string } = {};
      
      if (preenchimentoInicial?.profissionalId) {
        filtros.profissionalId = preenchimentoInicial.profissionalId;
      }
      
      if (preenchimentoInicial?.dataHoraInicio) {
        // Extrair apenas a data (YYYY-MM-DD) do datetime
        const [data] = preenchimentoInicial.dataHoraInicio.split('T');
        filtros.data = data;
      }
      
      carregarDados(Object.keys(filtros).length > 0 ? filtros : undefined);
    }
  }, [isOpen, carregarDados, preenchimentoInicial]);

  // Effect para pré-preenchimento quando o modal abrir
  useEffect(() => {
    if (isOpen && preenchimentoInicial) {
      // Determinar tipo de fluxo baseado nos dados disponíveis
      const tipoFluxo = preenchimentoInicial.tipoFluxo || 
                       (preenchimentoInicial.profissionalId ? 'por-profissional' : 'por-data');
      
      setTipoFluxo(tipoFluxo);

      // Preencher dados do formulário
      setFormData(prev => ({
        ...prev,
        profissionalId: preenchimentoInicial.profissionalId || prev.profissionalId,
        pacienteId: preenchimentoInicial.pacienteId || prev.pacienteId,
        servicoId: preenchimentoInicial.servicoId || prev.servicoId,
        convenioId: preenchimentoInicial.convenioId || prev.convenioId,
        recursoId: preenchimentoInicial.recursoId || prev.recursoId,
        tipoAtendimento: preenchimentoInicial.tipoAtendimento || prev.tipoAtendimento
      }));

      // Preencher data e hora se disponíveis
      if (preenchimentoInicial.dataHoraInicio) {
        const [data, hora] = preenchimentoInicial.dataHoraInicio.split('T');
        setDataAgendamento(data);
        
        // Encontrar o horário mais próximo nas opções disponíveis
        const horaFormatada = hora.substring(0, 5); // Pegar apenas HH:MM
        const horarioEncontrado = OPCOES_HORARIOS.find(opcao => opcao.id === horaFormatada);
        if (horarioEncontrado) {
          setHoraAgendamento(horarioEncontrado.id);
        } else {
          // Se o horário exato não existir nas opções, usar mesmo assim
          setHoraAgendamento(horaFormatada);
        }
      }
    }
  }, [isOpen, preenchimentoInicial]);

  // Effect para carregar dados do profissional quando profissionalId mudar
  useEffect(() => {
    if (formData.profissionalId) {
      carregarDadosDoProfissional(formData.profissionalId);
    }
  }, [formData.profissionalId, carregarDadosDoProfissional]);

  // Funções de atualização
  const updateFormData = useCallback((data: Partial<CreateAgendamentoData>) => {
    // Se o recurso está sendo alterado, marcar como seleção manual
    if (data.recursoId !== undefined) {
      setUserSelectedResource(true);
    }
    // Se o profissional está sendo alterado, resetar flag de seleção manual
    if (data.profissionalId !== undefined) {
      setUserSelectedResource(false);
    }
    setFormData(prev => ({ ...prev, ...data }));
  }, []);

  // Função para atualização automática do recurso (não marca como manual)
  const updateFormDataAuto = useCallback((data: Partial<CreateAgendamentoData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  }, []);

  const updateDataAgendamento = useCallback((data: string) => {
    setDataAgendamento(data);
    // Resetar flag de seleção manual quando data muda
    setUserSelectedResource(false);
  }, []);

  const updateHoraAgendamento = useCallback((hora: string) => {
    setHoraAgendamento(hora);
    // Resetar flag de seleção manual quando hora muda
    setUserSelectedResource(false);
  }, []);

  const updateTemRecorrencia = useCallback((tem: boolean) => {
    setTemRecorrencia(tem);
  }, []);

  const updateRecorrencia = useCallback((recorrenciaData: Partial<RecorrenciaState>) => {
    setRecorrencia(prev => ({ ...prev, ...recorrenciaData }));
  }, []);

  const updateTipoFluxo = useCallback((tipo: TipoFluxo | null) => {
    setTipoFluxo(tipo);
  }, []);

  // Função para auto-selecionar recurso baseado nas disponibilidades e horário específico
  const autoSelecionarRecurso = useCallback((profissionalId: string, dataHoraCompleta: string) => {
    if (!disponibilidades.length || !recursos.length) {
      return null;
    }

    // Extrair data e hora do datetime completo
    const [data, hora] = dataHoraCompleta.split('T');
    const dataObj = new Date(data + 'T00:00:00');
    const diaSemana = dataObj.getDay();
    
    // Converter hora para minutos para comparação
    const [horaNum, minutoNum] = hora.split(':').map(Number);
    const horarioMinutos = horaNum * 60 + minutoNum;
    
    // Buscar disponibilidades do profissional para esta data ou dia da semana
    const disponibilidadesProfissional = disponibilidades.filter(disp => {
      if (disp.profissionalId !== profissionalId) return false;
      
      // Verificar se é para data específica
      if (disp.dataEspecifica) {
        const dataDisp = new Date(disp.dataEspecifica);
        return dataDisp.getFullYear() === dataObj.getFullYear() &&
               dataDisp.getMonth() === dataObj.getMonth() &&
               dataDisp.getDate() === dataObj.getDate();
      }
      
      // Verificar se é para dia da semana
      if (disp.diaSemana !== null && disp.diaSemana !== undefined) {
        return disp.diaSemana === diaSemana;
      }
      
      return false;
    });
    
    // Filtrar disponibilidades que têm recurso associado E que cobrem o horário específico
    const disponibilidadesParaEsteHorario = disponibilidadesProfissional.filter(disp => {
      if (!disp.recursoId) {
        return false;
      }
      
      // Converter horários da disponibilidade para minutos
      let horaInicioDisp, horaFimDisp;
      
      if (disp.horaInicio && disp.horaFim) {
        // Se horaInicio e horaFim são strings ISO (formato da API)
        if (typeof disp.horaInicio === 'string' && disp.horaInicio.includes('T')) {
          const dataInicio = new Date(disp.horaInicio);
          const dataFim = new Date(disp.horaFim);
          horaInicioDisp = dataInicio.getHours() * 60 + dataInicio.getMinutes();
          horaFimDisp = dataFim.getHours() * 60 + dataFim.getMinutes();
        }
        // Se horaInicio e horaFim são objetos Date
        else if (typeof disp.horaInicio === 'object' && disp.horaInicio.getHours) {
          horaInicioDisp = disp.horaInicio.getHours() * 60 + disp.horaInicio.getMinutes();
          horaFimDisp = disp.horaFim.getHours() * 60 + disp.horaFim.getMinutes();
        } 
        // Se horaInicio e horaFim são strings no formato HH:mm
        else if (typeof disp.horaInicio === 'string' && disp.horaInicio.includes(':')) {
          const [hI, mI] = disp.horaInicio.split(':').map(Number);
          const [hF, mF] = disp.horaFim.split(':').map(Number);
          horaInicioDisp = hI * 60 + mI;
          horaFimDisp = hF * 60 + mF;
        }
        else {
          return false;
        }
        
        // Verificar se o horário do agendamento está dentro do intervalo da disponibilidade
        return horarioMinutos >= horaInicioDisp && horarioMinutos < horaFimDisp;
      }
      
      return false;
    });
    
    if (disponibilidadesParaEsteHorario.length === 0) return null;
    
    // Se houver apenas uma disponibilidade para este horário, usar o recurso dela
    if (disponibilidadesParaEsteHorario.length === 1) {
      const recursoId = disponibilidadesParaEsteHorario[0].recursoId;
      const recursoExiste = recursos.find(r => r.id === recursoId);
      return recursoExiste ? recursoId : null;
    }
    
    // Se houver múltiplas disponibilidades, priorizar por tipo ou usar a primeira
    // Priorizar recursos presenciais se houver conflito
    const disponibilidadePresencial = disponibilidadesParaEsteHorario.find(disp => 
      disp.tipo === 'presencial' || disp.tipo === 'Presencial'
    );
    
    if (disponibilidadePresencial) {
      const recursoId = disponibilidadePresencial.recursoId;
      const recursoExiste = recursos.find(r => r.id === recursoId);
      return recursoExiste ? recursoId : null;
    }
    
    // Se não houver presencial, usar o primeiro disponível
    const recursoId = disponibilidadesParaEsteHorario[0].recursoId;
    const recursoExiste = recursos.find(r => r.id === recursoId);
    return recursoExiste ? recursoId : null;
    
  }, [disponibilidades, recursos]);

  // Effect para auto-selecionar recurso quando dados são carregados com preenchimento inicial
  useEffect(() => {
    // Só executar se:
    // 1. Modal está aberto
    // 2. Há preenchimento inicial com profissional e data
    // 3. Dados foram carregados
    // 4. Recurso ainda não foi selecionado
    // 5. Preenchimento inicial tem tipoFluxo (confirmando que veio do calendário)
    if (isOpen && preenchimentoInicial?.profissionalId && preenchimentoInicial?.dataHoraInicio && 
        preenchimentoInicial?.tipoFluxo && disponibilidades.length > 0 && recursos.length > 0 && 
        !formData.recursoId) {
      
      // Passar o datetime completo para considerar o horário específico
      const recursoAutoSelecionado = autoSelecionarRecurso(preenchimentoInicial.profissionalId, preenchimentoInicial.dataHoraInicio);
      
      if (recursoAutoSelecionado) {
        
        // Auto-selecionar o recurso e definir o tipo de atendimento
        const recurso = recursos.find(r => r.id === recursoAutoSelecionado);
        let tipoAtendimento: 'presencial' | 'online' = 'presencial';
        
        if (recurso && recurso.nome.toLowerCase().includes('online')) {
          tipoAtendimento = 'online';
        }
        
        updateFormDataAuto({
          recursoId: recursoAutoSelecionado,
          tipoAtendimento
        });
      }
    }
  }, [isOpen, preenchimentoInicial, disponibilidades, recursos, formData.recursoId, autoSelecionarRecurso, updateFormDataAuto]);

  // Effect para auto-seleção inteligente de recursos
  useEffect(() => {
    // Executar auto-seleção quando:
    // 1. Modal está aberto
    // 2. Tríade completa: Profissional + Data + Hora selecionados
    // 3. Dados de disponibilidades e recursos estão carregados
    // 4. Não está em processo de carregamento
    // 5. Uma das condições:
    //    - Primeira seleção (campo recurso vazio)
    //    - Mudança de contexto (usuário não selecionou manualmente ainda)
    if (isOpen && 
        formData.profissionalId && 
        dataAgendamento && 
        horaAgendamento &&
        disponibilidades.length > 0 && 
        recursos.length > 0 &&
        !loadingData &&
        (!userSelectedResource || !formData.recursoId)) {
      
      // Criar datetime completo para a auto-seleção
      const dataHoraCompleta = `${dataAgendamento}T${horaAgendamento}`;
      
      // Debug: Log da execução da auto-seleção
      console.log('🎯 Executando auto-seleção de recursos:', {
        profissional: formData.profissionalId,
        data: dataAgendamento,
        hora: horaAgendamento,
        recursoAtual: formData.recursoId,
        userSelectedResource
      });

      // Executar auto-seleção de recurso
      const recursoAutoSelecionado = autoSelecionarRecurso(formData.profissionalId, dataHoraCompleta);
      
      if (recursoAutoSelecionado) {
        // Só atualizar se o recurso mudou (evita loops infinitos)
        if (formData.recursoId !== recursoAutoSelecionado) {
          // Auto-selecionar o recurso e definir o tipo de atendimento
          const recurso = recursos.find(r => r.id === recursoAutoSelecionado);
          let tipoAtendimento: 'presencial' | 'online' = 'presencial';
          
          if (recurso && recurso.nome.toLowerCase().includes('online')) {
            tipoAtendimento = 'online';
          }
          
          console.log('✅ Recurso auto-selecionado:', {
            recursoId: recursoAutoSelecionado,
            recursoNome: recurso?.nome,
            tipoAtendimento
          });

          updateFormDataAuto({
            recursoId: recursoAutoSelecionado,
            tipoAtendimento
          });
        }
      } else {
        // Se não há recurso compatível, limpar seleção atual
        if (formData.recursoId) {
          console.log('🧹 Limpando recurso incompatível para nova seleção');
          updateFormDataAuto({
            recursoId: '',
            tipoAtendimento: 'presencial'
          });
        } else {
          console.log('⚠️ Nenhum recurso encontrado para esta combinação profissional/data/hora');
        }
      }
    }
  }, [
    isOpen, 
    formData.profissionalId, 
    dataAgendamento, 
    horaAgendamento, 
    disponibilidades, 
    recursos, 
    formData.recursoId, // Incluído para detectar mudanças, mas com proteção contra loops
    userSelectedResource, // Controla se deve executar auto-seleção
    loadingData, // Aguarda carregamento completo dos dados
    autoSelecionarRecurso,
    updateFormDataAuto
  ]);

  // Effect para limpar dados quando o modal fechar
  useEffect(() => {
    if (!isOpen) {
      // Resetar apenas os dados do formulário, mantendo os dados base carregados
      setFormData(FORM_DATA_PADRAO);
      setDataAgendamento('');
      setHoraAgendamento('');
      setTipoFluxo(null);
      // Resetar flag de seleção manual
      setUserSelectedResource(false);
    }
  }, [isOpen]);

  // Estados organizados
  const state: AgendamentoFormState = {
    formData,
    dataAgendamento,
    horaAgendamento,
    temRecorrencia,
    recorrencia,
    tipoFluxo
  };

  const dataState: AgendamentoDataState = {
    pacientes,
    profissionais,
    profissionaisPorServico,
    convenios,
    servicos,
    recursos,
    conveniosDoProfissional,
    servicosDoProfissional,
    disponibilidades
  };

  const loadingState: AgendamentoLoadingState = {
    loading,
    loadingData,
    loadingProfissionaisPorServico
  };

  return {
    state,
    dataState,
    loadingState,
    updateFormData,
    updateDataAgendamento,
    updateHoraAgendamento,
    updateTemRecorrencia,
    updateRecorrencia,
    updateTipoFluxo,
    resetForm,
    carregarDados,
    carregarDadosDoProfissional,
    carregarProfissionaisPorServico,
    handleSubmit,
    // Estados e funções do modal de confirmação
    showResourceConfirmation,
    resourceConfirmationData,
    handleResourceConfirmation,
    handleResourceCancel
  };
}; 