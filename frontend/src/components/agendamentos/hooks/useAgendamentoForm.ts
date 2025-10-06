import { useState, useEffect, useCallback } from 'react';
import { AppToast } from '@/services/toast';
import type { CreateAgendamentoData, AgendamentoFormData } from '@/services/agendamentos';
import type { TipoRecorrencia } from '@/types/Agendamento';
import { getProfissionaisByServico, getServicosConveniosByProfissional, type ServicoConvenioProfissional } from '@/services/profissionais-servicos';
import { getProfissionais } from '@/services/profissionais';
import { createAgendamento, getAgendamentoFormData } from '@/services/agendamentos';
import { getPacientesAtivos, getPacienteById } from '@/services/pacientes';
import { getConvenios } from '@/services/convenios';
import { getServicosAtivos } from '@/services/servicos';
import { getRecursos } from '@/services/recursos';
import { getDisponibilidadesProfissional } from '@/services/disponibilidades';
import { verificarConflitosRecorrencia, verificarConflitosParaDatas, type ConflitosRecorrencia } from '@/services/verificacao-disponibilidade-recorrencia';
import { FORM_DATA_PADRAO, RECORRENCIA_PADRAO, OPCOES_HORARIOS } from '../utils/agendamento-constants';
import type { 
  TipoFluxo, 
  RecorrenciaState, 
  AgendamentoFormState, 
  AgendamentoDataState, 
  AgendamentoLoadingState,
  AgendamentoFormContext 
} from '../types/agendamento-form';
import { formatarDatasEmMensagem } from '@/utils/dateUtils';

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
  dadosExternos?: {
    profissionais?: any[];
    recursos?: any[];
    disponibilidades?: any[];
    convenios?: any[];
  };
  dadosDoubleClick?: {
    profissionalId: string;
    data: string;
    hora: string;
    recursoId: string;
    tipoAtendimento: 'presencial' | 'online';
  };
}

