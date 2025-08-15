import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, Save, X, ArrowLeft, Repeat, AlertTriangle, User, FileText, CheckCircle, XCircle } from 'lucide-react';
import { OPCOES_HORARIOS } from '../utils/agendamento-constants';
import { useVerificacaoAgendamento } from '@/hooks/useVerificacaoAgendamento';
import { verificarConflitosRecorrencia, type ConflitosRecorrencia } from '@/services/verificacao-disponibilidade-recorrencia';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import type { Agendamento } from '@/types/Agendamento';
import { AppToast } from '@/services/toast';
import api from '@/services/api';

interface EditarAgendamentoModalProps {
  isOpen: boolean;
  agendamento: Agendamento | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditarAgendamentoModal: React.FC<EditarAgendamentoModalProps> = ({
  isOpen,
  agendamento,
  onClose,
  onSuccess,
}) => {
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [horaAgendamento, setHoraAgendamento] = useState('');
  const [saving, setSaving] = useState(false);
  const [tipoEdicao, setTipoEdicao] = useState<'individual' | 'serie'>('individual');
  const [agendamentosRelacionados, setAgendamentosRelacionados] = useState<Agendamento[]>([]);
  const [loadingAgendamentosRelacionados, setLoadingAgendamentosRelacionados] = useState(false);
  const [isAgendamentoPassado, setIsAgendamentoPassado] = useState(false);

  // Estados para modal de conflitos de recorrência
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflitosRecorrencia, setConflitosRecorrencia] = useState<ConflitosRecorrencia | null>(null);

