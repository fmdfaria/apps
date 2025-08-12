import { useState, useEffect, useCallback } from 'react';
import { AppToast } from '@/services/toast';
import type { EditAgendamentoData, AgendamentoFormData } from '@/services/agendamentos';
import type { Agendamento } from '@/types/Agendamento';
import type { TipoRecorrencia } from '@/types/Agendamento';
import { getProfissionaisByServico, getServicosConveniosByProfissional, type ServicoConvenioProfissional } from '@/services/profissionais-servicos';
import { editAgendamento, getAgendamentoFormData, getAgendamentos } from '@/services/agendamentos';
import { OPCOES_HORARIOS } from '../utils/agendamento-constants';
import type { 
  TipoFluxo, 
  RecorrenciaState, 
  AgendamentoDataState, 
  AgendamentoLoadingState
} from '../types/agendamento-form';

interface UseEditAgendamentoProps {
  isOpen: boolean;
  agendamentoId: string | null;
  onSuccess: () => void;
  onClose: () => void;
}

interface EditAgendamentoFormData {
  pacienteId: string;
  profissionalId: string;
  tipoAtendimento: 'presencial' | 'online';
  recursoId: string;
  convenioId: string;
  servicoId: string;
  dataHoraInicio: string;
  recorrencia?: {
    tipo: TipoRecorrencia;
    ate?: string;
    repeticoes?: number;
  };
}

interface EditAgendamentoFormContext {
  // Dados do agendamento original
  agendamentoOriginal: Agendamento | null;
  
  // Estados do formulário
  formData: EditAgendamentoFormData;
  dataAgendamento: string;
  horaAgendamento: string;
  temRecorrencia: boolean;
  recorrencia: RecorrenciaState;
  
  // Estados de dados
  data: AgendamentoDataState;
  loading: AgendamentoLoadingState;
  
  // Validação
  isAgendamentoFuturo: boolean;
  podeEditar: boolean;
  
