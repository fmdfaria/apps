import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Clock, User, Users, Stethoscope, CreditCard, MapPin, Smartphone } from 'lucide-react';
import { OPCOES_HORARIOS } from '../utils/agendamento-constants';
import api from '@/services/api';
import { verificarProfissionaisDisponibilidade } from '@/services/verificacao-disponibilidade';
import { getProfissionais } from '@/services/profissionais';
import type { AgendamentoFormContext } from '../types/agendamento-form';
import type { TipoAtendimento } from '@/types/Agendamento';
import type { ProfissionalVerificado } from '@/services/verificacao-disponibilidade';
import type { Profissional } from '@/types/Profissional';

// Interface para profissionais disponíveis (simplificada)
interface ProfissionalDisponivel {
  id: string;
  nome: string;
  disponivel: boolean;
  tipo: 'presencial' | 'online' | 'indisponivel';
  motivo?: string;
}

interface FormularioPorDataProps {
  context: AgendamentoFormContext;
}

export const FormularioPorData: React.FC<FormularioPorDataProps> = ({ context }) => {
  const { state, dataState, loadingState, updateFormData, updateDataAgendamento, updateHoraAgendamento, carregarProfissionaisPorServico } = context;
  const { formData, dataAgendamento, horaAgendamento } = state;
  const { profissionais, pacientes, convenios, servicos, recursos, conveniosDoProfissional, servicosDoProfissional } = dataState;
  const { loadingData } = loadingState;

  // Estados para nova implementação limpa
  const [profissionaisDisponiveis, setProfissionaisDisponiveis] = useState<ProfissionalDisponivel[]>([]);
  const [carregandoProfissionaisDisponiveis, setCarregandoProfissionaisDisponiveis] = useState(false);
  const [recursosVerificados, setRecursosVerificados] = useState<{ [recursoId: string]: { disponivel: boolean, ocupadoPor?: string } }>({});
  const [todosProfissionais, setTodosProfissionais] = useState<Profissional[]>([]);

  // Função para carregar todos os profissionais se necessário
  const carregarTodosProfissionais = async () => {
    if (todosProfissionais.length > 0) return; // Já carregados
    
    try {
      console.log('🔄 Carregando todos os profissionais...');
      const lista = await getProfissionais({ ativo: true });
      setTodosProfissionais(lista);
      console.log('✅ Profissionais carregados:', lista.length);
    } catch (error) {
      console.error('❌ Erro ao carregar todos os profissionais:', error);
    }
  };

  // Função para buscar profissionais disponíveis quando data e hora são selecionadas
  const buscarProfissionaisDisponiveis = async () => {
    if (!dataAgendamento || !horaAgendamento) {
      setProfissionaisDisponiveis([]);
      return;
    }

    setCarregandoProfissionaisDisponiveis(true);
    try {
      // Primeiro, garantir que temos todos os profissionais carregados
      await carregarTodosProfissionais();
      
      // Usar todosProfissionais ao invés de profissionais (que pode estar vazio no fluxo por data)
      const listaProfissionais = todosProfissionais.length > 0 ? todosProfissionais : profissionais;
      
      if (listaProfissionais.length === 0) {
        console.warn('⚠️ Nenhum profissional disponível para verificar');
        setProfissionaisDisponiveis([]);
        return;
      }

      console.log('🔍 Verificando disponibilidade de', listaProfissionais.length, 'profissionais para', dataAgendamento, horaAgendamento);
      
      // Parse manual para evitar problemas de timezone
      const [ano, mes, dia] = dataAgendamento.split('-').map(Number);
      const dataObj = new Date(ano, mes - 1, dia); // mes é 0-indexed
      const profissionaisIds = listaProfissionais.map(p => p.id);
      const nomesProfissionais = listaProfissionais.reduce((acc, p) => {
        acc[p.id] = p.nome;
        return acc;
      }, {} as { [id: string]: string });
      
      // Usar a função existente mas de forma mais limpa
      const profissionaisVerificados = await verificarProfissionaisDisponibilidade(
        profissionaisIds, 
        dataObj, 
        horaAgendamento, 
        nomesProfissionais
      );
      
      // Converter para a interface simplificada
      const profissionaisSimplificados = profissionaisVerificados.map(pv => ({
        id: pv.profissionalId,
        nome: pv.nome,
        disponivel: pv.verificacao.status !== 'indisponivel' && !pv.verificacao.isOcupado,
        tipo: pv.verificacao.dotColor === 'green' ? 'online' as const : 
              pv.verificacao.dotColor === 'blue' ? 'presencial' as const : 
              'indisponivel' as const,
        motivo: pv.verificacao.motivo
      }));
      
      const disponiveis = profissionaisSimplificados.filter(p => p.disponivel).length;
      const indisponiveis = profissionaisSimplificados.filter(p => !p.disponivel).length;
      
      console.log('✅ Disponibilidade verificada:', {
        total: profissionaisSimplificados.length,
        disponíveis: disponiveis,
        indisponíveis: indisponiveis
      });
      setProfissionaisDisponiveis(profissionaisSimplificados);
    } catch (error) {
      console.error('❌ Erro ao buscar profissionais disponíveis:', error);
      setProfissionaisDisponiveis([]);
    } finally {
      setCarregandoProfissionaisDisponiveis(false);
    }
  };
  
  // Buscar profissionais quando data e hora mudarem
  useEffect(() => {
    buscarProfissionaisDisponiveis();
  }, [dataAgendamento, horaAgendamento]);

  // Aplicar regra do tipo de atendimento quando recursoId já estiver preenchido (modal pré-carregado)
  useEffect(() => {
    if (formData.recursoId && recursos.length > 0) {
      const recursoSelecionado = recursos.find(r => r.id === formData.recursoId);
      if (recursoSelecionado) {
        let tipoAtendimento: TipoAtendimento = 'presencial';
        const recursoNome = recursoSelecionado.nome.toLowerCase();
        if (recursoNome.includes('online')) {
          tipoAtendimento = 'online';
        } else {
          tipoAtendimento = 'presencial';
        }
        
        // Só atualizar se o tipo atual for diferente
        if (formData.tipoAtendimento !== tipoAtendimento) {
          updateFormData({ tipoAtendimento });
        }
      }
    }
  }, [formData.recursoId, recursos, formData.tipoAtendimento, updateFormData]);

  // Função simplificada para verificar recursos (manter lógica básica)
  const verificarRecursos = () => {
    if (!dataAgendamento || !horaAgendamento) {
      setRecursosVerificados({});
      return;
    }
    
    // Para agora, assumir que recursos online sempre disponíveis
    // e recursos presenciais precisam de verificação futura
    const verificacoes: { [recursoId: string]: { disponivel: boolean, ocupadoPor?: string } } = {};
    
    recursos.forEach(recurso => {
      if (recurso.nome.toLowerCase().includes('online')) {
        verificacoes[recurso.id] = { disponivel: true };
      } else {
        // Por enquanto, assumir disponível (futuramente integrar com API)
        verificacoes[recurso.id] = { disponivel: true };
      }
    });
    
    setRecursosVerificados(verificacoes);
  };
  
  // Verificar recursos quando data, hora ou recursos mudarem
  useEffect(() => {
    verificarRecursos();
  }, [dataAgendamento, horaAgendamento, recursos]);

  return (
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
                onChange={(e) => updateDataAgendamento(e.target.value)}
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
                  options={OPCOES_HORARIOS}
                  selected={OPCOES_HORARIOS.find(opcao => opcao.id === horaAgendamento) ? {
                    id: horaAgendamento,
                    nome: OPCOES_HORARIOS.find(opcao => opcao.id === horaAgendamento)?.nome || ''
                  } : null}
                  onChange={(selected) => {
                    updateHoraAgendamento(selected?.id || '');
                  }}
                  placeholder="Selecione..."
                  headerText="Horários disponíveis"
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
              {carregandoProfissionaisDisponiveis && (
                <div className="ml-2 flex items-center gap-1 text-xs text-gray-500">
                  <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  Verificando disponibilidade...
                </div>
              )}
            </h3>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Selecione o Profissional <span className="text-red-500">*</span>
              </label>
              <div className="w-full">
                <SingleSelectDropdown
                  options={profissionaisDisponiveis.length > 0 ? 
                    profissionaisDisponiveis
                      .sort((a, b) => {
                        // Primeiro, separar por disponibilidade (disponíveis primeiro)
                        if (a.disponivel && !b.disponivel) return -1;
                        if (!a.disponivel && b.disponivel) return 1;
                        
                        // Depois, ordenar alfabeticamente dentro de cada grupo
                        return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
                      })
                      .map(p => ({
                        id: p.id,
                        nome: p.nome,
                        sigla: undefined
                      })) :
                    (todosProfissionais.length > 0 ? todosProfissionais : profissionais)
                      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
                      .map(p => ({
                        id: p.id,
                        nome: p.nome,
                        sigla: 'Carregando disponibilidade...'
                      }))
                  }
                  selected={formData.profissionalId ? {
                    id: formData.profissionalId,
                    nome: (todosProfissionais.length > 0 ? todosProfissionais : profissionais).find(p => p.id === formData.profissionalId)?.nome || '',
                    sigla: profissionaisDisponiveis.find(p => p.id === formData.profissionalId)?.motivo || undefined
                  } : null}
                  onChange={(selected) => {
                    const profissionalId = selected?.id || '';
                    updateFormData({
                      profissionalId,
                      servicoId: '', // Limpar serviço quando trocar profissional
                      convenioId: '', // Limpar convênio quando trocar profissional
                      recursoId: '', // Limpar recurso quando trocar profissional
                      tipoAtendimento: 'presencial' as TipoAtendimento // Reset tipo de atendimento
                    });
                  }}
                  placeholder={carregandoProfissionaisDisponiveis ? "Verificando disponibilidade..." : loadingData ? "Carregando profissionais..." : "Selecione um profissional..."}
                  headerText="Profissionais disponíveis"
                  formatOption={(option) => option.nome}
                  getDisabled={(option) => {
                    if (profissionaisDisponiveis.length > 0) {
                      const profissionalInfo = profissionaisDisponiveis.find(p => p.id === option.id);
                      return profissionalInfo ? !profissionalInfo.disponivel : false;
                    }
                    return false;
                  }}
                />
              </div>
              
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl p-6 border border-gray-300 opacity-50">
            <h3 className="text-lg font-semibold text-gray-500 mb-4 flex items-center gap-2">
              <span className="text-xl">👨‍⚕️</span>
              2. Selecione o Profissional
            </h3>
            <p className="text-gray-500 text-sm">Selecione data e hora primeiro para ver profissionais disponíveis</p>
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
                    const pacienteId = selected?.id || '';
                    const pacienteSelecionado = pacientes.find(p => p.id === pacienteId);
                    
                    // Auto-selecionar convênio do paciente se existir
                    const convenioIdAutoSelecionado = pacienteSelecionado?.convenioId || '';
                    
                    updateFormData({ 
                      pacienteId,
                      convenioId: convenioIdAutoSelecionado, // Auto-selecionar convênio do paciente
                      servicoId: '' // Limpar serviço quando trocar paciente
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
                      const novoConvenioId = selected?.id || '';

                      // Se há paciente selecionado e não pertence ao novo convênio, limpar paciente
                      let pacienteIdAtual = formData.pacienteId;
                      if (pacienteIdAtual) {
                        const pacienteSel = pacientes.find(p => p.id === pacienteIdAtual);
                        if (pacienteSel?.convenioId !== novoConvenioId) {
                          pacienteIdAtual = '';
                        }
                      }

                      updateFormData({ 
                        convenioId: novoConvenioId,
                        ...(pacienteIdAtual === '' && { pacienteId: '' }),
                        servicoId: '', // Limpar serviço quando trocar convênio
                        recursoId: '', // Limpar recurso quando trocar convênio
                        tipoAtendimento: 'presencial' as TipoAtendimento // Reset tipo de atendimento
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
                      const newServiceId = selected?.id || '';
                      updateFormData({
                        servicoId: newServiceId,
                        recursoId: '', // Limpar recurso quando trocar serviço
                        tipoAtendimento: 'presencial' as TipoAtendimento // Reset tipo de atendimento
                      });
                      
                      // Carregar profissionais do serviço selecionado
                      if (newServiceId) {
                        carregarProfissionaisPorServico(newServiceId);
                      }
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
                  id="temRecorrenciaData"
                  checked={state.temRecorrencia}
                  onCheckedChange={(checked) => context.updateTemRecorrencia(checked === true)}
                  className="border-2 border-purple-300"
                />
                <label htmlFor="temRecorrenciaData" className="text-sm font-semibold text-gray-700">
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