export const useAgendamentoForm = ({ 
  isOpen, 
  preenchimentoInicial, 
  onSuccess, 
  onClose,
  dadosExternos,
  dadosDoubleClick
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
  const [agendamentosDoDia, setAgendamentosDoDia] = useState<any[]>([]);

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

  // Estados para modal de conflitos de recorrência
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflitosRecorrencia, setConflitosRecorrencia] = useState<ConflitosRecorrencia | null>(null);

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
      if (filtros?.data && filtros?.profissionalId) {
        setAgendamentosDoDia(formData.agendamentos || []);
      } else {
        setAgendamentosDoDia([]);
      }

    } catch (error) {
      AppToast.error('Erro ao carregar dados do formulário', {
        description: 'Ocorreu um problema ao carregar os dados. Tente novamente.'
      });
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Carregar profissionais quando fluxo Por Profissional for selecionado
  useEffect(() => {
    if (!isOpen) return;
    if (tipoFluxo === 'por-profissional' && profissionais.length === 0 && !loadingData) {
      (async () => {
        setLoadingData(true);
        try {
          const lista = await getProfissionais({ ativo: true });
          setProfissionais(lista);
        } catch (error) {
        } finally {
          setLoadingData(false);
        }
      })();
    }
  }, [isOpen, tipoFluxo, profissionais.length, loadingData]);

  // Função para carregar profissionais por serviço
  const carregarProfissionaisPorServico = useCallback(async (servicoId: string) => {
    setLoadingProfissionaisPorServico(true);
    try {
      const profissionaisData = await getProfissionaisByServico(servicoId);
      setProfissionaisPorServico(profissionaisData);
    } catch (error) {
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
    
    // Limpar estados do modal de conflitos
    setShowConflictModal(false);
    setConflitosRecorrencia(null);
    
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
      const dispProfissionalId = disp.profissionalId ?? disp.profissional_id;
      if (dispProfissionalId !== profissionalId) return false;
      
      // Verificar se é para data específica
      const dataEspecifica = disp.dataEspecifica ?? disp.data_especifica;
      if (dataEspecifica) {
        const dataDisp = new Date(dataEspecifica);
        return dataDisp.getFullYear() === dataObj.getFullYear() &&
               dataDisp.getMonth() === dataObj.getMonth() &&
               dataDisp.getDate() === dataObj.getDate();
      }
      
      // Verificar se é para dia da semana
      const diaSemanaDisp = (disp.diaSemana ?? disp.dia_semana);
      if (diaSemanaDisp !== null && diaSemanaDisp !== undefined) {
        return diaSemanaDisp === diaSemana;
      }
      
      return false;
    });

    // Verificar se existe uma disponibilidade com o recurso selecionado no horário específico
    const disponibilidadeComRecurso = disponibilidadesProfissional.find(disp => {
      const dispRecursoId = disp.recursoId ?? disp.recurso_id;
      if (dispRecursoId !== recursoId) return false;
      
      const horaInicioRaw = disp.horaInicio ?? disp.hora_inicio;
      const horaFimRaw = disp.horaFim ?? disp.hora_fim;
      if (horaInicioRaw && horaFimRaw) {
        let horaInicioDisp, horaFimDisp;
        
        // Tratar diferentes formatos de horário (mesmo código da auto-seleção)
        if (typeof horaInicioRaw === 'string' && horaInicioRaw.includes('T')) {
          const dataInicio = new Date(horaInicioRaw);
          const dataFim = new Date(horaFimRaw as any);
          horaInicioDisp = dataInicio.getHours() * 60 + dataInicio.getMinutes();
          horaFimDisp = dataFim.getHours() * 60 + dataFim.getMinutes();
        }
        else if (typeof horaInicioRaw === 'object' && (horaInicioRaw as any).getHours) {
          horaInicioDisp = (horaInicioRaw as Date).getHours() * 60 + (horaInicioRaw as Date).getMinutes();
          horaFimDisp = (horaFimRaw as Date).getHours() * 60 + (horaFimRaw as Date).getMinutes();
        } 
        else if (typeof horaInicioRaw === 'string' && horaInicioRaw.includes(':')) {
          const [hI, mI] = (horaInicioRaw as string).split(':').map(Number);
          const [hF, mF] = (horaFimRaw as string).split(':').map(Number);
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
    const dataHoraComOffset = buildIsoWithLocalOffset(dataAgendamento, horaAgendamento);

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
        dataHoraInicio: dataHoraComOffset,
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

    // Se chegou até aqui, o recurso está conforme - verificar conflitos
    const dadosParaEnvio = {
      ...formData,
      dataHoraInicio: dataHoraComOffset,
      recorrencia: temRecorrencia ? {
        tipo: recorrencia.tipo,
        ...(recorrencia.repeticoes && { repeticoes: recorrencia.repeticoes }),
        ...(recorrencia.ate && { ate: recorrencia.ate })
      } : undefined
    };

    // Verificar conflitos primeiro
    if (temRecorrencia && dadosParaEnvio.recorrencia) {
      setLoading(true);
      try {
        const conflitos = await verificarConflitosRecorrencia(
          formData.profissionalId,
          formData.recursoId,
          dataHoraCombinada,
          dadosParaEnvio.recorrencia
        );

        if (conflitos.totalConflitos > 0) {
          // Se há conflitos, mostrar modal e BLOQUEAR salvamento
          setConflitosRecorrencia(conflitos);
          setShowConflictModal(true);
          setLoading(false);
          return; // PARAR EXECUÇÃO - não salvar nada
        }
      } catch (error) {
        AppToast.error('Erro ao verificar disponibilidade', {
          description: 'Não foi possível verificar conflitos de recorrência. Tente novamente.'
        });
        setLoading(false);
        return;
      }
    }

    // Se não há conflitos, prosseguir com criação
    try {
      if (!loading) setLoading(true);
      await createAgendamento(dadosParaEnvio);
      AppToast.created('Agendamento', 'O agendamento foi criado com sucesso!');
      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      const backendMsg = error?.response?.data?.message;
      
      AppToast.error('Erro ao criar agendamento', {
        description: formatarDatasEmMensagem(backendMsg || 'Não foi possível criar o agendamento. Tente novamente.')
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
    } catch (error: any) {
      const backendMsg = error?.response?.data?.message;
      AppToast.error('Erro ao criar agendamento', {
        description: formatarDatasEmMensagem(backendMsg || 'Não foi possível criar o agendamento. Tente novamente.')
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

  // Função para fechar modal de conflitos
  const handleConflictModalClose = useCallback(() => {
    setShowConflictModal(false);
    setConflitosRecorrencia(null);
    // O usuário permanece no formulário para ajustar data/hora ou recorrência
  }, []);

  // Effect para carregar dados quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      // Se há dados do double-click, usar dados externos sem chamar APIs
      if (dadosDoubleClick && dadosExternos) {
        setProfissionais(dadosExternos.profissionais || []);
        setRecursos(dadosExternos.recursos || []);
        setDisponibilidades(dadosExternos.disponibilidades || []);
        setConvenios(dadosExternos.convenios || []);
        return; // Pular carregamento via API
      }
      
      // Se há preenchimento inicial com profissional e/ou data, carregar dados;
      // Caso contrário, não chamar a API ainda (somente após seleção do fluxo)
      const filtros: { data?: string; profissionalId?: string } = {};
      
      if (preenchimentoInicial?.profissionalId) {
        filtros.profissionalId = preenchimentoInicial.profissionalId;
      }
      
      if (preenchimentoInicial?.dataHoraInicio) {
        const [data] = preenchimentoInicial.dataHoraInicio.split('T');
        filtros.data = data;
      }
      
      if (Object.keys(filtros).length > 0) {
        carregarDados(filtros);
      }
    }
  }, [isOpen, carregarDados, preenchimentoInicial, dadosDoubleClick, dadosExternos]);

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

  // Effect para lidar com dados do double-click
  useEffect(() => {
    if (isOpen && dadosDoubleClick) {
      // Definir tipo de fluxo como por-profissional
      setTipoFluxo('por-profissional');
      
      // Preencher dados do formulário
      setFormData(prev => ({
        ...prev,
        profissionalId: dadosDoubleClick.profissionalId,
        recursoId: dadosDoubleClick.recursoId,
        tipoAtendimento: dadosDoubleClick.tipoAtendimento
      }));
      
      // Preencher data e hora
      setDataAgendamento(dadosDoubleClick.data);
      setHoraAgendamento(dadosDoubleClick.hora);
      
      // Carregar apenas pacientes ativos (sem usar /form-data)
      const carregarPacientesParaDoubleClick = async () => {
        setLoadingData(true);
        try {
          const pacientesAtivos = await getPacientesAtivos();
          setPacientes(pacientesAtivos);
        } catch (error) {
          AppToast.error('Erro ao carregar pacientes', {
            description: 'Não foi possível carregar a lista de pacientes.'
          });
        } finally {
          setLoadingData(false);
        }
      };
      
      carregarPacientesParaDoubleClick();
    }
  }, [isOpen, dadosDoubleClick]);

  // Effect para carregar dados do profissional quando profissionalId mudar
  useEffect(() => {
    if (formData.profissionalId) {
      carregarDadosDoProfissional(formData.profissionalId);
    }
  }, [formData.profissionalId, carregarDadosDoProfissional]);

  // Effect para recarregar dados somente no fluxo Por Data
  useEffect(() => {
    if (tipoFluxo === 'por-data' && formData.profissionalId && dataAgendamento) {
      carregarDados({ data: dataAgendamento, profissionalId: formData.profissionalId });
    }
  }, [tipoFluxo, formData.profissionalId, dataAgendamento, carregarDados]);

  // Effect para auto-preencher convênio quando serviço está pré-preenchido
  useEffect(() => {
    if (formData.servicoId && !formData.convenioId && servicos.length > 0) {
      // Buscar o serviço para obter seu convênio
      const servicoEncontrado = servicos.find(s => s.id === formData.servicoId);
      if (servicoEncontrado && servicoEncontrado.convenioId) {
        setFormData(prev => ({
          ...prev,
          convenioId: servicoEncontrado.convenioId
        }));
      }
    }
  }, [formData.servicoId, formData.convenioId, servicos]);

  // Effect para garantir pré-preenchimento do convênio após carregamento dos dados
  useEffect(() => {
    if (isOpen && preenchimentoInicial?.convenioId && convenios.length > 0 && !formData.convenioId) {
      // Verificar se o convênio do preenchimento inicial existe na lista carregada
      const convenioExiste = convenios.find(c => c.id === preenchimentoInicial.convenioId);
      if (convenioExiste) {
        setFormData(prev => ({
          ...prev,
          convenioId: preenchimentoInicial.convenioId!
        }));
      }
    }
  }, [isOpen, preenchimentoInicial?.convenioId, convenios, formData.convenioId]);

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

  // Ao selecionar Data no fluxo Por Profissional, carregar disponibilidades do profissional (uma vez por data)
  useEffect(() => {
    const carregarDisp = async () => {
      if (!isOpen) return;
      if (tipoFluxo !== 'por-profissional') return;
      if (!formData.profissionalId || !dataAgendamento) return;
      try {
        const lista = await getDisponibilidadesProfissional(formData.profissionalId);
        setDisponibilidades(lista || []);
      } catch (e) {
        setDisponibilidades([]);
      }
    };
    carregarDisp();
  }, [isOpen, tipoFluxo, formData.profissionalId, dataAgendamento]);

  // Após seleção da hora (com profissional e data selecionados), carregar listas e pré-seleções
  useEffect(() => {
    const carregarDadosPosHora = async () => {
      if (!isOpen) return;
      if (!formData.profissionalId || !dataAgendamento || !horaAgendamento) return;

      setLoadingData(true);
      try {
        // 1) Pacientes ativos
        const [pacientesAtivos, listaConvenios, listaRecursos] = await Promise.all([
          getPacientesAtivos(),
          getConvenios(),
          getRecursos(),
        ]);
        setPacientes(pacientesAtivos);
        setConvenios(listaConvenios);
        setRecursos(listaRecursos);

        // 2) Pré-selecionar convênio do paciente se já houver paciente selecionado
        let convenioSelecionado = formData.convenioId || '';
        if (formData.pacienteId && !convenioSelecionado) {
          try {
            const paciente = await getPacienteById(formData.pacienteId);
            convenioSelecionado = paciente.convenioId || '';
            if (convenioSelecionado) {
              setFormData(prev => ({ ...prev, convenioId: convenioSelecionado }));
            }
          } catch {}
        }

        // 3) Serviços ativos do convênio selecionado
        if (convenioSelecionado) {
          const servicosAtivos = await getServicosAtivos({ convenioId: convenioSelecionado });
          setServicos(servicosAtivos);
        } else {
          setServicos([]);
        }

        // 4) Não recarregar disponibilidades: já estão em estado; apenas manter recurso pré-selecionado pela disponibilidade
        // (auto-seleção de recurso é tratada por outro effect já existente)
      } finally {
        setLoadingData(false);
      }
    };
    carregarDadosPosHora();
  }, [isOpen, formData.profissionalId, formData.pacienteId, formData.convenioId, dataAgendamento, horaAgendamento]);

  const updateTemRecorrencia = useCallback((tem: boolean) => {
    setTemRecorrencia(tem);
  }, []);

  const updateRecorrencia = useCallback((recorrenciaData: Partial<RecorrenciaState>) => {
    setRecorrencia(prev => ({ ...prev, ...recorrenciaData }));
  }, []);

  const updateTipoFluxo = useCallback((tipo: TipoFluxo | null) => {
    setTipoFluxo(tipo);
  }, []);

  // Monta ISO com offset local do navegador (ex.: 2025-08-27T07:30:00-03:00)
  const buildIsoWithLocalOffset = useCallback((data: string, hora: string): string => {
    const offsetMinutes = -new Date().getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMinutes);
    const hh = String(Math.floor(abs / 60)).padStart(2, '0');
    const mm = String(abs % 60).padStart(2, '0');
    return `${data}T${hora}:00${sign}${hh}:${mm}`;
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
      const dispProfissionalId = disp.profissionalId ?? disp.profissional_id;
      if (dispProfissionalId !== profissionalId) return false;
      
      // Verificar se é para data específica
      const dataEspecifica = disp.dataEspecifica ?? disp.data_especifica;
      if (dataEspecifica) {
        const dataDisp = new Date(dataEspecifica);
        return dataDisp.getFullYear() === dataObj.getFullYear() &&
               dataDisp.getMonth() === dataObj.getMonth() &&
               dataDisp.getDate() === dataObj.getDate();
      }
      
      // Verificar se é para dia da semana
      const diaSemanaDisp = (disp.diaSemana ?? disp.dia_semana);
      if (diaSemanaDisp !== null && diaSemanaDisp !== undefined) {
        return diaSemanaDisp === diaSemana;
      }
      
      return false;
    });
    
    // Filtrar disponibilidades que têm recurso associado E que cobrem o horário específico
    const disponibilidadesParaEsteHorario = disponibilidadesProfissional.filter(disp => {
      const dispRecursoId = disp.recursoId ?? disp.recurso_id;
      if (!dispRecursoId) {
        return false;
      }
      
      // Converter horários da disponibilidade para minutos
      let horaInicioDisp, horaFimDisp;
      
      const horaInicioRaw = disp.horaInicio ?? disp.hora_inicio;
      const horaFimRaw = disp.horaFim ?? disp.hora_fim;
      if (horaInicioRaw && horaFimRaw) {
        // Se horaInicio e horaFim são strings ISO (formato da API)
        if (typeof horaInicioRaw === 'string' && horaInicioRaw.includes('T')) {
          const dataInicio = new Date(horaInicioRaw);
          const dataFim = new Date(horaFimRaw as any);
          horaInicioDisp = dataInicio.getHours() * 60 + dataInicio.getMinutes();
          horaFimDisp = dataFim.getHours() * 60 + dataFim.getMinutes();
        }
        // Se horaInicio e horaFim são objetos Date
        else if (typeof horaInicioRaw === 'object' && (horaInicioRaw as any).getHours) {
          horaInicioDisp = (horaInicioRaw as Date).getHours() * 60 + (horaInicioRaw as Date).getMinutes();
          horaFimDisp = (horaFimRaw as Date).getHours() * 60 + (horaFimRaw as Date).getMinutes();
        } 
        // Se horaInicio e horaFim são strings no formato HH:mm
        else if (typeof horaInicioRaw === 'string' && (horaInicioRaw as string).includes(':')) {
          const [hI, mI] = (horaInicioRaw as string).split(':').map(Number);
          const [hF, mF] = (horaFimRaw as string).split(':').map(Number);
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
      const recursoId = (disponibilidadesParaEsteHorario[0].recursoId ?? disponibilidadesParaEsteHorario[0].recurso_id) as string;
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
    const recursoId = (disponibilidadesParaEsteHorario[0].recursoId ?? disponibilidadesParaEsteHorario[0].recurso_id) as string;
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
          
          
          updateFormDataAuto({
            recursoId: recursoAutoSelecionado,
            tipoAtendimento
          });
        }
      } else {
        // Se não há recurso compatível, limpar seleção atual
        if (formData.recursoId) {
          updateFormDataAuto({
            recursoId: '',
            tipoAtendimento: 'presencial'
          });
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
    disponibilidades,
    agendamentosDoDia
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
    handleResourceCancel,
    // Estados e funções do modal de conflitos
    showConflictModal,
    conflitosRecorrencia,
    handleConflictModalClose
  };
}; 