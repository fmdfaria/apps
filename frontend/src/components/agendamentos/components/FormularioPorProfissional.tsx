import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Clock, User, Users, Stethoscope, CreditCard, MapPin, Smartphone } from 'lucide-react';
import { OPCOES_HORARIOS } from '../utils/agendamento-constants';
import { useVerificacaoAgendamento } from '@/hooks/useVerificacaoAgendamento';
import { getAgendamentos } from '@/services/agendamentos';
import { getAllDisponibilidades } from '@/services/disponibilidades';
import { getRecursosByDate, type RecursoComAgendamentos } from '@/services/recursos';
import type { AgendamentoFormContext } from '../types/agendamento-form';
import type { TipoAtendimento } from '@/types/Agendamento';
import type { DisponibilidadeProfissional } from '@/types/DisponibilidadeProfissional';

interface FormularioPorProfissionalProps {
  context: AgendamentoFormContext;
}

export const FormularioPorProfissional: React.FC<FormularioPorProfissionalProps> = ({ context }) => {
  const { state, dataState, loadingState, updateFormData, updateDataAgendamento, updateHoraAgendamento } = context;
  const { formData, dataAgendamento, horaAgendamento } = state;
  const { profissionais, pacientes, convenios, servicos, recursos, conveniosDoProfissional, servicosDoProfissional } = dataState;
  const { loadingData } = loadingState;

  // Estado para armazenar ocupações semanais dos profissionais
  const [ocupacoesSemana, setOcupacoesSemana] = useState<{ [profissionalId: string]: { ocupados: number, total: number, percentual: number } }>({});

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

  // Função para calcular ocupação semanal de um profissional
  const calcularOcupacaoSemanal = async (profissionalId: string, semanaData: Date): Promise<{ ocupados: number, total: number, percentual: number }> => {
    try {
      // Calcular primeiro e último dia da semana (segunda a domingo)
      const inicioDaSemana = new Date(semanaData);
      const diaSemana = inicioDaSemana.getDay();
      const diasParaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana; // Se domingo, volta 6 dias
      inicioDaSemana.setDate(inicioDaSemana.getDate() + diasParaSegunda);
      inicioDaSemana.setHours(0, 0, 0, 0);

      const fimDaSemana = new Date(inicioDaSemana);
      fimDaSemana.setDate(fimDaSemana.getDate() + 6);
      fimDaSemana.setHours(23, 59, 59, 999);

      // Buscar disponibilidades e agendamentos
      const [disponibilidades, agendamentos] = await Promise.all([
        getAllDisponibilidades(),
        getAgendamentos()
      ]);

      // Filtrar disponibilidades do profissional
      const disponibilidadesProfissional = disponibilidades.filter(d => d.profissionalId === profissionalId);
      
      // Calcular total de slots disponíveis na semana (em slots de 30 min)
      let totalSlotsDisponiveis = 0;
      
      for (let dia = new Date(inicioDaSemana); dia <= fimDaSemana; dia.setDate(dia.getDate() + 1)) {
        const diaSemanaNum = dia.getDay();
        
        // Verificar disponibilidades para este dia
        const disponibilidadesDoDia = disponibilidadesProfissional.filter(d => {
          // Data específica tem prioridade
          if (d.dataEspecifica) {
            const dataDisp = new Date(d.dataEspecifica);
            return dataDisp.getDate() === dia.getDate() && 
                   dataDisp.getMonth() === dia.getMonth() && 
                   dataDisp.getFullYear() === dia.getFullYear();
          }
          // Senão, usar dia da semana
          return d.diaSemana === diaSemanaNum;
        });

        // Somar slots disponíveis (apenas presencial e online)
        disponibilidadesDoDia.forEach(d => {
          if (d.tipo === 'presencial' || d.tipo === 'online') {
            const horaInicio = d.horaInicio.getHours() * 60 + d.horaInicio.getMinutes();
            const horaFim = d.horaFim.getHours() * 60 + d.horaFim.getMinutes();
            const slotsNoPeriodo = (horaFim - horaInicio) / 30; // Slots de 30 min
            totalSlotsDisponiveis += slotsNoPeriodo;
          }
        });
      }

      // Filtrar agendamentos do profissional na semana
      const agendamentosDaSemana = agendamentos.filter(agendamento => {
        if (agendamento.profissionalId !== profissionalId) return false;
        
        const dataAgendamento = new Date(agendamento.dataHoraInicio);
        return dataAgendamento >= inicioDaSemana && dataAgendamento <= fimDaSemana;
      });

      // Calcular slots ocupados (assumindo 30 min por agendamento como padrão)
      const slotsOcupados = agendamentosDaSemana.length; // Simplificado por agora

      // Calcular percentual
      const percentual = totalSlotsDisponiveis === 0 ? 0 : Math.round((slotsOcupados / totalSlotsDisponiveis) * 100);
      
      return {
        ocupados: slotsOcupados,
        total: totalSlotsDisponiveis,
        percentual
      };

    } catch (error) {
      console.error('Erro ao calcular ocupação semanal:', error);
      return { ocupados: 0, total: 0, percentual: 0 };
    }
  };

  // Calcular ocupações quando data for selecionada
  useEffect(() => {
    if (dataAgendamento && profissionais.length > 0) {
      const [ano, mes, dia] = dataAgendamento.split('-').map(Number);
      const dataObj = new Date(ano, mes - 1, dia);
      
      // Calcular ocupação para todos os profissionais
      Promise.all(
        profissionais.map(async (prof) => {
          const ocupacao = await calcularOcupacaoSemanal(prof.id, dataObj);
          return { id: prof.id, ocupacao };
        })
      ).then(resultados => {
        const ocupacoesMap = resultados.reduce((acc, { id, ocupacao }) => {
          acc[id] = ocupacao;
          return acc;
        }, {} as { [id: string]: { ocupados: number, total: number, percentual: number } });
        
        setOcupacoesSemana(ocupacoesMap);
      });
    }
  }, [dataAgendamento, profissionais]);

  // Função para verificar disponibilidade dos recursos
  const verificarDisponibilidadeRecursos = async () => {
    if (!dataAgendamento || !horaAgendamento || recursos.length === 0) {
      setRecursosVerificados({});
      return;
    }

    try {
      // Usar a nova API que já retorna os recursos com seus agendamentos
      const recursosComAgendamentos = await getRecursosByDate(dataAgendamento);
      
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
            ocupadoPor: agendamentoConflitante.pacienteNome || 'Paciente não identificado'
          };
        } else {
          verificacoes[recurso.id] = { disponivel: true };
        }
      });
      
      setRecursosVerificados(verificacoes);
    } catch (error) {
      console.error('Erro ao verificar disponibilidade dos recursos:', error);
      setRecursosVerificados({});
    }
  };

  // Verificar recursos quando data, hora ou recursos mudarem
  useEffect(() => {
    verificarDisponibilidadeRecursos();
  }, [dataAgendamento, horaAgendamento, recursos]);

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
                  updateFormData({
                    profissionalId,
                    servicoId: '', // Limpar serviço quando trocar profissional
                    convenioId: '', // Limpar convênio quando trocar profissional
                    recursoId: '', // Limpar recurso quando trocar profissional
                    tipoAtendimento: 'presencial' as TipoAtendimento // Reset tipo de atendimento
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
                  min={new Date().toISOString().split('T')[0]}
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
                    options={horariosVerificados.length > 0 ? 
                      horariosVerificados.map(({ horario, verificacao }) => ({
                        id: horario,
                        nome: horario,
                        sigla: undefined
                      })) : 
                      OPCOES_HORARIOS
                    }
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
                      if (horariosVerificados.length > 0) {
                        const horarioInfo = horariosVerificados.find(h => h.horario === option.id);
                        return horarioInfo?.verificacao.dotColor || 'blue';
                      }
                      return 'blue';
                    }}
                    getDisabled={(option) => {
                      if (horariosVerificados.length > 0) {
                        const horarioInfo = horariosVerificados.find(h => h.horario === option.id);
                        const verificacao = horarioInfo?.verificacao;
                        // Desabilitar apenas se for indisponível (vermelho) ou se estiver ocupado
                        return verificacao?.dotColor === 'red' || verificacao?.isOcupado === true;
                      }
                      return false;
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
                    updateFormData({ pacienteId: selected?.id || '' });
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
                    options={formData.profissionalId ? conveniosDoProfissional.map(c => ({
                      id: c.id,
                      nome: c.nome,
                      sigla: undefined
                    })) : convenios.map(c => ({
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
                      updateFormData({ 
                        convenioId: selected?.id || '',
                        servicoId: '', // Limpar serviço quando trocar convênio
                        recursoId: '', // Limpar recurso quando trocar convênio
                        tipoAtendimento: 'presencial' as TipoAtendimento // Reset tipo de atendimento
                      });
                    }}
                    placeholder={loadingData ? "Carregando convênios..." : "Buscar convênio..."}
                    headerText={formData.profissionalId ? "Convênios do profissional" : "Convênios disponíveis"}
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
                      updateFormData({
                        servicoId: selected?.id || '',
                        recursoId: '', // Limpar recurso quando trocar serviço
                        tipoAtendimento: 'presencial' as TipoAtendimento // Reset tipo de atendimento
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
                    options={formData.servicoId ? recursos.map(r => {
                      const verificacao = recursosVerificados[r.id];
                      return {
                        id: r.id,
                        nome: r.nome,
                        sigla: verificacao && !verificacao.disponivel ? `Ocupado: ${verificacao.ocupadoPor}` : undefined
                      };
                    }) : []}
                    selected={recursos.find(r => r.id === formData.recursoId) ? {
                      id: formData.recursoId,
                      nome: recursos.find(r => r.id === formData.recursoId)?.nome || '',
                      sigla: recursosVerificados[formData.recursoId] && !recursosVerificados[formData.recursoId].disponivel ? 
                        `Ocupado: ${recursosVerificados[formData.recursoId].ocupadoPor}` : undefined
                    } : null}
                    onChange={(selected) => {
                      const recursoId = selected?.id || '';
                      
                      // Regra de negócio: definir tipo de atendimento baseado no recurso
                      let tipoAtendimento: TipoAtendimento = 'presencial';
                      if (selected) {
                        const recursoNome = selected.nome.toLowerCase();
                        if (recursoNome.includes('online')) {
                          tipoAtendimento = 'online';
                        } else {
                          tipoAtendimento = 'presencial';
                        }
                      }
                      
                      updateFormData({ 
                        recursoId,
                        tipoAtendimento 
                      });
                    }}
                    placeholder={!formData.servicoId ? "Selecione um serviço primeiro..." : loadingData ? "Carregando recursos..." : "Buscar recurso..."}
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