  // Handlers
  setFormData: (data: Partial<EditAgendamentoFormData>) => void;
  setDataAgendamento: (data: string) => void;
  setHoraAgendamento: (hora: string) => void;
  setTemRecorrencia: (tem: boolean) => void;
  setRecorrencia: (recorrencia: Partial<RecorrenciaState>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  
  // Utilitários
  opcoesHorarios: Array<{ value: string; label: string }>;
  servicosConveniosProfissional: ServicoConvenioProfissional[];
}

export const useEditAgendamento = ({ 
  isOpen, 
  agendamentoId,
  onSuccess, 
  onClose 
}: UseEditAgendamentoProps): EditAgendamentoFormContext => {
  
  // Estado do agendamento original
  const [agendamentoOriginal, setAgendamentoOriginal] = useState<Agendamento | null>(null);
  
  // Estados do formulário
  const [formData, setFormDataState] = useState<EditAgendamentoFormData>({
    pacienteId: '',
    profissionalId: '',
    tipoAtendimento: 'presencial',
    recursoId: '',
    convenioId: '',
    servicoId: '',
    dataHoraInicio: '',
  });
  
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [horaAgendamento, setHoraAgendamento] = useState('');
  const [temRecorrencia, setTemRecorrencia] = useState(false);
  const [recorrencia, setRecorrencia] = useState<RecorrenciaState>({
    tipo: 'semanal',
    ate: '',
    repeticoes: 1
  });

  // Estados de dados
  const [data, setData] = useState<AgendamentoDataState>({
    pacientes: [],
    profissionais: [],
    convenios: [],
    servicos: [],
    recursos: [],
    disponibilidades: [],
    agendamentos: [],
    ocupacoesSemana: []
  });

  // Estados de loading
  const [loading, setLoading] = useState<AgendamentoLoadingState>({
    formData: false,
    profissionais: false,
    servicosConvenios: false,
    submit: false
  });
  
  // Estados derivados
  const [servicosConveniosProfissional, setServicosConveniosProfissional] = useState<ServicoConvenioProfissional[]>([]);
  
  // Validações
  const isAgendamentoFuturo = agendamentoOriginal ? new Date(agendamentoOriginal.dataHoraInicio) > new Date() : false;
  const podeEditar = isAgendamentoFuturo && agendamentoOriginal?.status !== 'CANCELADO' && agendamentoOriginal?.status !== 'FINALIZADO';
  
  // Opções de horários
  const opcoesHorarios = OPCOES_HORARIOS;

  // Carregar dados do agendamento e contexto via form-data
  const carregarDadosAgendamento = useCallback(async () => {
    if (!agendamentoId) return;
    
    try {
      setLoading(prev => ({ ...prev, formData: true }));
      
      // Primeiro buscar todos os agendamentos para encontrar o específico
      const todosAgendamentos = await getAgendamentos();
      const agendamento = todosAgendamentos.find(a => a.id === agendamentoId);
      
      if (!agendamento) {
        AppToast.error('Agendamento não encontrado');
        return;
      }
      
      setAgendamentoOriginal(agendamento);
      
      // Agora buscar form-data com filtros do agendamento para obter contexto completo
      const dataAgendamento = new Date(agendamento.dataHoraInicio).toISOString().split('T')[0];
      const dados = await getAgendamentoFormData({
        data: dataAgendamento,
        profissionalId: agendamento.profissionalId
      });
      setData(dados);
      
      // Preencher formulário com dados atuais
      const dataHoraInicio = new Date(agendamento.dataHoraInicio);
      const dataFormatada = dataHoraInicio.toISOString().split('T')[0];
      const horaFormatada = dataHoraInicio.toTimeString().substring(0, 5);
      
      setFormDataState({
        pacienteId: agendamento.pacienteId,
        profissionalId: agendamento.profissionalId,
        tipoAtendimento: agendamento.tipoAtendimento as 'presencial' | 'online',
        recursoId: agendamento.recursoId,
        convenioId: agendamento.convenioId,
        servicoId: agendamento.servicoId,
        dataHoraInicio: agendamento.dataHoraInicio,
        recorrencia: agendamento.recorrencia
      });
      
      setDataAgendamento(dataFormatada);
      setHoraAgendamento(horaFormatada);
      setTemRecorrencia(!!agendamento.recorrencia);
      
      if (agendamento.recorrencia) {
        setRecorrencia({
          tipo: agendamento.recorrencia.tipo,
          ate: agendamento.recorrencia.ate ? new Date(agendamento.recorrencia.ate).toISOString().split('T')[0] : '',
          repeticoes: agendamento.recorrencia.repeticoes || 1
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados do agendamento:', error);
      AppToast.error('Erro ao carregar dados do agendamento');
    } finally {
      setLoading(prev => ({ ...prev, formData: false }));
    }
  }, [agendamentoId]);

  // Carregar serviços e convênios do profissional
  const carregarServicosConveniosProfissional = useCallback(async (profissionalId: string) => {
    try {
      setLoading(prev => ({ ...prev, servicosConvenios: true }));
      const dados = await getServicosConveniosByProfissional(profissionalId);
      setServicosConveniosProfissional(dados);
    } catch (error) {
      console.error('Erro ao carregar serviços/convênios:', error);
      AppToast.error('Erro ao carregar serviços e convênios do profissional');
      setServicosConveniosProfissional([]); // Garantir que sempre seja um array
    } finally {
      setLoading(prev => ({ ...prev, servicosConvenios: false }));
    }
  }, []);

  // Efeito para carregar dados iniciais
  useEffect(() => {
    if (isOpen && agendamentoId) {
      carregarDadosAgendamento();
    }
  }, [isOpen, agendamentoId, carregarDadosAgendamento]);

  // Efeito para carregar serviços/convênios quando profissional muda
  useEffect(() => {
    if (formData.profissionalId) {
      carregarServicosConveniosProfissional(formData.profissionalId);
    }
  }, [formData.profissionalId, carregarServicosConveniosProfissional]);

  // Handlers
  const setFormData = useCallback((newData: Partial<EditAgendamentoFormData>) => {
    setFormDataState(prev => ({ ...prev, ...newData }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agendamentoId || !podeEditar) {
      AppToast.error('Não é possível editar este agendamento');
      return;
    }
    
    try {
      setLoading(prev => ({ ...prev, submit: true }));
      
      // Construir data/hora
      const [ano, mes, dia] = dataAgendamento.split('-');
      const [hora, minuto] = horaAgendamento.split(':');
      const dataHoraInicio = new Date(
        parseInt(ano),
        parseInt(mes) - 1,
        parseInt(dia),
        parseInt(hora),
        parseInt(minuto)
      ).toISOString();
      
      const dadosEdicao: EditAgendamentoData = {
        pacienteId: formData.pacienteId,
        profissionalId: formData.profissionalId,
        tipoAtendimento: formData.tipoAtendimento,
        recursoId: formData.recursoId,
        convenioId: formData.convenioId,
        servicoId: formData.servicoId,
        dataHoraInicio
      };
      
      // Adicionar recorrência se habilitada
      if (temRecorrencia && recorrencia.tipo) {
        dadosEdicao.recorrencia = {
          tipo: recorrencia.tipo,
          ...(recorrencia.ate && { ate: recorrencia.ate }),
          ...(recorrencia.repeticoes && { repeticoes: recorrencia.repeticoes })
        };
      }
      
      await editAgendamento(agendamentoId, dadosEdicao);
      AppToast.success('Agendamento editado com sucesso!');
      onSuccess();
      
    } catch (error) {
      console.error('Erro ao editar agendamento:', error);
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as any).response?.data?.message || 'Erro ao editar agendamento'
        : 'Erro ao editar agendamento';
      AppToast.error(errorMessage);
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  }, [agendamentoId, podeEditar, dataAgendamento, horaAgendamento, formData, temRecorrencia, recorrencia, onSuccess]);

  return {
    // Dados do agendamento original
    agendamentoOriginal,
    
    // Estados do formulário
    formData,
    dataAgendamento,
    horaAgendamento,
    temRecorrencia,
    recorrencia,
    
    // Estados de dados
    data,
    loading,
    
    // Validação
    isAgendamentoFuturo,
    podeEditar,
    
    // Handlers
    setFormData,
    setDataAgendamento,
    setHoraAgendamento,
    setTemRecorrencia,
    setRecorrencia,
    handleSubmit,
    
    // Utilitários
    opcoesHorarios,
    servicosConveniosProfissional
  };
};