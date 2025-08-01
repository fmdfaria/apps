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
  
  const [temRecorrencia, setTemRecorrencia] = useState(false);
  const [recorrencia, setRecorrencia] = useState({
    tipo: 'semanal' as TipoRecorrencia,
    repeticoes: 4,
    ate: ''
  });

  // Estados para dados reais
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [recursos, setRecursos] = useState<Recurso[]>([]);

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
    }
  }, [isOpen, preenchimentoInicial]);

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
    setTemRecorrencia(false);
    setRecorrencia({
      tipo: 'semanal',
      repeticoes: 4,
      ate: ''
    });
    
    // Limpar dados carregados para próxima sessão
    setPacientes([]);
    setProfissionais([]);
    setConvenios([]);
    setServicos([]);
    setRecursos([]);
    setLoadingData(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!formData.pacienteId || !formData.profissionalId || !formData.servicoId || 
        !formData.convenioId || !formData.recursoId || !formData.dataHoraInicio) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const dadosParaEnvio = {
        ...formData,
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Paciente */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">👤</span>
                    Paciente <span className="text-red-500">*</span>
                  </label>
                  <SingleSelectDropdown
                    options={pacientes.map(p => ({
                      id: p.id,
                      nome: p.nomeCompleto,
                      sigla: p.whatsapp
                    }))}
                    selected={pacientes.find(p => p.id === formData.pacienteId) ? {
                      id: formData.pacienteId,
                      nome: pacientes.find(p => p.id === formData.pacienteId)?.nomeCompleto || '',
                      sigla: pacientes.find(p => p.id === formData.pacienteId)?.whatsapp
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

                {/* Profissional */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">👨‍⚕️</span>
                    Profissional <span className="text-red-500">*</span>
                  </label>
                  <SingleSelectDropdown
                    options={(() => {
                      // Se serviço selecionado, filtrar profissionais que oferecem esse serviço
                      if (formData.servicoId) {
                        return profissionais
                          .filter(p => p.servicosIds && p.servicosIds.includes(formData.servicoId))
                          .map(p => ({
                            id: p.id,
                            nome: p.nome,
                            sigla: undefined
                          }));
                      }
                      // Se não há serviço selecionado, mostrar todos os profissionais
                      return profissionais.map(p => ({
                        id: p.id,
                        nome: p.nome,
                        sigla: undefined
                      }));
                    })()}
                    selected={profissionais.find(p => p.id === formData.profissionalId) ? {
                      id: formData.profissionalId,
                      nome: profissionais.find(p => p.id === formData.profissionalId)?.nome || '',
                      sigla: undefined
                    } : null}
                    onChange={(selected) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        profissionalId: selected?.id || '',
                        // Não limpar convênio/serviço se foram selecionados primeiro
                        ...(!formData.servicoId && { convenioId: '', servicoId: '' })
                      }));
                    }}
                    placeholder={loadingData ? "Carregando profissionais..." : "Buscar profissional..."}
                    headerText="Profissionais disponíveis"
                    formatOption={(option) => {
                      return option.nome;
                    }}
                  />
                </div>

                {/* Convênio */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">🏥</span>
                    Convênio <span className="text-red-500">*</span>
                  </label>
                  <SingleSelectDropdown
                    options={(() => {
                      // Se profissional selecionado, filtrar convênios pelos serviços do profissional
                      if (formData.profissionalId) {
                        const profissional = profissionais.find(p => p.id === formData.profissionalId);
                        if (profissional && profissional.servicosIds) {
                          const servicosDoProfissional = servicos.filter(s => 
                            profissional.servicosIds.includes(s.id)
                          );
                          const conveniosUnicos = [...new Set(servicosDoProfissional
                            .filter(s => s.convenioId)
                            .map(s => s.convenioId))]
                            .map(convenioId => convenios.find(c => c.id === convenioId))
                            .filter(Boolean);
                          return conveniosUnicos.map(c => ({
                            id: c!.id,
                            nome: c!.nome,
                            sigla: undefined
                          }));
                        }
                      }
                      // Se não há profissional selecionado, mostrar todos os convênios
                      return convenios.map(c => ({
                        id: c.id,
                        nome: c.nome,
                        sigla: undefined
                      }));
                    })()}
                    selected={convenios.find(c => c.id === formData.convenioId) ? {
                      id: formData.convenioId,
                      nome: convenios.find(c => c.id === formData.convenioId)?.nome || '',
                      sigla: undefined
                    } : null}
                    onChange={(selected) => {
                      setFormData(prev => ({ 
                        ...prev, 
                        convenioId: selected?.id || '',
                        servicoId: '' // Limpar serviço quando trocar convênio
                      }));
                    }}
                    placeholder={loadingData ? "Carregando convênios..." : "Buscar convênio..."}
                    headerText="Convênios disponíveis"
                    formatOption={(option) => {
                      return option.nome;
                    }}
                  />
                </div>

                {/* Serviço */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">🩺</span>
                    Serviço <span className="text-red-500">*</span>
                  </label>
                  <SingleSelectDropdown
                    options={formData.convenioId ? (() => {
                      let servicosFiltrados = servicos.filter(s => s.convenioId === formData.convenioId);
                      
                      // Se profissional selecionado, filtrar apenas serviços que o profissional oferece
                      if (formData.profissionalId) {
                        const profissional = profissionais.find(p => p.id === formData.profissionalId);
                        if (profissional && profissional.servicosIds) {
                          servicosFiltrados = servicosFiltrados.filter(s => 
                            profissional.servicosIds.includes(s.id)
                          );
                        }
                      }
                      
                      return servicosFiltrados.map(s => ({
                        id: s.id,
                        nome: s.nome,
                        sigla: s.duracaoMinutos ? `${s.duracaoMinutos} min` : undefined
                      }));
                    })() : []}
                    selected={servicos.find(s => s.id === formData.servicoId) ? {
                      id: formData.servicoId,
                      nome: servicos.find(s => s.id === formData.servicoId)?.nome || '',
                      sigla: servicos.find(s => s.id === formData.servicoId)?.duracaoMinutos ? `${servicos.find(s => s.id === formData.servicoId)?.duracaoMinutos} min` : undefined
                    } : null}
                    onChange={(selected) => {
                      setFormData(prev => {
                        const newServiceId = selected?.id || '';
                        // Se mudou o serviço e há profissional selecionado, verificar se profissional oferece o novo serviço
                        if (prev.profissionalId && newServiceId) {
                          const profissional = profissionais.find(p => p.id === prev.profissionalId);
                          if (profissional && profissional.servicosIds && !profissional.servicosIds.includes(newServiceId)) {
                            // Profissional não oferece o novo serviço, limpar profissional
                            return { ...prev, servicoId: newServiceId, profissionalId: '' };
                          }
                        }
                        return { ...prev, servicoId: newServiceId };
                      });
                    }}
                    placeholder={!formData.convenioId ? "Selecione um convênio primeiro..." : loadingData ? "Carregando serviços..." : "Buscar serviço..."}
                    headerText="Serviços disponíveis"
                    formatOption={(option) => {
                      return option.sigla ? `${option.nome} - ${option.sigla}` : option.nome;
                    }}
                  />
                </div>

                {/* Recurso */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">📍</span>
                    Recurso <span className="text-red-500">*</span>
                  </label>
                  <SingleSelectDropdown
                    options={recursos.map(r => ({
                      id: r.id,
                      nome: r.nome,
                      sigla: r.descricao
                    }))}
                    selected={recursos.find(r => r.id === formData.recursoId) ? {
                      id: formData.recursoId,
                      nome: recursos.find(r => r.id === formData.recursoId)?.nome || '',
                      sigla: recursos.find(r => r.id === formData.recursoId)?.descricao
                    } : null}
                    onChange={(selected) => {
                      setFormData(prev => ({ ...prev, recursoId: selected?.id || '' }));
                    }}
                    placeholder={loadingData ? "Carregando recursos..." : "Buscar recurso..."}
                    headerText="Recursos disponíveis"
                    formatOption={(option) => {
                      return option.sigla ? `${option.nome} - ${option.sigla}` : option.nome;
                    }}
                  />
                </div>

                {/* Tipo de Atendimento */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">📱</span>
                    Tipo de Atendimento <span className="text-red-500">*</span>
                  </label>
                  <SingleSelectDropdown
                    options={[
                      { id: 'presencial', nome: 'Presencial', sigla: '🏥' },
                      { id: 'online', nome: 'Online', sigla: '📱' }
                    ]}
                    selected={{
                      id: formData.tipoAtendimento,
                      nome: formData.tipoAtendimento === 'presencial' ? 'Presencial' : 'Online',
                      sigla: formData.tipoAtendimento === 'presencial' ? '🏥' : '📱'
                    }}
                    onChange={(selected) => {
                      setFormData(prev => ({ ...prev, tipoAtendimento: selected?.id as TipoAtendimento || 'presencial' }));
                    }}
                    placeholder="Selecione o tipo..."
                    headerText="Tipos de atendimento"
                    formatOption={(option) => {
                      return `${option.sigla} ${option.nome}`;
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Seção Data/Hora e Recorrência */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Data e Hora */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <span className="text-xl">🕰️</span>
                  Data e Horário
                </h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">📅</span>
                    Data e Hora do Agendamento <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="dataHoraInicio"
                    type="datetime-local"
                    value={formData.dataHoraInicio}
                    onChange={(e) => setFormData(prev => ({ ...prev, dataHoraInicio: e.target.value }))}
                    required
                    min={new Date().toISOString().slice(0, 16)}
                    className="border-2 border-green-200 focus:border-green-500 focus:ring-green-100"
                  />
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