import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Calendar, Clock, User, Users, Stethoscope, CreditCard, MapPin, Repeat, Smartphone } from 'lucide-react';
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

interface CriarAgendamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preenchimentoInicial?: {
    profissionalId?: string;
    dataHoraInicio?: string;
  };
}

type TipoFluxo = 'por-profissional' | 'por-data';

export const CriarAgendamentoModal: React.FC<CriarAgendamentoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preenchimentoInicial
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [tipoFluxo, setTipoFluxo] = useState<TipoFluxo | null>(null);
  
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
    setTipoFluxo(null);
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

  const handleVoltar = () => {
    setTipoFluxo(null);
  };

  // Se o tipo de fluxo não foi selecionado, mostrar seleção
  if (!tipoFluxo) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 -mx-6 -mt-6 px-6 pt-6 pb-4 border-b border-gray-200">
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <span className="text-2xl">📅</span>
              Novo Agendamento
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-2">
              Escolha como deseja criar o agendamento:
            </p>
          </DialogHeader>

          <div className="mt-6 space-y-4">
            <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-300" 
                  onClick={() => setTipoFluxo('por-profissional')}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">Por Profissional</h3>
                    <p className="text-sm text-gray-600">
                      Escolha primeiro o profissional e depois os demais dados do agendamento
                    </p>
                  </div>
                  <div className="text-2xl">👨‍⚕️</div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-green-300" 
                  onClick={() => setTipoFluxo('por-data')}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">Por Data</h3>
                    <p className="text-sm text-gray-600">
                      Escolha primeiro a data e hora e depois os demais dados do agendamento
                    </p>
                  </div>
                  <div className="text-2xl">📅</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="border-2 border-gray-300 text-gray-700 hover:border-red-400 hover:bg-red-50 hover:text-red-700 font-semibold px-6"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Conteúdo do formulário baseado no tipo de fluxo selecionado
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 -mx-6 -mt-6 px-6 pt-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleVoltar}
              className="p-2 hover:bg-blue-100"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <span className="text-2xl">📅</span>
                Novo Agendamento - {tipoFluxo === 'por-profissional' ? 'Por Profissional' : 'Por Data'}
                {loadingData && (
                  <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Carregando dados...
                  </div>
                )}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="mt-4 space-y-6">
            {tipoFluxo === 'por-profissional' ? (
              // Fluxo: Por Profissional
              <>
                {/* Linha 1: Blocos 1 e 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 1. Selecione o Profissional */}
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <span className="text-xl">👨‍⚕️</span>
                      1. Selecione o Profissional
                    </h3>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Selecione o Profissional <span className="text-red-500">*</span>
                      </label>
                      <div className="w-full">
                        <SingleSelectDropdown
                          options={profissionais.map(p => ({
                            id: p.id,
                            nome: p.nome,
                            sigla: undefined
                          }))}
                          selected={profissionais.find(p => p.id === formData.profissionalId) ? {
                            id: formData.profissionalId,
                            nome: profissionais.find(p => p.id === formData.profissionalId)?.nome || '',
                            sigla: undefined
                          } : null}
                          onChange={(selected) => {
                            setFormData(prev => ({ 
                              ...prev, 
                              profissionalId: selected?.id || '',
                              servicoId: '', // Limpar serviço quando trocar profissional
                              convenioId: '', // Limpar convênio quando trocar profissional
                              recursoId: '', // Limpar recurso quando trocar profissional
                              tipoAtendimento: 'presencial' // Reset tipo de atendimento
                            }));
                            setProfissionaisPorServico([]);
                          }}
                          placeholder={loadingData ? "Carregando profissionais..." : "Buscar profissional..."}
                          headerText="Profissionais disponíveis"
                          formatOption={(option) => option.nome}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Selecione Data e Hora (só aparece quando profissional for selecionado) */}
                  {formData.profissionalId ? (
                    <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <span className="text-xl">📅</span>
                        2. Selecione Data e Hora
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Data */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Data <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="date"
                            value={dataAgendamento}
                            onChange={(e) => setDataAgendamento(e.target.value)}
                            required
                            min={new Date().toISOString().split('T')[0]}
                            className="border-2 border-green-200 focus:border-green-500 focus:ring-green-100"
                          />
                        </div>

                        {/* Hora */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Hora <span className="text-red-500">*</span>
                          </label>
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
                  ) : (
                    <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl p-6 border border-gray-300 opacity-50">
                      <h3 className="text-lg font-semibold text-gray-500 mb-4 flex items-center gap-2">
                        <span className="text-xl">📅</span>
                        2. Selecione Data e Hora
                      </h3>
                      <p className="text-gray-500 text-sm">Selecione um profissional primeiro</p>
                    </div>
                  )}
                </div>

                {/* Linha 2: Blocos 3 e 4 */}
                {formData.profissionalId && dataAgendamento && horaAgendamento && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 3. Complete os dados do agendamento */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <span className="text-xl">📋</span>
                        3. Complete os dados do agendamento
                      </h3>
                    
                    {/* Linha 1: Paciente */}
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <User className="w-4 h-4" />
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
                            sigla: undefined
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

                    {/* Linha 2: Convênio e Serviço */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {/* Convênio */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
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
                                recursoId: '', // Limpar recurso quando trocar convênio
                                tipoAtendimento: 'presencial' // Reset tipo de atendimento
                              }));
                              setProfissionaisPorServico([]);
                            }}
                            placeholder={loadingData ? "Carregando convênios..." : "Buscar convênio..."}
                            headerText="Convênios disponíveis"
                            formatOption={(option) => option.nome}
                          />
                        </div>
                      </div>

                      {/* Serviço */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Stethoscope className="w-4 h-4" />
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
                              setFormData(prev => ({
                                ...prev,
                                servicoId: selected?.id || '',
                                recursoId: '', // Limpar recurso quando trocar serviço
                                tipoAtendimento: 'presencial' // Reset tipo de atendimento
                              }));
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

                    {/* Linha 3: Recurso e Tipo de Atendimento */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-baseline">
                      {/* Recurso */}
                      <div className="flex flex-col">
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2 h-6">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
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
                              sigla: undefined
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
                      <div className="flex flex-col">
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2 h-6">
                          <Smartphone className="w-4 h-4 flex-shrink-0" />
                          Tipo <span className="text-red-500">*</span>
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

                    {/* 4. Recorrência */}
                    <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-200">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <span className="text-xl">🔁</span>
                        4. Recorrência (Opcional)
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
                                <Repeat className="w-4 h-4" />
                                Tipo de Recorrência
                              </label>
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                  <span className="text-lg">🔢</span>
                                  Repetições
                                </label>
                                <Input
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
                                  <Calendar className="w-4 h-4" />
                                  Ou até a data
                                </label>
                                <Input
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
                )}
              </>
            ) : (
              // Fluxo: Por Data
              <>
                {/* Linha 1: Blocos 1 e 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 1. Selecione Data e Hora */}
                  <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <span className="text-xl">📅</span>
                      1. Selecione Data e Hora
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Data */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Data <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="date"
                          value={dataAgendamento}
                          onChange={(e) => setDataAgendamento(e.target.value)}
                          required
                          min={new Date().toISOString().split('T')[0]}
                          className="border-2 border-green-200 focus:border-green-500 focus:ring-green-100"
                        />
                      </div>

                      {/* Hora */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Hora <span className="text-red-500">*</span>
                        </label>
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

                  {/* 2. Selecione o Profissional (só aparece quando data e hora forem selecionadas) */}
                  {dataAgendamento && horaAgendamento ? (
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <span className="text-xl">👨‍⚕️</span>
                        2. Selecione o Profissional
                      </h3>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Selecione o Profissional <span className="text-red-500">*</span>
                        </label>
                        <SingleSelectDropdown
                          options={profissionais.map(p => ({
                            id: p.id,
                            nome: p.nome,
                            sigla: undefined
                          }))}
                          selected={profissionais.find(p => p.id === formData.profissionalId) ? {
                            id: formData.profissionalId,
                            nome: profissionais.find(p => p.id === formData.profissionalId)?.nome || '',
                            sigla: undefined
                          } : null}
                          onChange={(selected) => {
                            setFormData(prev => ({ 
                              ...prev, 
                              profissionalId: selected?.id || '',
                              servicoId: '', // Limpar serviço quando trocar profissional
                              convenioId: '', // Limpar convênio quando trocar profissional
                              recursoId: '', // Limpar recurso quando trocar profissional
                              tipoAtendimento: 'presencial' // Reset tipo de atendimento
                            }));
                            setProfissionaisPorServico([]);
                          }}
                          placeholder={loadingData ? "Carregando profissionais..." : "Buscar profissional..."}
                          headerText="Profissionais disponíveis"
                          formatOption={(option) => option.nome}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl p-6 border border-gray-300 opacity-50">
                      <h3 className="text-lg font-semibold text-gray-500 mb-4 flex items-center gap-2">
                        <span className="text-xl">👨‍⚕️</span>
                        2. Selecione o Profissional
                      </h3>
                      <p className="text-gray-500 text-sm">Selecione data e hora primeiro</p>
                    </div>
                  )}
                </div>

                {/* Linha 2: Blocos 3 e 4 */}
                {dataAgendamento && horaAgendamento && formData.profissionalId && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 3. Complete os dados do agendamento */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <span className="text-xl">📋</span>
                      3. Complete os dados do agendamento
                    </h3>
                    
                    {/* Linha 1: Paciente */}
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <User className="w-4 h-4" />
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
                            sigla: undefined
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

                    {/* Linha 2: Convênio e Serviço */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {/* Convênio */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
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
                              setProfissionaisPorServico([]);
                            }}
                            placeholder={loadingData ? "Carregando convênios..." : "Buscar convênio..."}
                            headerText="Convênios disponíveis"
                            formatOption={(option) => option.nome}
                          />
                        </div>
                      </div>

                      {/* Serviço */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                          <Stethoscope className="w-4 h-4" />
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

                    {/* Linha 3: Recurso e Tipo de Atendimento */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-baseline">
                      {/* Recurso */}
                      <div className="flex flex-col">
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2 h-6">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
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
                              sigla: undefined
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
                      <div className="flex flex-col">
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2 h-6">
                          <Smartphone className="w-4 h-4 flex-shrink-0" />
                          Tipo <span className="text-red-500">*</span>
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

                    {/* 4. Recorrência */}
                    <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-200">
                      <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <span className="text-xl">🔁</span>
                        4. Recorrência (Opcional)
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="temRecorrenciaData"
                            checked={temRecorrencia}
                            onCheckedChange={(checked) => setTemRecorrencia(checked === true)}
                            className="border-2 border-purple-300"
                          />
                          <label htmlFor="temRecorrenciaData" className="text-sm font-semibold text-gray-700">
                            Criar agendamentos recorrentes
                          </label>
                        </div>

                        {temRecorrencia && (
                          <div className="space-y-4 bg-white rounded-lg p-4 border border-purple-200">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                <Repeat className="w-4 h-4" />
                                Tipo de Recorrência
                              </label>
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                  <span className="text-lg">🔢</span>
                                  Repetições
                                </label>
                                <Input
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
                                  <Calendar className="w-4 h-4" />
                                  Ou até a data
                                </label>
                                <Input
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
                )}
              </>
            )}

          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleVoltar}
              disabled={loading || loadingData}
              className="border-2 border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 font-semibold px-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading || loadingData}
              className="border-2 border-gray-300 text-gray-700 hover:border-red-400 hover:bg-red-50 hover:text-red-700 font-semibold px-6"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || loadingData}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl font-semibold px-8"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Criando...
                </>
              ) : loadingData ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
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