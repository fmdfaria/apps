import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, Save, X, ArrowLeft, Repeat, AlertTriangle, User, FileText, CheckCircle, XCircle, UserCheck, CreditCard, Monitor, MapPin } from 'lucide-react';
import { OPCOES_HORARIOS } from '../utils/agendamento-constants';
import { useVerificacaoAgendamento } from '@/hooks/useVerificacaoAgendamento';
import { verificarConflitosRecorrencia, verificarConflitosParaDatas, type ConflitosRecorrencia } from '@/services/verificacao-disponibilidade-recorrencia';
import { getDisponibilidadesProfissional } from '@/services/disponibilidades';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import type { Agendamento } from '@/types/Agendamento';
import { AppToast } from '@/services/toast';
import api from '@/services/api';
import { formatarDatasEmMensagem } from '@/utils/dateUtils';

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
  const [disponibilidades, setDisponibilidades] = useState<any[]>([]);

  // Hook para verificação de disponibilidade
  const {
    carregandoHorarios,
    horariosVerificados,
    verificarHorarios
  } = useVerificacaoAgendamento();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && agendamento) {
      // Extrair data e hora considerando o fuso local (sem converter para UTC)
      const dt = new Date(agendamento.dataHoraInicio);
      const pad2 = (n: number) => n.toString().padStart(2, '0');
      const localDate = `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
      const localTime = `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
      setDataAgendamento(localDate);
      setHoraAgendamento(localTime);
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
      // Suporta formato paginado (result.data) e formato antigo (array direto)
      const result = response.data as any;
      const lista: Agendamento[] = Array.isArray(result) ? result : (result?.data ?? []);
      // Considerar recorrência apenas com MESMA HORA (HH:mm) do agendamento original
      const horaChave = agendamento.dataHoraInicio.split('T')[1]?.substring(0,5);
      const agendamentos = lista.filter((ag: Agendamento) => {
        if (ag.id === agendamento.id) return false;
        const mesmaHora = ag.dataHoraInicio.split('T')[1]?.substring(0,5) === horaChave;
        return mesmaHora && new Date(ag.dataHoraInicio) > new Date(agendamento.dataHoraInicio);
      });
      
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

  // Carregar disponibilidades quando agendamento mudar
  useEffect(() => {
    if (agendamento?.profissionalId) {
      const carregarDisponibilidades = async () => {
        try {
          const lista = await getDisponibilidadesProfissional(agendamento.profissionalId);
          setDisponibilidades(lista || []);
        } catch (error) {
          console.error('Erro ao carregar disponibilidades:', error);
          setDisponibilidades([]);
        }
      };
      carregarDisponibilidades();
    }
  }, [agendamento?.profissionalId]);

  // Função para validar se o recurso está conforme a disponibilidade cadastrada
  const validarRecursoConformeDisponibilidade = async (
    profissionalId: string, 
    recursoId: string, 
    dataHoraCompleta: string
  ): Promise<boolean> => {
    if (!disponibilidades.length) return true; // Se não há disponibilidades, aceita qualquer recurso

    // Extrair data e hora
    const [data, hora] = dataHoraCompleta.split('T');
    const dataObj = new Date(data + 'T00:00:00');
    const diaSemana = dataObj.getDay();
    const [horaNum, minutoNum] = hora.split(':').map(Number);
    const horarioMinutos = horaNum * 60 + minutoNum;

    // Buscar disponibilidades do profissional
    const disponibilidadesProfissional = disponibilidades.filter(disp => {
      const dispProfissionalId = disp.profissionalId ?? disp.profissional_id;
      if (dispProfissionalId !== profissionalId) return false;
      
      // Verificar se é para data específica
      const dataEspecifica = disp.dataEspecifica ?? disp.data_especifica;
      if (dataEspecifica) {
        const dataDisp = new Date(dataEspecifica);
        return dataDisp.getFullYear() === dataObj.getFullYear() &&
               dataDisp.getMonth() === dataObj.getMonth() &&
               dataDisp.getDate() === dataObj.getDate();
      }
      
      // Verificar se é para dia da semana
      const diaSemanaDisp = (disp.diaSemana ?? disp.dia_semana);
      if (diaSemanaDisp !== null && diaSemanaDisp !== undefined) {
        return diaSemanaDisp === diaSemana;
      }
      
      return false;
    });

    // Verificar se existe uma disponibilidade com o recurso selecionado no horário específico
    const disponibilidadeComRecurso = disponibilidadesProfissional.find(disp => {
      const dispRecursoId = disp.recursoId ?? disp.recurso_id;
      if (dispRecursoId !== recursoId) return false;
      
      const horaInicioRaw = disp.horaInicio ?? disp.hora_inicio;
      const horaFimRaw = disp.horaFim ?? disp.hora_fim;
      if (horaInicioRaw && horaFimRaw) {
        let horaInicioDisp, horaFimDisp;
        
        // Tratar diferentes formatos de horário (mesmo código da auto-seleção)
        if (typeof horaInicioRaw === 'string' && horaInicioRaw.includes('T')) {
          const dataInicio = new Date(horaInicioRaw);
          const dataFim = new Date(horaFimRaw as any);
          horaInicioDisp = dataInicio.getHours() * 60 + dataInicio.getMinutes();
          horaFimDisp = dataFim.getHours() * 60 + dataFim.getMinutes();
        }
        else if (typeof horaInicioRaw === 'object' && (horaInicioRaw as any).getHours) {
          horaInicioDisp = (horaInicioRaw as Date).getHours() * 60 + (horaInicioRaw as Date).getMinutes();
          horaFimDisp = (horaFimRaw as Date).getHours() * 60 + (horaFimRaw as Date).getMinutes();
        } 
        else if (typeof horaInicioRaw === 'string' && horaInicioRaw.includes(':')) {
          const [hI, mI] = (horaInicioRaw as string).split(':').map(Number);
          const [hF, mF] = (horaFimRaw as string).split(':').map(Number);
          horaInicioDisp = hI * 60 + mI;
          horaFimDisp = hF * 60 + mF;
        }
        else {
          return false;
        }
        
        // Verificar se o horário está dentro do intervalo
        return horarioMinutos >= horaInicioDisp && horarioMinutos < horaFimDisp;
      }
      
      return false;
    });

    return !!disponibilidadeComRecurso; // Retorna true se encontrou a disponibilidade, false se não encontrou
  };

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
    // Parse manual da data YYYY-MM-DD para evitar interpretação UTC
    const [selYear, selMonth, selDay] = dataAgendamento.split('-').map(Number);
    const selectedDate = new Date(selYear, selMonth - 1, selDay, 0, 0, 0, 0);
    
    if (selectedDate < today) {
      AppToast.error('Data inválida', {
        description: 'Não é possível editar agendamentos para datas passadas.'
      });
      return;
    }

    setSaving(true);
    
    try {
      // Helpers para construir string com offset local (ex: -03:00)
      const pad2 = (n: number) => n.toString().padStart(2, '0');
      const buildOffsetFromDate = (d: Date) => {
        const year = d.getFullYear();
        const month = pad2(d.getMonth() + 1);
        const day = pad2(d.getDate());
        const hour = pad2(d.getHours());
        const minute = pad2(d.getMinutes());
        const offsetMinutes = -d.getTimezoneOffset();
        const sign = offsetMinutes >= 0 ? '+' : '-';
        const abs = Math.abs(offsetMinutes);
        const offHH = pad2(Math.floor(abs / 60));
        const offMM = pad2(abs % 60);
        return `${year}-${month}-${day}T${hour}:${minute}:00.000${sign}${offHH}:${offMM}`;
      };
      const buildOffsetFromParts = (dateStr: string, timeStr: string) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const [hh, mm] = timeStr.split(':').map(Number);
        const localDate = new Date(y, m - 1, d, hh, mm, 0, 0);
        return buildOffsetFromDate(localDate);
      };

      // Montar a nova data/hora preservando o horário local com offset
      const novaDataHora = buildOffsetFromParts(dataAgendamento, horaAgendamento);
      
      if (tipoEdicao === 'individual') {
        // Validação de recurso x disponibilidade usando formato simples
        const dataHoraCombinada = `${dataAgendamento}T${horaAgendamento}`;
        const recursoConforme = await validarRecursoConformeDisponibilidade(
          agendamento.profissionalId, 
          agendamento.recursoId, 
          dataHoraCombinada
        );

        if (!recursoConforme) {
          AppToast.error('Conflito no agendamento', {
            description: 'Profissional não atende neste horário.'
          });
          setSaving(false);
          return;
        }

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
          status: agendamento.status,
          // Informar ao backend que é edição individual de recorrência
          tipoEdicaoRecorrencia: 'apenas_esta'
        });
      } else {
        // Verificar conflitos antes de editar toda a série
        const agendamentosParaEditar = [agendamento.id, ...agendamentosRelacionados.map(ag => ag.id)];
        
        // Calcular as novas datas mantendo o intervalo entre elas
        const dataOriginal = new Date(agendamento.dataHoraInicio);
        const novaData = new Date(novaDataHora);
        const diferencaDias = Math.floor((novaData.getTime() - dataOriginal.getTime()) / (1000 * 60 * 60 * 24));
        
        try {
          // Construir as datas alvo exatas da série mantendo offsets locais
          const datasAlvoISO = agendamentosParaEditar.map((_, index) => {
            const origem = index === 0 ? agendamento : agendamentosRelacionados[index - 1];
            const dataOrigem = new Date(origem.dataHoraInicio);
            const destino = new Date(dataOrigem);
            destino.setDate(destino.getDate() + diferencaDias);
            destino.setHours(novaData.getHours(), novaData.getMinutes(), 0, 0);
            return buildOffsetFromDate(destino);
          });

          // Verificar conflitos para todas as datas alvo da série
          const conflitos = await verificarConflitosParaDatas(
            agendamento.profissionalId,
            agendamento.recursoId,
            datasAlvoISO,
            agendamento.pacienteId
          );

          if (conflitos.totalConflitos > 0) {
            // Se há conflitos, mostrar toast resumido e modal detalhado; BLOQUEAR edição
            const primeiro = conflitos.datasComConflito[0];
            AppToast.error('Conflitos na série de agendamentos', {
              description: `${conflitos.totalConflitos} conflito(s). Ex: ${primeiro.dataFormatada} às ${primeiro.hora} — ${primeiro.motivo}.`
            });
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
            // Enviar com offset local em vez de UTC (Z)
            dataHoraInicio: buildOffsetFromDate(novaDataAlvo),
            pacienteId: agendamentoAlvo.pacienteId,
            profissionalId: agendamentoAlvo.profissionalId,
            servicoId: agendamentoAlvo.servicoId,
            convenioId: agendamentoAlvo.convenioId,
            recursoId: agendamentoAlvo.recursoId,
            tipoAtendimento: agendamentoAlvo.tipoAtendimento,
            status: agendamentoAlvo.status,
            // Informar ao backend que é edição de toda a série
            tipoEdicaoRecorrencia: 'esta_e_futuras'
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
      const backendMsg = error?.response?.data?.message;
      AppToast.error('Erro ao atualizar', {
        description: formatarDatasEmMensagem(backendMsg || 'Ocorreu um erro ao atualizar o agendamento.')
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
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xl">
              <span className="text-2xl">✏️</span>
              Editar Agendamento
            </span>
            <div className="flex items-center gap-3 mr-8">
              <Badge className={`${getStatusColor(agendamento.status)} flex items-center gap-1 text-xs`}>
                {getStatusIcon(agendamento.status)}
                {agendamento.status}
              </Badge>
              {saving && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  Salvando...
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Agendamento - Layout compacto similar ao DetalhesModal */}
          <div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Paciente:</span>
                <span className="text-gray-700">{agendamento.pacienteNome}</span>
              </div>
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Profissional:</span>
                <span className="text-gray-700">{agendamento.profissionalNome}</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Convênio:</span>
                <span className="text-gray-700">{agendamento.convenioNome}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Serviço:</span>
                <span className="text-gray-700">{agendamento.servicoNome}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Data Atual:</span>
                <span className="text-gray-700">{new Date(agendamento.dataHoraInicio).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Hora Atual:</span>
                <span className="text-gray-700">{new Date(agendamento.dataHoraInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Tipo:</span>
                <Badge variant="outline" className="text-xs">
                  {agendamento.tipoAtendimento}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Recurso:</span>
                <span className="text-gray-700">{agendamento.recursoNome || '-'}</span>
              </div>
            </div>
          </div>

          {/* Layout em duas colunas: Opções de Edição + Nova Data/Hora */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Coluna 1: Opções de Edição */}
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Repeat className="w-4 h-4" />
                Opções de Edição
              </h4>
              
              {agendamentosRelacionados.length > 0 ? (
                <>
                  <p className="text-xs text-gray-600 mb-3">
                    {agendamentosRelacionados.length + 1} agendamentos encontrados
                  </p>
                  
                  <RadioGroup value={tipoEdicao} onValueChange={(value: 'individual' | 'serie') => setTipoEdicao(value)} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="individual" id="individual" />
                      <Label htmlFor="individual" className="text-sm">
                        Apenas este agendamento
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="serie" id="serie" disabled={isAgendamentoPassado} />
                      <Label htmlFor="serie" className={`text-sm ${isAgendamentoPassado ? 'text-gray-400 cursor-not-allowed' : ''}`}>
                        Toda a série ({agendamentosRelacionados.length + 1} agendamentos)
                        {isAgendamentoPassado && (
                          <div className="text-xs text-red-500 mt-1">
                            Não permitido para agendamentos passados
                          </div>
                        )}
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

            {/* Coluna 2: Nova Data e Hora */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Nova Data e Hora
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Data */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Data <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={dataAgendamento}
                    onChange={(e) => setDataAgendamento(e.target.value)}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="border-2 border-green-200 focus:border-green-500"
                  />
                </div>

                {/* Hora */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Hora <span className="text-red-500">*</span>
                    {carregandoHorarios && (
                      <span className="ml-2 text-xs text-gray-500">
                        <div className="inline-block w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin mr-1"></div>
                        Verificando...
                      </span>
                    )}
                  </label>
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
                    placeholder={carregandoHorarios ? "Verificando..." : "Selecione..."}
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
                        return verificacao?.dotColor === 'red' || verificacao?.isOcupado === true;
                      }
                      return false;
                    }}
                  />
                </div>
              </div>
              
              {/* Legenda compacta fora do grid */}
              {horariosVerificados.length > 0 && (
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
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
              )}
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