import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { CreateAgendamentoData } from '@/services/agendamentos';
import type { TipoRecorrencia } from '@/types/Agendamento';
import { getPacientes } from '@/services/pacientes';
import { getProfissionais } from '@/services/profissionais';
import { getConvenios } from '@/services/convenios';
import { getServicos } from '@/services/servicos';
import { getRecursos } from '@/services/recursos';
import { getProfissionaisByServico, getServicosConveniosByProfissional, type ServicoConvenioProfissional } from '@/services/profissionais-servicos';
import { createAgendamento } from '@/services/agendamentos';
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
  const [temRecorrencia, setTemRecorrencia] = useState(false);
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

  // Estados de loading
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingProfissionaisPorServico, setLoadingProfissionaisPorServico] = useState(false);

  // Função para carregar todos os dados necessários
  const carregarDados = useCallback(async () => {
    setLoadingData(true);
    try {
      const [
        pacientesData,
        profissionaisData, 
        conveniosData,
        servicosData,
        recursosData
      ] = await Promise.all([
        getPacientes(),
        getProfissionais(),
        getConvenios(),
        getServicos(),
        getRecursos()
      ]);

      // Ordenar dados por nome
      setPacientes(pacientesData.sort((a, b) => 
        a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR', { sensitivity: 'base' })
      ));
      setProfissionais(profissionaisData.sort((a, b) => 
        a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
      ));
      setConvenios(conveniosData.sort((a, b) => 
        a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
      ));
      setServicos(servicosData.sort((a, b) => 
        a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
      ));
      setRecursos(recursosData.sort((a, b) => 
        a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
      ));

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do formulário');
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
      toast.error('Erro ao carregar profissionais do serviço');
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
      toast.error('Erro ao carregar dados do profissional');
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
    setTemRecorrencia(false);
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
    setLoadingData(false);
    setLoadingProfissionaisPorServico(false);
  }, []);

  // Função para submeter o formulário
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!formData.pacienteId || !formData.profissionalId || !formData.servicoId || 
        !formData.convenioId || !formData.recursoId || !dataAgendamento || !horaAgendamento) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Combinar data e hora
    const dataHoraCombinada = `${dataAgendamento}T${horaAgendamento}`;
    
    // Validação adicional: verificar se a data/hora não é no passado
    const dataHoraSelecionada = new Date(dataHoraCombinada);
    const agora = new Date();
    
    if (dataHoraSelecionada <= agora) {
      toast.error('A data e hora do agendamento deve ser no futuro');
      return;
    }

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
      toast.success('Agendamento criado com sucesso!');
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      toast.error('Erro ao criar agendamento');
    } finally {
      setLoading(false);
    }
  }, [formData, dataAgendamento, horaAgendamento, temRecorrencia, recorrencia, resetForm, onSuccess, onClose]);

  // Effect para carregar dados quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      carregarDados();
    }
  }, [isOpen, carregarDados]);

  // Effect para pré-preenchimento quando o modal abrir
  useEffect(() => {
    if (isOpen && preenchimentoInicial) {
      // Se tem profissional preenchido, vai para fluxo por profissional
      if (preenchimentoInicial.profissionalId) {
        setTipoFluxo('por-profissional');
        setFormData(prev => ({
          ...prev,
          profissionalId: preenchimentoInicial.profissionalId || ''
        }));
      }

      // Se tem data/hora preenchida
      if (preenchimentoInicial.dataHoraInicio) {
        const [data, hora] = preenchimentoInicial.dataHoraInicio.split('T');
        setDataAgendamento(data);
        // Encontrar o horário mais próximo nas opções disponíveis
        const horaFormatada = hora.substring(0, 5); // Pegar apenas HH:MM
        const horarioEncontrado = OPCOES_HORARIOS.find(opcao => opcao.id === horaFormatada);
        setHoraAgendamento(horarioEncontrado ? horarioEncontrado.id : '');
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
    setFormData(prev => ({ ...prev, ...data }));
  }, []);

  const updateDataAgendamento = useCallback((data: string) => {
    setDataAgendamento(data);
  }, []);

  const updateHoraAgendamento = useCallback((hora: string) => {
    setHoraAgendamento(hora);
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
    servicosDoProfissional
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
    carregarProfissionaisPorServico
  };
}; 