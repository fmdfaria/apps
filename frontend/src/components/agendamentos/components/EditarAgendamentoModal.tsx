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
import { 
  gerarMensagemCampoObrigatorio, 
  gerarMensagemDataPassada, 
  gerarMensagemOperacaoAgendamentoPassado,
  processarErroBackend
} from '@/utils/MensagensErro';

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
  const [tipoEdicao, setTipoEdicao] = useState<'apenas_esta' | 'esta_e_futuras' | 'toda_serie'>('apenas_esta');
  const [serieInfo, setSerieInfo] = useState<{
    isSeries: boolean;
    totalAgendamentos?: number;
    serieId?: string;
    posicaoNaSerie?: {
      isAnterior: boolean;
      isAtual: boolean;
      isFuturo: boolean;
      posicao: number;
    };
  } | null>(null);
  const [loadingSerieInfo, setLoadingSerieInfo] = useState(false);

  // Estados para modal de conflitos de recorrência
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflitosRecorrencia, setConflitosRecorrencia] = useState<ConflitosRecorrencia | null>(null);
  const [disponibilidades, setDisponibilidades] = useState<any[]>([]);

  // Estados para modal de seleção de recurso
  const [showRecursoModal, setShowRecursoModal] = useState(false);
  const [recursosDisponiveis, setRecursosDisponiveis] = useState<Array<{ id: string; nome: string }>>([]);
  const [recursoSelecionado, setRecursoSelecionado] = useState<string | null>(null);

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
      setTipoEdicao('apenas_esta');

      // Buscar informações da série usando o backend
      buscarInformacoesSerie(agendamento.id);
    } else {
      setDataAgendamento('');
      setHoraAgendamento('');
      setTipoEdicao('apenas_esta');
      setSerieInfo(null);
    }
  }, [isOpen, agendamento]);

  // Forçar "apenas_esta" quando status não for AGENDADO ou quando tentar usar "toda_serie" sem ser master
  useEffect(() => {
    if (agendamento) {
      // Se status não for AGENDADO, só permite "apenas_esta"
      if (agendamento.status !== 'AGENDADO' && tipoEdicao !== 'apenas_esta') {
        setTipoEdicao('apenas_esta');
      }
      // Se não for serie_master e tentar usar "toda_serie", volta para "apenas_esta"
      if (!agendamento.serieMaster && tipoEdicao === 'toda_serie') {
        setTipoEdicao('apenas_esta');
      }
    }
  }, [agendamento, tipoEdicao]);

  // Função para buscar informações da série usando o backend
  const buscarInformacoesSerie = async (agendamentoId: string) => {
    setLoadingSerieInfo(true);
    try {
      // Usar o endpoint do backend para obter informações da série
      const response = await api.get(`/agendamentos/${agendamentoId}/series-info`);
      setSerieInfo(response.data);
    } catch (error) {
      console.error('Erro ao buscar informações da série:', error);
      setSerieInfo({ isSeries: false });
    } finally {
      setLoadingSerieInfo(false);
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

  // Interface para resposta detalhada da validação
  interface ValidacaoDisponibilidade {
    valido: boolean;
    mensagem: string;
    disponibilidadesEncontradas?: Array<{
      recursoId: string;
      recursoNome: string;
      horaInicio: string;
      horaFim: string;
    }>;
  }

  // Mapeamento de dias da semana
  const DIAS_SEMANA = [
    'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 
    'Quinta-feira', 'Sexta-feira', 'Sábado'
  ];

  // Função para validar se o recurso está conforme a disponibilidade cadastrada
  const validarRecursoConformeDisponibilidade = async (
    profissionalId: string, 
    recursoId: string, 
    dataHoraCompleta: string
  ): Promise<ValidacaoDisponibilidade> => {
    if (!disponibilidades.length) return { valido: true, mensagem: '' };

    // Extrair data e hora
    const [data, hora] = dataHoraCompleta.split('T');
    const dataObj = new Date(data + 'T00:00:00');
    const diaSemana = dataObj.getDay();
    const [horaNum, minutoNum] = hora.split(':').map(Number);
    const horarioMinutos = horaNum * 60 + minutoNum;

    // Obter nome do profissional e recurso do agendamento atual
    const nomeProfissional = agendamento?.profissionalNome || agendamento?.profissional?.nome || 'Profissional';
    const nomeRecurso = agendamento?.recursoNome || agendamento?.recurso?.nome || 'Recurso';
    const nomeDiaSemana = DIAS_SEMANA[diaSemana] || 'Dia da semana';

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

    // Coletar todas as disponibilidades do profissional no dia/horário (para listar na mensagem)
    const disponibilidadesNoDia = disponibilidadesProfissional
      .map(disp => {
        const dispRecursoId = disp.recursoId ?? disp.recurso_id;
        const nomeRecursoDisp = disp.recurso?.nome || 'Recurso';
        
        const horaInicioRaw = disp.horaInicio ?? disp.hora_inicio;
        const horaFimRaw = disp.horaFim ?? disp.hora_fim;
        
        if (horaInicioRaw && horaFimRaw) {
          let horaInicioDisp, horaFimDisp;
          
          // Tratar diferentes formatos de horário
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
            return null;
          }
          
          // Formatear horários para exibição
          const horaInicioFormatada = `${Math.floor(horaInicioDisp / 60).toString().padStart(2, '0')}:${(horaInicioDisp % 60).toString().padStart(2, '0')}`;
          const horaFimFormatada = `${Math.floor(horaFimDisp / 60).toString().padStart(2, '0')}:${(horaFimDisp % 60).toString().padStart(2, '0')}`;
          
          return {
            recursoNome: nomeRecursoDisp,
            horaInicio: horaInicioFormatada,
            horaFim: horaFimFormatada,
            recursoId: dispRecursoId,
            horaInicioMinutos: horaInicioDisp,
            horaFimMinutos: horaFimDisp
          };
        }
        
        return null;
      })
      .filter(Boolean) as Array<{
        recursoNome: string;
        horaInicio: string;
        horaFim: string;
        recursoId: string;
        horaInicioMinutos: number;
        horaFimMinutos: number;
      }>;

    // Verificar se existe uma disponibilidade com o recurso exato no horário específico
    const disponibilidadeComRecursoExato = disponibilidadesNoDia.find(disp => 
      disp.recursoId === recursoId && 
      horarioMinutos >= disp.horaInicioMinutos && 
      horarioMinutos < disp.horaFimMinutos
    );

    if (disponibilidadeComRecursoExato) {
      return {
        valido: true,
        mensagem: ''
      };
    }

    // Montar mensagem de erro detalhada
    const disponibilidadesTexto = disponibilidadesNoDia.length > 0
      ? disponibilidadesNoDia
          .map(disp => `${disp.recursoNome} (${disp.horaInicio}-${disp.horaFim})`)
          .join(', ')
      : 'nenhuma';

    const mensagem = `Profissional ${nomeProfissional} não tem disponibilidade cadastrada para Recurso: ${nomeRecurso} na ${nomeDiaSemana} às ${hora}. Disponibilidades cadastradas na ${nomeDiaSemana}: ${disponibilidadesTexto}.`;

    return {
      valido: false,
      mensagem,
      disponibilidadesEncontradas: disponibilidadesNoDia.map(disp => ({
        recursoId: disp.recursoId,
        recursoNome: disp.recursoNome,
        horaInicio: disp.horaInicio,
        horaFim: disp.horaFim
      }))
    };
  };

  const handleSave = async () => {
    // Validação de campos obrigatórios
    const camposFaltando: string[] = [];
    if (!agendamento) camposFaltando.push('agendamento');
    if (!dataAgendamento) camposFaltando.push('data');
    if (!horaAgendamento) camposFaltando.push('horário');
    
    if (camposFaltando.length > 0) {
      AppToast.error('Campos obrigatórios', {
        description: gerarMensagemCampoObrigatorio(camposFaltando)
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
      
      // Validação de recurso x disponibilidade usando formato simples
      const dataHoraCombinada = `${dataAgendamento}T${horaAgendamento}`;
      const recursoParaValidar = recursoSelecionado || agendamento.recursoId;
      const validacaoRecurso = await validarRecursoConformeDisponibilidade(
        agendamento.profissionalId,
        recursoParaValidar,
        dataHoraCombinada
      );

      if (!validacaoRecurso.valido) {
        // Se houver recursos disponíveis, abrir modal de seleção
        if (validacaoRecurso.disponibilidadesEncontradas && validacaoRecurso.disponibilidadesEncontradas.length > 0) {
          // Preparar lista de recursos disponíveis
          const recursos = validacaoRecurso.disponibilidadesEncontradas.map(disp => ({
            id: disp.recursoId,
            nome: disp.recursoNome
          }));
          setRecursosDisponiveis(recursos);

          // Pré-selecionar o primeiro recurso disponível
          if (!recursoSelecionado) {
            setRecursoSelecionado(recursos[0].id);
          }

          // Abrir modal de seleção de recurso
          setShowRecursoModal(true);
          setSaving(false);
          return;
        }

        // Se não houver recursos disponíveis, mostrar erro
        AppToast.error('Conflito no agendamento', {
          description: validacaoRecurso.mensagem
        });
        setSaving(false);
        return;
      }

      // Editar agendamento com o tipo de edição especificado
      // O backend (SeriesManager) se encarrega de toda a lógica de série
      await api.put(`/agendamentos/${agendamento.id}`, {
        dataHoraInicio: novaDataHora,
        // Include other required fields that shouldn't change
        pacienteId: agendamento.pacienteId,
        profissionalId: agendamento.profissionalId,
        servicoId: agendamento.servicoId,
        convenioId: agendamento.convenioId,
        recursoId: recursoSelecionado || agendamento.recursoId,
        tipoAtendimento: agendamento.tipoAtendimento,
        // NÃO enviar status - edição de agendamento não deve alterar status
        // Informar ao backend o tipo de edição selecionado
        tipoEdicaoRecorrencia: tipoEdicao
      });

      AppToast.success(
        tipoEdicao === 'apenas_esta' ? 'Agendamento atualizado' : 'Série de agendamentos atualizada',
        {
          description: (() => {
            if (tipoEdicao === 'apenas_esta') {
              return 'O agendamento foi atualizado com sucesso.';
            } else if (tipoEdicao === 'esta_e_futuras') {
              return 'Este agendamento e futuros da série foram atualizados com sucesso.';
            } else {
              return 'Toda a série de agendamentos foi atualizada com sucesso.';
            }
          })()
        }
      );
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao atualizar agendamento:', error);
      const mensagemMelhorada = processarErroBackend(error);
      AppToast.error('Erro ao atualizar agendamento', {
        description: formatarDatasEmMensagem(mensagemMelhorada)
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

  // Função para confirmar seleção de recurso
  const handleConfirmarRecurso = () => {
    setShowRecursoModal(false);
    // Tenta salvar novamente com o recurso selecionado
    handleSave();
  };

  // Função para cancelar seleção de recurso
  const handleCancelarRecurso = () => {
    setShowRecursoModal(false);
    setRecursoSelecionado(null);
    setRecursosDisponiveis([]);
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
              
              {serieInfo?.isSeries ? (
                <>
                  <p className="text-xs text-gray-600 mb-3">
                    {serieInfo.totalAgendamentos} agendamentos encontrados na série
                  </p>
                  
                  <RadioGroup value={tipoEdicao} onValueChange={(value: 'apenas_esta' | 'esta_e_futuras' | 'toda_serie') => setTipoEdicao(value)} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="apenas_esta" id="apenas_esta" />
                      <Label htmlFor="apenas_esta" className="text-sm">
                        Apenas este agendamento
                      </Label>
                    </div>

                    {/* Mostrar opções baseadas na posição na série e status */}
                    {!serieInfo.posicaoNaSerie?.isAnterior && (
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value="esta_e_futuras"
                          id="esta_e_futuras"
                          disabled={agendamento.status !== 'AGENDADO'}
                        />
                        <Label
                          htmlFor="esta_e_futuras"
                          className={`text-sm ${agendamento.status !== 'AGENDADO' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          Esta e futuras
                          <div className={`text-xs mt-1 ${agendamento.status !== 'AGENDADO' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {agendamento.status !== 'AGENDADO'
                              ? 'Disponível apenas para agendamentos com status AGENDADO'
                              : 'Editar este e próximos agendamentos da série'
                            }
                          </div>
                        </Label>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="toda_serie"
                        id="toda_serie"
                        disabled={agendamento.status !== 'AGENDADO' || !agendamento.serieMaster}
                      />
                      <Label
                        htmlFor="toda_serie"
                        className={`text-sm ${(agendamento.status !== 'AGENDADO' || !agendamento.serieMaster) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        Toda a série ({serieInfo.totalAgendamentos} agendamentos)
                        {(agendamento.status !== 'AGENDADO' || !agendamento.serieMaster) && (
                          <div className="text-xs text-gray-400 mt-1">
                            {!agendamento.serieMaster
                              ? 'Disponível apenas para o agendamento mestre da série'
                              : 'Disponível apenas para agendamentos com status AGENDADO'
                            }
                          </div>
                        )}
                      </Label>
                    </div>
                  </RadioGroup>
                </>
              ) : loadingSerieInfo ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-sm text-gray-600">Verificando série...</span>
                </div>
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

    {/* Modal de seleção de recurso */}
    <Dialog open={showRecursoModal} onOpenChange={(open) => !open && handleCancelarRecurso()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MapPin className="w-6 h-6 text-orange-500" />
            Alterar Recurso do Agendamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              O recurso <strong>{agendamento?.recursoNome}</strong> não está disponível para o profissional <strong>{agendamento?.profissionalNome}</strong> no horário selecionado.
            </p>
            <p className="text-sm text-gray-700 mt-2">
              Selecione um dos recursos disponíveis abaixo:
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recurso Disponível <span className="text-red-500">*</span>
            </label>
            <SingleSelectDropdown
              options={recursosDisponiveis.map(r => ({
                id: r.id,
                nome: r.nome,
                sigla: undefined
              }))}
              selected={recursoSelecionado ? {
                id: recursoSelecionado,
                nome: recursosDisponiveis.find(r => r.id === recursoSelecionado)?.nome || '',
                sigla: undefined
              } : null}
              onChange={(selected) => {
                setRecursoSelecionado(selected?.id || null);
              }}
              placeholder="Selecione um recurso..."
              headerText="Recursos disponíveis"
              formatOption={(option) => option.nome}
            />
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelarRecurso}
            className="border-2 border-gray-300 text-gray-700 hover:border-red-400 hover:bg-red-50 hover:text-red-700 font-semibold px-6"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirmarRecurso}
            disabled={!recursoSelecionado}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl font-semibold px-8"
          >
            <Save className="w-4 h-4 mr-2" />
            Confirmar e Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};