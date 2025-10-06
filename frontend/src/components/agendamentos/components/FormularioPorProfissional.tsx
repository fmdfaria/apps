import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Clock, User, Users, Stethoscope, CreditCard, MapPin, Smartphone } from 'lucide-react';
import { OPCOES_HORARIOS } from '../utils/agendamento-constants';
import { useVerificacaoAgendamento } from '@/hooks/useVerificacaoAgendamento';
// Removido getRecursosByDate para evitar chamada extra; usaremos dados locais
import { useOcupacaoProfissionais } from '../hooks/useOcupacaoProfissionais';
import type { AgendamentoFormContext } from '../types/agendamento-form';
import type { TipoAtendimento } from '@/types/Agendamento';

interface FormularioPorProfissionalProps {
  context: AgendamentoFormContext;
}

export const FormularioPorProfissional: React.FC<FormularioPorProfissionalProps> = ({ context }) => {
  const { state, dataState, loadingState, updateFormData, updateDataAgendamento, updateHoraAgendamento } = context;
  const { formData, dataAgendamento, horaAgendamento } = state;
  const { profissionais, pacientes, convenios, servicos, recursos, conveniosDoProfissional, servicosDoProfissional, disponibilidades, agendamentosDoDia } = dataState;
  const { loadingData } = loadingState;

  // Hook centralizado para ocupações dos profissionais
  const { ocupacoesSemana, carregandoOcupacoes, buscarOcupacoes } = useOcupacaoProfissionais();

  // Estado para armazenar verificação de disponibilidade dos recursos
  const [recursosVerificados, setRecursosVerificados] = useState<{ [recursoId: string]: { disponivel: boolean, ocupadoPor?: string } }>({});

  // Hook para verificação de disponibilidade
  const {
    carregandoHorarios,
    horariosVerificados,
    verificarHorarios
  } = useVerificacaoAgendamento();

  // Verificar horários quando profissional e data estiverem selecionados
  useEffect(() => {
    if (formData.profissionalId && dataAgendamento) {
      // Parse manual para evitar problemas de timezone (igual ao CalendarioPage)
      const [ano, mes, dia] = dataAgendamento.split('-').map(Number);
      const dataObj = new Date(ano, mes - 1, dia); // mes é 0-indexed
      verificarHorarios(formData.profissionalId, dataObj);
    }
  }, [formData.profissionalId, dataAgendamento, verificarHorarios]);

  // Removido no fluxo Por Profissional para evitar chamada a /agendamentos/form-data via hook de ocupações

  // Aplicar regra do tipo de atendimento quando recursoId já estiver preenchido (modal pré-carregado)
  useEffect(() => {
    if (formData.recursoId && recursos.length > 0) {
      const recursoSelecionado = recursos.find(r => r.id === formData.recursoId);
      if (recursoSelecionado) {
        const recursoNome = recursoSelecionado.nome.toLowerCase();
        
        // Nova regra: só forçar para 'online' se recurso contém 'online'
        // Permitir que usuário mantenha 'online' mesmo com recursos presenciais
        if (recursoNome.includes('online') && formData.tipoAtendimento !== 'online') {
          updateFormData({ tipoAtendimento: 'online' });
        }
        // Não forçar para 'presencial' - permite que usuário escolha 'online' em recursos presenciais
      }
    }
  }, [formData.recursoId, recursos, formData.tipoAtendimento, updateFormData]);

  // Função para verificar disponibilidade dos recursos usando a nova API
  const verificarDisponibilidadeRecursos = async () => {
    if (!dataAgendamento || !horaAgendamento) {
      setRecursosVerificados({});
      return;
    }

    try {
      // Evitar ida ao backend: usar agendamentosDoDia já carregados + recursos
      const recursosComAgendamentos = recursos.map(r => ({
        id: r.id,
        nome: r.nome,
        agendamentos: agendamentosDoDia
          .filter(a => a.recursoId === r.id)
          .map(a => {
            // Interpretar ISO do backend como horário local (considera Z -> local)
            const inicioDate = new Date(a.dataHoraInicio);
            const inicioH = String(inicioDate.getHours()).padStart(2, '0');
            const inicioM = String(inicioDate.getMinutes()).padStart(2, '0');
            const inicio = `${inicioH}:${inicioM}`;
            // Supondo duração padrão de 30 min quando não houver fim disponível
            const fimDate = new Date(inicioDate.getTime() + 30 * 60000);
            const fimH = String(fimDate.getHours()).padStart(2, '0');
            const fimM = String(fimDate.getMinutes()).padStart(2, '0');
            const fim = `${fimH}:${fimM}`;
            return { horaInicio: inicio, horaFim: fim, profissionalNome: a.profissionalNome, status: a.status };
          })
      }));
      
      // Parse do horário selecionado
      const [hora, minuto] = horaAgendamento.split(':').map(Number);
      const horarioSelecionado = hora * 60 + minuto; // converter para minutos
      
      const verificacoes: { [recursoId: string]: { disponivel: boolean, ocupadoPor?: string } } = {};
      
      recursosComAgendamentos.forEach(recurso => {
        // Recursos online sempre disponíveis
        if (recurso.nome.toLowerCase().includes('online')) {
          verificacoes[recurso.id] = { disponivel: true };
          return;
        }
        
        // Verificar se há agendamentos conflitantes para este recurso no horário selecionado
        const agendamentoConflitante = recurso.agendamentos.find(agendamento => {
          // Parse dos horários do agendamento
          const [horaInicioAg, minutoInicioAg] = agendamento.horaInicio.split(':').map(Number);
          const [horaFimAg, minutoFimAg] = agendamento.horaFim.split(':').map(Number);
          
          const inicioAgendamento = horaInicioAg * 60 + minutoInicioAg;
          const fimAgendamento = horaFimAg * 60 + minutoFimAg;
          
          // Assumindo 30 minutos de duração para o novo agendamento
          const fimNovoAgendamento = horarioSelecionado + 30;
          
          // Verificar sobreposição
          return (horarioSelecionado < fimAgendamento && fimNovoAgendamento > inicioAgendamento);
        });
        
        if (agendamentoConflitante) {
          verificacoes[recurso.id] = { 
            disponivel: false, 
            ocupadoPor: agendamentoConflitante.profissionalNome || 'Profissional não identificado'
          };
        } else {
          verificacoes[recurso.id] = { disponivel: true };
        }
      });
      
      setRecursosVerificados(verificacoes);
    } catch (error) {
      setRecursosVerificados({});
    }
  };

  // Verificar recursos quando data e hora mudarem
  useEffect(() => {
    verificarDisponibilidadeRecursos();
  }, [dataAgendamento, horaAgendamento]);

  return (
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
                  sigla: ocupacoesSemana[p.id] !== undefined ? 
                    `${ocupacoesSemana[p.id].ocupados} de ${ocupacoesSemana[p.id].total} (${ocupacoesSemana[p.id].percentual}%)` : 
                    undefined
                }))}
                selected={profissionais.find(p => p.id === formData.profissionalId) ? {
                  id: formData.profissionalId,
                  nome: profissionais.find(p => p.id === formData.profissionalId)?.nome || '',
                  sigla: ocupacoesSemana[formData.profissionalId] !== undefined ? 
                    `${ocupacoesSemana[formData.profissionalId].ocupados} de ${ocupacoesSemana[formData.profissionalId].total} (${ocupacoesSemana[formData.profissionalId].percentual}%)` : 
                    undefined
                } : null}
                onChange={(selected) => {
                  const profissionalId = selected?.id || '';
                  let recursoId = '';
                  let tipoAtendimento: TipoAtendimento = 'presencial';
                  
                  // Por enquanto, deixar recursoId vazio para seleção manual
                  // TODO: Implementar auto-seleção baseada nas disponibilidades do profissional
                  
                  updateFormData({
                    profissionalId,
                    servicoId: '', // Limpar serviço quando trocar profissional
                    convenioId: '', // Limpar convênio quando trocar profissional
                    recursoId, // Auto-selecionar recurso baseado nas disponibilidades
                    tipoAtendimento // Auto-definir tipo baseado no recurso
                  });
                }}
                placeholder={loadingData ? "Carregando profissionais..." : "Buscar profissional..."}
                headerText="Profissionais disponíveis"
                formatOption={(option) => option.sigla ? `${option.nome} - ${option.sigla}` : option.nome}
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
                  onChange={(e) => updateDataAgendamento(e.target.value)}
                  required
                  className="border-2 border-green-200 focus:border-green-500 focus:ring-green-100"
                />
              </div>

              {/* Hora */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Hora <span className="text-red-500">*</span>
                  {carregandoHorarios && (
                    <div className="ml-2 flex items-center gap-1 text-xs text-gray-500">
                      <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      Verificando...
                    </div>
                  )}
                </label>
                <div className="w-full">
                  <SingleSelectDropdown
                    options={OPCOES_HORARIOS}
                    selected={horaAgendamento ? {
                      id: horaAgendamento,
                      nome: horaAgendamento,
                      sigla: undefined
                    } : null}
                    onChange={(selected) => {
                      updateHoraAgendamento(selected?.id || '');
                    }}
                    placeholder={carregandoHorarios ? "Verificando horários..." : dataAgendamento ? "Selecione um horário..." : "Selecione uma data primeiro..."}
                    headerText="Horários disponíveis"
                    formatOption={(option) => option.nome}
                    getDotColor={(option) => {
                      const horarioInfo = horariosVerificados.find(h => h.horario === option.id);
                      return horarioInfo?.verificacao.dotColor || 'gray';
                    }}
                    getDisabled={(option) => {
                      const horarioInfo = horariosVerificados.find(h => h.horario === option.id);
                      const verificacao = horarioInfo?.verificacao;
                      // Desabilitar apenas se for indisponível (vermelho) ou se estiver ocupado
                      return verificacao?.dotColor === 'red' || verificacao?.isOcupado === true;
                    }}
                  />
                </div>
                
                {/* Legenda de status */}
                {horariosVerificados.length > 0 && (
                  <div className="mt-2 text-xs text-gray-600">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>Presencial</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Online</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span>Indisponível</span>
                      </div>
                    </div>
                  </div>
                )}
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
                    const pacienteId = selected?.id || '';
                    const pacienteSelecionado = pacientes.find(p => p.id === pacienteId);
                    
                    // Auto-selecionar convênio do paciente se existir e for válido para o profissional
                    let convenioIdAutoSelecionado = pacienteSelecionado?.convenioId || '';
                    if (formData.profissionalId && convenioIdAutoSelecionado) {
                      const convenioValido = conveniosDoProfissional.some(c => c.id === convenioIdAutoSelecionado);
                      if (!convenioValido) {
                        convenioIdAutoSelecionado = '';
                      }
                    }
                    
                    // Só limpar servicoId se não havia um já selecionado (evita limpar pré-preenchimento)
                    const shouldClearServico = !formData.servicoId;
                    
                    updateFormData({ 
                      pacienteId,
                      convenioId: convenioIdAutoSelecionado,
                      ...(shouldClearServico && { servicoId: '' })
                    });
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
                    options={(formData.profissionalId ? conveniosDoProfissional : convenios).map(c => ({
                      id: c.id,
                      nome: c.nome,
                      sigla: undefined
                    }))}
                    selected={(formData.profissionalId ? conveniosDoProfissional : convenios).find(c => c.id === formData.convenioId) ? {
                      id: formData.convenioId,
                      nome: (formData.profissionalId ? conveniosDoProfissional : convenios).find(c => c.id === formData.convenioId)?.nome || '',
                      sigla: undefined
                    } : null}
                    onChange={(selected) => {
                      const novoConvenioId = selected?.id || '';
                      updateFormData({ 
                        convenioId: novoConvenioId,
                        servicoId: '',
                        recursoId: '',
                        tipoAtendimento: 'presencial' as TipoAtendimento
                      });
                    }}
                    placeholder={!formData.pacienteId ? "Selecione um paciente primeiro..." : loadingData ? "Carregando convênios..." : "Buscar convênio..."}
                    headerText={formData.pacienteId ? "Convênio (auto-selecionado, pode alterar)" : "Convênios disponíveis"}
                    formatOption={(option) => option.nome}
                    disabled={!formData.pacienteId || loadingData}
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
                    options={formData.convenioId ? (formData.profissionalId ? servicosDoProfissional : servicos)
                      .filter(s => s.convenioId === formData.convenioId)
                      .map(s => ({
                        id: s.id,
                        nome: s.nome,
                        sigla: s.duracaoMinutos ? `${s.duracaoMinutos} min` : undefined
                      })) : []}
                    selected={(formData.profissionalId ? servicosDoProfissional : servicos).find(s => s.id === formData.servicoId) ? {
                      id: formData.servicoId,
                      nome: (formData.profissionalId ? servicosDoProfissional : servicos).find(s => s.id === formData.servicoId)?.nome || '',
                      sigla: (formData.profissionalId ? servicosDoProfissional : servicos).find(s => s.id === formData.servicoId)?.duracaoMinutos ? `${(formData.profissionalId ? servicosDoProfissional : servicos).find(s => s.id === formData.servicoId)?.duracaoMinutos} min` : undefined
                    } : null}
                    onChange={(selected) => {
                      const novoServicoId = selected?.id || '';
                      
                      // Se está limpando o serviço, limpar campos dependentes
                      if (!novoServicoId) {
                        updateFormData({
                          servicoId: '',
                          recursoId: '',
                          tipoAtendimento: 'presencial' as TipoAtendimento
                        });
                        return;
                      }
                      
                      // Se está selecionando um serviço, só limpar recurso se não havia um pré-preenchido
                      const shouldClearResource = !formData.recursoId;
                      const shouldResetTipoAtendimento = formData.tipoAtendimento === 'presencial';
                      
                      
                      updateFormData({
                        servicoId: novoServicoId,
                        ...(shouldClearResource && { recursoId: '' }),
                        ...(shouldResetTipoAtendimento && { tipoAtendimento: 'presencial' as TipoAtendimento })
                      });
                    }}
                    placeholder={!formData.convenioId ? "Selecione um convênio primeiro..." : loadingData ? "Carregando serviços..." : "Buscar serviço..."}
                    headerText={formData.profissionalId ? "Serviços do profissional" : "Serviços disponíveis"}
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
                    options={formData.profissionalId ? recursos.map(r => {
                      const verificacao = recursosVerificados[r.id];
                      return {
                        id: r.id,
                        nome: r.nome,
                        sigla: verificacao && !verificacao.disponivel ? `Em uso: ${verificacao.ocupadoPor}` : undefined
                      };
                    }) : []}
                    selected={recursos.find(r => r.id === formData.recursoId) ? {
                      id: formData.recursoId,
                      nome: recursos.find(r => r.id === formData.recursoId)?.nome || '',
                      sigla: recursosVerificados[formData.recursoId] && !recursosVerificados[formData.recursoId].disponivel ? 
                        `Em uso: ${recursosVerificados[formData.recursoId].ocupadoPor}` : undefined
                    } : null}
                    onChange={(selected) => {
                      const recursoId = selected?.id || '';
                      
                      // Nova regra: só alterar tipo automaticamente se recurso for 'online'
                      // Permitir que usuário mantenha 'online' em recursos presenciais
                      const updates: any = { recursoId };
                      
                      if (selected) {
                        const recursoNome = selected.nome.toLowerCase();
                        if (recursoNome.includes('online')) {
                          // Recursos online sempre forçam tipo 'online'
                          updates.tipoAtendimento = 'online';
                        }
                        // Se recurso não é online, manter tipo atual (não forçar 'presencial')
                      } else {
                        // Se não há recurso selecionado, resetar para presencial
                        updates.tipoAtendimento = 'presencial';
                      }
                      
                      updateFormData(updates);
                    }}
                    placeholder={!formData.profissionalId ? "Selecione um profissional primeiro..." : loadingData ? "Carregando recursos..." : "Buscar recurso..."}
                    disabled={!formData.profissionalId || loadingData}
                    headerText="Recursos disponíveis"
                    formatOption={(option) => {
                      return option.sigla ? `${option.nome} - ${option.sigla}` : option.nome;
                    }}
                    getDotColor={(option) => {
                      const verificacao = recursosVerificados[option.id];
                      if (!verificacao) return 'blue';
                      return verificacao.disponivel ? 'green' : 'red';
                    }}
                    getDisabled={(option) => {
                      const verificacao = recursosVerificados[option.id];
                      return verificacao ? !verificacao.disponivel : false;
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
                      { id: 'presencial', nome: 'Presencial' },
                      { id: 'online', nome: 'Online' }
                    ] : []}
                    selected={formData.servicoId && formData.tipoAtendimento ? {
                      id: formData.tipoAtendimento,
                      nome: formData.tipoAtendimento === 'presencial' ? 'Presencial' : 'Online'
                    } : null}
                    onChange={(selected) => {
                      updateFormData({ tipoAtendimento: (selected?.id || 'presencial') as TipoAtendimento });
                    }}
                    placeholder={!formData.servicoId ? "Selecione um serviço primeiro..." : "Selecione o tipo..."}
                    headerText="Tipos de atendimento"
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
                  checked={state.temRecorrencia}
                  onCheckedChange={(checked) => context.updateTemRecorrencia(checked === true)}
                  className="border-2 border-purple-300"
                />
                <label htmlFor="temRecorrencia" className="text-sm font-semibold text-gray-700">
                  Criar agendamentos recorrentes
                </label>
              </div>

              {state.temRecorrencia && (
                <div className="space-y-4 bg-white rounded-lg p-4 border border-purple-200">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="text-lg">🔄</span>
                      Tipo de Recorrência
                    </label>
                    <SingleSelectDropdown
                      options={[
                        { id: 'semanal', nome: 'Semanal' },
                        { id: 'quinzenal', nome: 'Quinzenal' },
                        { id: 'mensal', nome: 'Mensal' }
                      ]}
                      selected={{
                        id: state.recorrencia.tipo,
                        nome: state.recorrencia.tipo === 'semanal' ? 'Semanal' : state.recorrencia.tipo === 'quinzenal' ? 'Quinzenal' : 'Mensal'
                      }}
                      onChange={(selected) => {
                        context.updateRecorrencia({ tipo: selected?.id as any || 'semanal' });
                      }}
                      placeholder="Selecione o tipo..."
                      headerText="Tipos de recorrência"
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
                        value={state.recorrencia.repeticoes}
                        onChange={(e) => context.updateRecorrencia({ repeticoes: parseInt(e.target.value) })}
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
                        value={state.recorrencia.ate}
                        onChange={(e) => context.updateRecorrencia({ ate: e.target.value })}
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
  );
}; 