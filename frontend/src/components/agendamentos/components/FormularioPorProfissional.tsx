import React, { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Clock, User, Users, Stethoscope, CreditCard, MapPin, Smartphone } from 'lucide-react';
import { OPCOES_HORARIOS } from '../utils/agendamento-constants';
import { useVerificacaoAgendamento } from '@/hooks/useVerificacaoAgendamento';
import type { AgendamentoFormContext } from '../types/agendamento-form';

interface FormularioPorProfissionalProps {
  context: AgendamentoFormContext;
}

export const FormularioPorProfissional: React.FC<FormularioPorProfissionalProps> = ({ context }) => {
  const { state, dataState, loadingState, updateFormData, updateDataAgendamento, updateHoraAgendamento } = context;
  const { formData, dataAgendamento, horaAgendamento } = state;
  const { profissionais, pacientes, convenios, servicos, recursos, conveniosDoProfissional, servicosDoProfissional } = dataState;
  const { loadingData } = loadingState;

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
                  sigla: undefined
                }))}
                selected={profissionais.find(p => p.id === formData.profissionalId) ? {
                  id: formData.profissionalId,
                  nome: profissionais.find(p => p.id === formData.profissionalId)?.nome || '',
                  sigla: undefined
                } : null}
                onChange={(selected) => {
                  const profissionalId = selected?.id || '';
                  updateFormData({
                    profissionalId,
                    servicoId: '', // Limpar serviço quando trocar profissional
                    convenioId: '', // Limpar convênio quando trocar profissional
                    recursoId: '', // Limpar recurso quando trocar profissional
                    tipoAtendimento: 'presencial' // Reset tipo de atendimento
                  });
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
                        return horarioInfo?.verificacao.dotColor || 'green';
                      }
                      return 'green';
                    }}
                    getDisabled={(option) => {
                      if (horariosVerificados.length > 0) {
                        const horarioInfo = horariosVerificados.find(h => h.horario === option.id);
                        const dotColor = horarioInfo?.verificacao.dotColor || 'green';
                        // Desabilitar se for vermelho (indisponível) ou azul (ocupado)
                        return dotColor === 'red' || dotColor === 'blue';
                      }
                      return false;
                    }}
                    disabled={!dataAgendamento || carregandoHorarios}
                  />
                </div>
                
                {/* Legenda de status */}
                {horariosVerificados.length > 0 && (
                  <div className="mt-2 text-xs text-gray-600">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Disponível</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>Ocupado</span>
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
                        tipoAtendimento: 'presencial' // Reset tipo de atendimento
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
                        tipoAtendimento: 'presencial' // Reset tipo de atendimento
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
                      updateFormData({ recursoId: selected?.id || '' });
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
                      updateFormData({ tipoAtendimento: selected?.id as any || 'presencial' });
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
                        { id: 'semanal', nome: 'Semanal', sigla: '7 dias' },
                        { id: 'quinzenal', nome: 'Quinzenal', sigla: '15 dias' },
                        { id: 'mensal', nome: 'Mensal', sigla: '30 dias' }
                      ]}
                      selected={{
                        id: state.recorrencia.tipo,
                        nome: state.recorrencia.tipo === 'semanal' ? 'Semanal' : state.recorrencia.tipo === 'quinzenal' ? 'Quinzenal' : 'Mensal',
                        sigla: state.recorrencia.tipo === 'semanal' ? '7 dias' : state.recorrencia.tipo === 'quinzenal' ? '15 dias' : '30 dias'
                      }}
                      onChange={(selected) => {
                        context.updateRecorrencia({ tipo: selected?.id as any || 'semanal' });
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