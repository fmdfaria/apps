import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import { Checkbox } from '@/components/ui/checkbox';
import { FormErrorMessage } from '@/components/form-error-message';
import { Calendar, Clock, User, Stethoscope, CreditCard, FileText, MapPin, Repeat } from 'lucide-react';
import type { CreateAgendamentoData } from '@/services/agendamentos';
import type { TipoAtendimento, TipoRecorrencia } from '@/types/Agendamento';
import type { Paciente } from '@/types/Paciente';
import type { Profissional } from '@/types/Profissional';
import type { Convenio } from '@/types/Convenio';
import type { Servico } from '@/types/Servico';
import type { Recurso } from '@/types/Recurso';
import { createAgendamento } from '@/services/agendamentos';
import { getPacientes } from '@/services/pacientes';
import { getProfissionais } from '@/services/profissionais';
import { getConvenios } from '@/services/convenios';
import { getServicos } from '@/services/servicos';
import { getRecursos } from '@/services/recursos';
import { getProfissionaisByServico, type ProfissionalServico } from '@/services/profissionais-servicos';
import { toast } from 'sonner';

interface NovoAgendamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preenchimentoInicial?: {
    profissionalId?: string;
    dataHoraInicio?: string;
  };
}

export const NovoAgendamentoModal: React.FC<NovoAgendamentoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preenchimentoInicial
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [formData, setFormData] = useState<CreateAgendamentoData>({
    pacienteId: '',
    profissionalId: '',
    tipoAtendimento: 'presencial',
    recursoId: '',
    convenioId: '',
    servicoId: '',
    dataHoraInicio: '',
    recorrencia: undefined
  });

  // Estados separados para data e hora
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [horaAgendamento, setHoraAgendamento] = useState('');

  // Opções de horários de 30 em 30 minutos
  const opcoesHorarios = [
    { id: '07:00', nome: '07:00', sigla: 'Manhã' },
    { id: '07:30', nome: '07:30', sigla: 'Manhã' },
    { id: '08:00', nome: '08:00', sigla: 'Manhã' },
    { id: '08:30', nome: '08:30', sigla: 'Manhã' },
    { id: '09:00', nome: '09:00', sigla: 'Manhã' },
    { id: '09:30', nome: '09:30', sigla: 'Manhã' },
    { id: '10:00', nome: '10:00', sigla: 'Manhã' },
    { id: '10:30', nome: '10:30', sigla: 'Manhã' },
    { id: '11:00', nome: '11:00', sigla: 'Manhã' },
    { id: '11:30', nome: '11:30', sigla: 'Manhã' },
    { id: '12:00', nome: '12:00', sigla: 'Almoço' },
    { id: '12:30', nome: '12:30', sigla: 'Almoço' },
    { id: '13:00', nome: '13:00', sigla: 'Tarde' },
    { id: '13:30', nome: '13:30', sigla: 'Tarde' },
    { id: '14:00', nome: '14:00', sigla: 'Tarde' },
    { id: '14:30', nome: '14:30', sigla: 'Tarde' },
    { id: '15:00', nome: '15:00', sigla: 'Tarde' },
    { id: '15:30', nome: '15:30', sigla: 'Tarde' },
    { id: '16:00', nome: '16:00', sigla: 'Tarde' },
    { id: '16:30', nome: '16:30', sigla: 'Tarde' },
    { id: '17:00', nome: '17:00', sigla: 'Tarde' },
    { id: '17:30', nome: '17:30', sigla: 'Tarde' },
    { id: '18:00', nome: '18:00', sigla: 'Tarde' },
    { id: '18:30', nome: '18:30', sigla: 'Tarde' },
    { id: '19:00', nome: '19:00', sigla: 'Noite' },
    { id: '19:30', nome: '19:30', sigla: 'Noite' },
    { id: '20:00', nome: '20:00', sigla: 'Noite' },
    { id: '20:30', nome: '20:30', sigla: 'Noite' }
  ];
  
  const [temRecorrencia, setTemRecorrencia] = useState(false);
  const [recorrencia, setRecorrencia] = useState({
    tipo: 'semanal' as TipoRecorrencia,
    repeticoes: 4,
    ate: ''
  });

  // Estados para dados reais
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [profissionaisPorServico, setProfissionaisPorServico] = useState<ProfissionalServico[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [loadingProfissionaisPorServico, setLoadingProfissionaisPorServico] = useState(false);

  // Função para carregar todos os dados necessários
  const carregarDados = async () => {
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
  };

  // Effect para carregar dados quando o modal abrir
  useEffect(() => {
    if (isOpen) {
      carregarDados();
    }
  }, [isOpen]);

  // Effect para pré-preenchimento quando o modal abrir
  useEffect(() => {
    if (isOpen && preenchimentoInicial) {
      setFormData(prev => ({
        ...prev,
        profissionalId: preenchimentoInicial.profissionalId || '',
        dataHoraInicio: preenchimentoInicial.dataHoraInicio || ''
      }));

      // Separar data e hora do preenchimento inicial
      if (preenchimentoInicial.dataHoraInicio) {
        const [data, hora] = preenchimentoInicial.dataHoraInicio.split('T');
        setDataAgendamento(data);
        // Encontrar o horário mais próximo nas opções disponíveis
        const horaFormatada = hora.substring(0, 5); // Pegar apenas HH:MM
        const horarioEncontrado = opcoesHorarios.find(opcao => opcao.id === horaFormatada);
        setHoraAgendamento(horarioEncontrado ? horarioEncontrado.id : '');
      }
    }
  }, [isOpen, preenchimentoInicial]);

  // Função para carregar profissionais por serviço
  const carregarProfissionaisPorServico = async (servicoId: string) => {
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
  };

  const resetForm = () => {
    setFormData({
      pacienteId: '',
      profissionalId: '',
      tipoAtendimento: 'presencial',
      recursoId: '',
      convenioId: '',
      servicoId: '',
      dataHoraInicio: '',
      recorrencia: undefined
    });
    setDataAgendamento('');
    setHoraAgendamento('');
    setTemRecorrencia(false);
    setRecorrencia({
      tipo: 'semanal',
      repeticoes: 4,
      ate: ''
    });
    
    // Limpar dados carregados para próxima sessão
    setPacientes([]);
    setProfissionais([]);
    setProfissionaisPorServico([]);
    setConvenios([]);
    setServicos([]);
    setRecursos([]);
    setLoadingData(false);
    setLoadingProfissionaisPorServico(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 -mx-6 -mt-6 px-6 pt-6 pb-4 border-b border-gray-200">
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-2xl">📅</span>
            Novo Agendamento
            {loadingData && (
              <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Carregando dados...
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="mt-4 space-y-6">
            {/* Seção Principal */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
              {/* Linha 1: Paciente, Convênio, Serviço */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Paciente */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">👤</span>
                    Paciente <span className="text-red-500">*</span>
                  </label>
                  <div className="w-full">
                    <SingleSelectDropdown
                      options={pacientes.map(p => ({
                        id: p.id,
                        nome: p.nomeCompleto,
                        sigla: p.whatsapp
                      }))}
                      selected={pacientes.find(p => p.id === formData.pacienteId) ? {
                        id: formData.pacienteId,
                        nome: pacientes.find(p => p.id === formData.pacienteId)?.nomeCompleto || '',
                        sigla: undefined // Não mostrar WhatsApp quando selecionado
                      } : null}
                      onChange={(selected) => {
                        setFormData(prev => ({ ...prev, pacienteId: selected?.id || '' }));
                      }}
                      placeholder={loadingData ? "Carregando pacientes..." : "Buscar paciente..."}
                      headerText="Pacientes disponíveis"
                      formatOption={(option) => {
                        return option.sigla ? `${option.nome} - ${option.sigla}` : option.nome;
                      }}
                    />
                  </div>
                </div>

                {/* Convênio */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">🏥</span>
                    Convênio <span className="text-red-500">*</span>
                  </label>
                  <div className="w-full">
                    <SingleSelectDropdown
                      options={convenios.map(c => ({
                        id: c.id,
                        nome: c.nome,
                        sigla: undefined
                      }))}
                      selected={convenios.find(c => c.id === formData.convenioId) ? {
                        id: formData.convenioId,
                        nome: convenios.find(c => c.id === formData.convenioId)?.nome || '',
                        sigla: undefined
                      } : null}
                      onChange={(selected) => {
                        setFormData(prev => ({ 
                          ...prev, 
                          convenioId: selected?.id || '',
                          servicoId: '', // Limpar serviço quando trocar convênio
                          profissionalId: '', // Limpar profissional quando trocar convênio
                          recursoId: '', // Limpar recurso quando trocar convênio
                          tipoAtendimento: 'presencial' // Reset tipo de atendimento
                        }));
                        // Limpar profissionais por serviço quando trocar convênio
                        setProfissionaisPorServico([]);
                      }}
                      placeholder={loadingData ? "Carregando convênios..." : "Buscar convênio..."}
                      headerText="Convênios disponíveis"
                      formatOption={(option) => {
                        return option.nome;
                      }}
                    />
                  </div>
                </div>

                {/* Serviço */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">🩺</span>
                    Serviço <span className="text-red-500">*</span>
                  </label>
                  <div className="w-full">
                    <SingleSelectDropdown
                      options={formData.convenioId ? servicos
                        .filter(s => s.convenioId === formData.convenioId)
                        .map(s => ({
                          id: s.id,
                          nome: s.nome,
                          sigla: s.duracaoMinutos ? `${s.duracaoMinutos} min` : undefined
                        })) : []}
                      selected={servicos.find(s => s.id === formData.servicoId) ? {
                        id: formData.servicoId,
                        nome: servicos.find(s => s.id === formData.servicoId)?.nome || '',
                        sigla: servicos.find(s => s.id === formData.servicoId)?.duracaoMinutos ? `${servicos.find(s => s.id === formData.servicoId)?.duracaoMinutos} min` : undefined
                      } : null}
                      onChange={(selected) => {
                        const newServiceId = selected?.id || '';
                        setFormData(prev => ({
                          ...prev,
                          servicoId: newServiceId,
                          profissionalId: '', // Limpar profissional quando trocar serviço
                          recursoId: '', // Limpar recurso quando trocar serviço
                          tipoAtendimento: 'presencial' // Reset tipo de atendimento
                        }));
                        
                        // Carregar profissionais do serviço selecionado
                        if (newServiceId) {
                          carregarProfissionaisPorServico(newServiceId);
                        } else {
                          setProfissionaisPorServico([]);
                        }
                      }}
                      placeholder={!formData.convenioId ? "Selecione um convênio primeiro..." : loadingData ? "Carregando serviços..." : "Buscar serviço..."}
                      headerText="Serviços disponíveis"
                      formatOption={(option) => {
                        return option.sigla ? `${option.nome} - ${option.sigla}` : option.nome;
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Linha 2: Profissional, Recurso, Tipo de Atendimento */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Profissional */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">👨‍⚕️</span>
                    Profissional <span className="text-red-500">*</span>
                  </label>
                  <div className="w-full">
                    <SingleSelectDropdown
                      options={formData.servicoId ? profissionaisPorServico.map(ps => ({
                        id: ps.profissional.id,
                        nome: ps.profissional.nome,
                        sigla: undefined
                      })) : []}
                      selected={profissionaisPorServico.find(ps => ps.profissional.id === formData.profissionalId) ? {
                        id: formData.profissionalId,
                        nome: profissionaisPorServico.find(ps => ps.profissional.id === formData.profissionalId)?.profissional.nome || '',
                        sigla: undefined
                      } : null}
                      onChange={(selected) => {
                        setFormData(prev => ({ ...prev, profissionalId: selected?.id || '' }));
                      }}
                      placeholder={!formData.servicoId ? "Selecione um serviço primeiro..." : loadingProfissionaisPorServico ? "Carregando profissionais..." : "Buscar profissional..."}
                      headerText="Profissionais disponíveis"
                      formatOption={(option) => {
                        return option.nome;
                      }}
                    />
                  </div>
                </div>

                {/* Recurso */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">📍</span>
                    Recurso <span className="text-red-500">*</span>
                  </label>
                  <div className="w-full">
                    <SingleSelectDropdown
                      options={formData.servicoId ? recursos.map(r => ({
                        id: r.id,
                        nome: r.nome,
                        sigla: r.descricao
                      })) : []}
                      selected={recursos.find(r => r.id === formData.recursoId) ? {
                        id: formData.recursoId,
                        nome: recursos.find(r => r.id === formData.recursoId)?.nome || '',
                        sigla: undefined // Não mostrar descrição quando selecionado
                      } : null}
                      onChange={(selected) => {
                        setFormData(prev => ({ ...prev, recursoId: selected?.id || '' }));
                      }}
                      placeholder={!formData.servicoId ? "Selecione um serviço primeiro..." : loadingData ? "Carregando recursos..." : "Buscar recurso..."}
                      headerText="Recursos disponíveis"
                      formatOption={(option) => {
                        return option.sigla ? `${option.nome} - ${option.sigla}` : option.nome;
                      }}
                    />
                  </div>
                </div>

                {/* Tipo de Atendimento */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">📱</span>
                    Tipo de Atendimento <span className="text-red-500">*</span>
                  </label>
                  <div className="w-full">
                    <SingleSelectDropdown
                      options={formData.servicoId ? [
                        { id: 'presencial', nome: 'Presencial', sigla: '🏥' },
                        { id: 'online', nome: 'Online', sigla: '📱' }
                      ] : []}
                      selected={formData.servicoId ? {
                        id: formData.tipoAtendimento,
                        nome: formData.tipoAtendimento === 'presencial' ? 'Presencial' : 'Online',
                        sigla: formData.tipoAtendimento === 'presencial' ? '🏥' : '📱'
                      } : null}
                      onChange={(selected) => {
                        setFormData(prev => ({ ...prev, tipoAtendimento: selected?.id as TipoAtendimento || 'presencial' }));
                      }}
                      placeholder={!formData.servicoId ? "Selecione um serviço primeiro..." : "Selecione o tipo..."}
                      headerText="Tipos de atendimento"
                      formatOption={(option) => {
                        return `${option.sigla} ${option.nome}`;
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Seção Data/Hora e Recorrência */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Data e Hora */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Data */}
                  <div className="min-w-0">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="text-lg">📅</span>
                      Data do Agendamento <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="dataAgendamento"
                      type="date"
                      value={dataAgendamento}
                      onChange={(e) => setDataAgendamento(e.target.value)}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className="border-2 border-green-200 focus:border-green-500 focus:ring-green-100"
                    />
                  </div>

                  {/* Hora */}
                  <div className="min-w-0 relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="text-lg">🕐</span>
                      Hora do Agendamento <span className="text-red-500">*</span>
                    </label>
                    <div className="w-full">
                      <div className="w-full">
                        <SingleSelectDropdown
                          options={opcoesHorarios}
                          selected={opcoesHorarios.find(opcao => opcao.id === horaAgendamento) ? {
                            id: horaAgendamento,
                            nome: opcoesHorarios.find(opcao => opcao.id === horaAgendamento)?.nome || '',
                            sigla: opcoesHorarios.find(opcao => opcao.id === horaAgendamento)?.sigla || ''
                          } : null}
                          onChange={(selected) => {
                            setHoraAgendamento(selected?.id || '');
                          }}
                          placeholder="Selecione..."
                          headerText="Horários disponíveis"
                          formatOption={(option) => {
                            return `${option.nome} - ${option.sigla}`;
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recorrência */}
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-200">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <span className="text-xl">🔁</span>
                  Recorrência (Opcional)
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="temRecorrencia"
                      checked={temRecorrencia}
                      onCheckedChange={(checked) => setTemRecorrencia(checked === true)}
                      className="border-2 border-purple-300"
                    />
                    <label htmlFor="temRecorrencia" className="text-sm font-semibold text-gray-700">
                      Criar agendamentos recorrentes
                    </label>
                  </div>

                  {temRecorrencia && (
                    <div className="space-y-4 bg-white rounded-lg p-4 border border-purple-200">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <span className="text-lg">🔄</span>
                          Tipo de Recorrência
                        </label>
                        <div className="w-full">
                          <SingleSelectDropdown
                            options={[
                              { id: 'semanal', nome: 'Semanal', sigla: '7 dias' },
                              { id: 'quinzenal', nome: 'Quinzenal', sigla: '15 dias' },
                              { id: 'mensal', nome: 'Mensal', sigla: '30 dias' }
                            ]}
                            selected={{
                              id: recorrencia.tipo,
                              nome: recorrencia.tipo === 'semanal' ? 'Semanal' : recorrencia.tipo === 'quinzenal' ? 'Quinzenal' : 'Mensal',
                              sigla: recorrencia.tipo === 'semanal' ? '7 dias' : recorrencia.tipo === 'quinzenal' ? '15 dias' : '30 dias'
                            }}
                            onChange={(selected) => {
                              setRecorrencia(prev => ({ ...prev, tipo: selected?.id as TipoRecorrencia || 'semanal' }));
                            }}
                            placeholder="Selecione o tipo..."
                            headerText="Tipos de recorrência"
                            formatOption={(option) => {
                              return `${option.nome} - ${option.sigla}`;
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <span className="text-lg">🔢</span>
                            Repetições
                          </label>
                          <Input
                            id="repeticoes"
                            type="number"
                            min="1"
                            max="52"
                            value={recorrencia.repeticoes}
                            onChange={(e) => setRecorrencia(prev => ({ ...prev, repeticoes: parseInt(e.target.value) }))}
                            placeholder="Ex: 4"
                            className="border-2 border-purple-200 focus:border-purple-500 focus:ring-purple-100"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <span className="text-lg">📅</span>
                            Ou até a data
                          </label>
                          <Input
                            id="ate"
                            type="date"
                            value={recorrencia.ate}
                            onChange={(e) => setRecorrencia(prev => ({ ...prev, ate: e.target.value }))}
                            className="border-2 border-purple-200 focus:border-purple-500 focus:ring-purple-100"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Erro do formulário */}
            {/* Adicionamos uma mensagem de erro simples se necessário */}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading || loadingData}
              className="border-2 border-gray-300 text-gray-700 hover:border-red-400 hover:bg-red-50 hover:text-red-700 font-semibold px-6 transition-all duration-200"
            >
              <span className="mr-2">🔴</span>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || loadingData}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl font-semibold px-8 transition-all duration-200"
            >
              {loading ? (
                <>
                  <span className="mr-2">⏳</span>
                  Criando...
                </>
              ) : loadingData ? (
                <>
                  <span className="mr-2">⏳</span>
                  Carregando...
                </>
              ) : (
                <>
                  <span className="mr-2">✅</span>
                  Criar Agendamento
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 