  // Hook para verificação de disponibilidade
  const {
    carregandoHorarios,
    horariosVerificados,
    verificarHorarios
  } = useVerificacaoAgendamento();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && agendamento) {
      // Extract date and time from agendamento
      const [datePart, timePart] = agendamento.dataHoraInicio.split('T');
      const [hora, minuto] = timePart.split(':');
      
      setDataAgendamento(datePart);
      setHoraAgendamento(`${hora}:${minuto}`);
      setTipoEdicao('individual');
      
      // Verificar se o agendamento já passou (data e hora completa)
      const dataHoraAgendamento = new Date(agendamento.dataHoraInicio);
      const agora = new Date();
      const isPassado = dataHoraAgendamento < agora;
      setIsAgendamentoPassado(isPassado);
      
      // Se for agendamento passado, forçar tipo individual
      if (isPassado) {
        setTipoEdicao('individual');
      }
      
      // Buscar agendamentos relacionados (mesmo profissional, paciente, serviço e horário)
      buscarAgendamentosRelacionados(agendamento);
    } else {
      setDataAgendamento('');
      setHoraAgendamento('');
      setTipoEdicao('individual');
      setAgendamentosRelacionados([]);
      setIsAgendamentoPassado(false);
    }
  }, [isOpen, agendamento]);

  // Função para buscar agendamentos que podem ser parte da mesma série
  const buscarAgendamentosRelacionados = async (agendamento: Agendamento) => {
    setLoadingAgendamentosRelacionados(true);
    try {
      // Buscar agendamentos futuros com mesmo profissional, paciente e serviço
      const response = await api.get('/agendamentos', {
        params: {
          profissionalId: agendamento.profissionalId,
          pacienteId: agendamento.pacienteId,
          servicoId: agendamento.servicoId,
          dataInicio: agendamento.dataHoraInicio.split('T')[0],
          status: 'AGENDADO'
        }
      });
      
      const agendamentos = response.data.filter((ag: Agendamento) => 
        ag.id !== agendamento.id && 
        new Date(ag.dataHoraInicio) > new Date(agendamento.dataHoraInicio)
      );
      
      setAgendamentosRelacionados(agendamentos);
    } catch (error) {
      console.error('Erro ao buscar agendamentos relacionados:', error);
      setAgendamentosRelacionados([]);
    } finally {
      setLoadingAgendamentosRelacionados(false);
    }
  };

  // Verificar horários quando profissional e data estiverem selecionados
  useEffect(() => {
    if (agendamento?.profissionalId && dataAgendamento) {
      // Parse manual para evitar problemas de timezone
      const [ano, mes, dia] = dataAgendamento.split('-').map(Number);
      const dataObj = new Date(ano, mes - 1, dia); // mes é 0-indexed
      verificarHorarios(agendamento.profissionalId, dataObj);
    }
  }, [agendamento?.profissionalId, dataAgendamento, verificarHorarios]);

  const handleSave = async () => {
    if (!agendamento || !dataAgendamento || !horaAgendamento) {
      AppToast.error('Erro de validação', {
        description: 'Todos os campos são obrigatórios.'
      });
      return;
    }

    // Check if trying to edit a past appointment as series
    if (isAgendamentoPassado && tipoEdicao === 'serie') {
      AppToast.error('Operação não permitida', {
        description: 'Não é permitido alterar recorrência de agendamentos passados.'
      });
      return;
    }

    // Check if the selected date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(dataAgendamento);
    
    if (selectedDate < today) {
      AppToast.error('Data inválida', {
        description: 'Não é possível editar agendamentos para datas passadas.'
      });
      return;
    }

    setSaving(true);
    
    try {
      // Build the new datetime string
      const novaDataHora = `${dataAgendamento}T${horaAgendamento}:00.000Z`;
      
      if (tipoEdicao === 'individual') {
        // Editar apenas o agendamento atual
        await api.put(`/agendamentos/${agendamento.id}`, {
          dataHoraInicio: novaDataHora,
          // Include other required fields that shouldn't change
          pacienteId: agendamento.pacienteId,
          profissionalId: agendamento.profissionalId,
          servicoId: agendamento.servicoId,
          convenioId: agendamento.convenioId,
          recursoId: agendamento.recursoId,
          tipoAtendimento: agendamento.tipoAtendimento,
          status: agendamento.status
        });
      } else {
        // Verificar conflitos antes de editar toda a série
        const agendamentosParaEditar = [agendamento.id, ...agendamentosRelacionados.map(ag => ag.id)];
        
        // Calcular as novas datas mantendo o intervalo entre elas
        const dataOriginal = new Date(agendamento.dataHoraInicio);
        const novaData = new Date(novaDataHora);
        const diferencaDias = Math.floor((novaData.getTime() - dataOriginal.getTime()) / (1000 * 60 * 60 * 24));
        
        // Gerar recorrência simulada para verificação
        const tipoRecorrencia = agendamentosRelacionados.length > 0 ? 'semanal' : 'semanal'; // Assumir semanal por padrão
        const recorrenciaSimulada = {
          tipo: tipoRecorrencia as 'semanal' | 'quinzenal' | 'mensal',
          repeticoes: agendamentosParaEditar.length
        };

        try {
          // Verificar conflitos para a série
          const conflitos = await verificarConflitosRecorrencia(
            agendamento.profissionalId,
            agendamento.recursoId,
            novaDataHora,
            recorrenciaSimulada
          );

          if (conflitos.totalConflitos > 0) {
            // Se há conflitos, mostrar modal e BLOQUEAR edição
            setConflitosRecorrencia(conflitos);
            setShowConflictModal(true);
            setSaving(false);
            return; // PARAR EXECUÇÃO - não editar nada
          }
        } catch (error) {
          console.error('Erro ao verificar conflitos na edição da série:', error);
          AppToast.error('Erro ao verificar disponibilidade', {
            description: 'Não foi possível verificar conflitos. Tente novamente.'
          });
          setSaving(false);
          return;
        }

        // Se não há conflitos, prosseguir com edição da série
        const promises = agendamentosParaEditar.map(async (agendamentoId, index) => {
          const agendamentoAlvo = index === 0 ? agendamento : agendamentosRelacionados[index - 1];
          const dataOriginalAlvo = new Date(agendamentoAlvo.dataHoraInicio);
          const novaDataAlvo = new Date(dataOriginalAlvo);
          novaDataAlvo.setDate(novaDataAlvo.getDate() + diferencaDias);
          
          // Aplicar a nova hora para TODOS os agendamentos da série
          novaDataAlvo.setHours(novaData.getHours(), novaData.getMinutes(), 0, 0);
          
          return api.put(`/agendamentos/${agendamentoId}`, {
            dataHoraInicio: novaDataAlvo.toISOString(),
            pacienteId: agendamentoAlvo.pacienteId,
            profissionalId: agendamentoAlvo.profissionalId,
            servicoId: agendamentoAlvo.servicoId,
            convenioId: agendamentoAlvo.convenioId,
            recursoId: agendamentoAlvo.recursoId,
            tipoAtendimento: agendamentoAlvo.tipoAtendimento,
            status: agendamentoAlvo.status
          });
        });
        
        await Promise.all(promises);
      }

      AppToast.success(
        tipoEdicao === 'individual' ? 'Agendamento atualizado' : 'Série de agendamentos atualizada',
        {
          description: tipoEdicao === 'individual' 
            ? 'O agendamento foi atualizado com sucesso.' 
            : `${agendamentosRelacionados.length + 1} agendamentos foram atualizados com sucesso.`
        }
      );
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao atualizar agendamento:', error);
      AppToast.error('Erro ao atualizar', {
        description: error?.response?.data?.message || 'Ocorreu um erro ao atualizar o agendamento.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  // Função para fechar modal de conflitos
  const handleConflictModalClose = () => {
    setShowConflictModal(false);
    setConflitosRecorrencia(null);
    // O usuário permanece no formulário para ajustar data/hora
  };

  // Funções para status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'AGENDADO':
        return <Calendar className="w-3 h-3" />;
      case 'LIBERADO':
        return <CheckCircle className="w-3 h-3" />;
      case 'ATENDIDO':
        return <User className="w-3 h-3" />;
      case 'FINALIZADO':
        return <CheckCircle className="w-3 h-3" />;
      case 'CANCELADO':
        return <XCircle className="w-3 h-3" />;
      default:
        return <AlertTriangle className="w-3 h-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AGENDADO':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'LIBERADO':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'ATENDIDO':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'FINALIZADO':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'CANCELADO':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (!agendamento) return null;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 -mx-6 -mt-6 px-6 pt-6 pb-4 border-b border-gray-200">
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-2xl">✏️</span>
            Editar Agendamento
            {saving && (
              <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Salvando...
              </div>
            )}
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            Altere apenas a data e hora do agendamento
          </p>
        </DialogHeader>

        <div className="mt-4 space-y-6">
          {/* Informações do Agendamento (Read-only) */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                Informações do Agendamento
              </div>
              <Badge className={`${getStatusColor(agendamento.status)} flex items-center gap-1 text-xs`}>
                {getStatusIcon(agendamento.status)}
                {agendamento.status}
              </Badge>
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Coluna 1: Pessoas */}
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Pessoas
                </h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-gray-600">Paciente:</span>
                    <p className="font-medium text-gray-800">{agendamento.pacienteNome}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Profissional:</span>
                    <p className="font-medium text-gray-800">{agendamento.profissionalNome}</p>
                  </div>
                </div>
              </div>

              {/* Coluna 2: Serviço e Local */}
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Serviço
                </h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-gray-600">Tipo:</span>
                    <p className="font-medium text-gray-800">{agendamento.servicoNome}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Local:</span>
                    <p className="font-medium text-gray-800 flex items-center gap-1">
                      {agendamento.tipoAtendimento === 'online' ? '💻' : '🏥'}
                      {agendamento.recursoNome || agendamento.tipoAtendimento}
                    </p>
                  </div>
                </div>
              </div>

              {/* Coluna 3: Data e Convênio */}
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Detalhes
                </h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-gray-600">Data Atual:</span>
                    <p className="font-medium text-gray-800">
                      {new Date(agendamento.dataHoraInicio).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Horário Atual:</span>
                    <p className="font-medium text-gray-800">
                      {new Date(agendamento.dataHoraInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Convênio:</span>
                    <p className="font-medium text-gray-800">{agendamento.convenioNome}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Layout Otimizado: Recorrência (40%) e Data/Hora (60%) na mesma linha */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Opções de Edição (sempre mostrar) - 40% */}
            <div className="lg:col-span-2 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200">
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Repeat className="w-5 h-5" />
                Editar Recorrência
              </h3>
              
              {agendamentosRelacionados.length > 0 ? (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Encontramos {agendamentosRelacionados.length} agendamento(s) futuro(s) com as mesmas características.
                  </p>
                  
                  <RadioGroup value={tipoEdicao} onValueChange={(value: 'individual' | 'serie') => setTipoEdicao(value)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="individual" id="individual" />
                      <Label htmlFor="individual" className="text-sm">
                        Apenas este agendamento
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value="serie" 
                        id="serie" 
                        disabled={isAgendamentoPassado}
                      />
                      <Label 
                        htmlFor="serie" 
                        className={`text-sm ${isAgendamentoPassado ? 'text-gray-400 cursor-not-allowed' : ''}`}
                        title={isAgendamentoPassado ? 'Não é permitido alterar recorrência de agendamentos passados' : ''}
                      >
                        Toda a série ({agendamentosRelacionados.length + 1} agendamentos)
                      </Label>
                    </div>
                  </RadioGroup>
                </>
              ) : (
                <p className="text-sm text-gray-600">
                  Este agendamento não possui recorrências relacionadas. Apenas este agendamento será editado.
                </p>
              )}
            </div>

            {/* Campos Editáveis - 60% */}
            <div className="lg:col-span-3 bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <span className="text-xl">📅</span>
                Alterar Data e Hora
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
                      setHoraAgendamento(selected?.id || '');
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
          </div>

        </div>

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={saving}
            className="border-2 border-gray-300 text-gray-700 hover:border-red-400 hover:bg-red-50 hover:text-red-700 font-semibold px-6"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !dataAgendamento || !horaAgendamento}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl font-semibold px-8"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Salvando...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Salvar Alterações
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modal de conflitos de recorrência */}
    <ConfirmationDialog
      open={showConflictModal}
      onClose={handleConflictModalClose}
      type="error"
      title="Conflitos de Disponibilidade Detectados"
      description={`🚫 **ATENÇÃO:** Não é possível editar a série de agendamentos com conflitos. Foram encontrados ${conflitosRecorrencia?.totalConflitos || 0} conflito(s) em ${conflitosRecorrencia?.totalDatas || 0} agendamento(s).`}
      details={[
        // Cabeçalho da tabela
        '| Data | Hora | Paciente Agendado | Serviço |',
        '|------|------|-------------------|---------|',
        // Linhas da tabela
        ...(conflitosRecorrencia?.datasComConflito?.map(conflito => {
          const dataFormatada = new Date(conflito.data + 'T00:00:00').toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit'
          });
          const paciente = conflito.agendamentoConflitante?.pacienteNome || '-';
          const servico = conflito.agendamentoConflitante?.servicoNome || 
                        (conflito.tipo === 'indisponivel' ? conflito.motivo : '-');
          
          return `| ${dataFormatada} | ${conflito.hora} | ${paciente} | ${servico} |`;
        }) || [])
      ]}
      actions={[
        {
          label: "Entendi, vou ajustar",
          onClick: handleConflictModalClose,
          className: "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl font-semibold px-6 transition-all duration-200"
        }
      ]}
      defaultActions={false}
      showCloseButton={true}
      maxWidth="4xl"
    />
    </>
  );
};