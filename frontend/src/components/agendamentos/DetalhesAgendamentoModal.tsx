import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  User,
  FileText,
  CreditCard,
  Info,
  UserCheck,
  Monitor,
  MapPin,
  Key,
  CalendarCheck,
  Stethoscope,
  AlertTriangle,
  Timer
} from 'lucide-react';
import type { Agendamento } from '@/types/Agendamento';
import { getAgendamentos } from '@/services/agendamentos';
import { formatarDataHoraLocal, formatarApenasData } from '@/utils/dateUtils';

interface DetalhesAgendamentoModalProps {
  isOpen: boolean;
  agendamento: Agendamento | null;
  onClose: () => void;
}

export const DetalhesAgendamentoModal: React.FC<DetalhesAgendamentoModalProps> = ({
  isOpen,
  agendamento,
  onClose
}) => {
  if (!agendamento) return null;

  const formatarDataHora = formatarDataHoraLocal;
  const formatarDataHoraCompleta = formatarApenasData;

  // Sessão #
  const [sessionNumber, setSessionNumber] = useState<number | null>(null);
  useEffect(() => {
    const calcularSessao = async () => {
      if (!agendamento) return;
      try {
        const [dataStr] = agendamento.dataHoraInicio.split('T');
        const res = await getAgendamentos({
          pacienteId: agendamento.pacienteId,
          profissionalId: agendamento.profissionalId,
          servicoId: agendamento.servicoId,
          dataFim: dataStr,
          limit: 1,
        });
        const totalAteData = res.pagination?.total ?? (res.data?.length || 0);
        setSessionNumber(totalAteData);
      } catch {
        setSessionNumber(null);
      }
    };
    calcularSessao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendamento?.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AGENDADO':
        return 'bg-blue-100 text-blue-800';
      case 'SOLICITADO':
        return 'bg-orange-100 text-orange-800';
      case 'LIBERADO':
        return 'bg-green-100 text-green-800';
      case 'ATENDIDO':
        return 'bg-purple-100 text-purple-800';
      case 'FINALIZADO':
        return 'bg-emerald-100 text-emerald-800';
      case 'CANCELADO':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const { data, hora } = formatarDataHora(agendamento.dataHoraInicio);

  // Calcular duração em minutos
  const calcularDuracao = () => {
    if (!agendamento.dataHoraInicio || !agendamento.dataHoraFim) return '-';

    const inicio = new Date(agendamento.dataHoraInicio);
    const fim = new Date(agendamento.dataHoraFim);
    const diffMs = fim.getTime() - inicio.getTime();
    const diffMinutos = Math.round(diffMs / 60000);

    if (diffMinutos < 60) {
      return `${diffMinutos} min`;
    } else {
      const horas = Math.floor(diffMinutos / 60);
      const minutos = diffMinutos % 60;
      return minutos > 0 ? `${horas}h ${minutos}min` : `${horas}h`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xl">
              <Info className="w-6 h-6 text-blue-600" />
              Detalhes do Agendamento
            </span>
            <span className="flex items-center gap-2 mr-8">
              {sessionNumber !== null && (
                <Badge className="bg-emerald-100 text-emerald-700">
                  Sessão #{sessionNumber}
                </Badge>
              )}
              <Badge className={`${getStatusColor(agendamento.status)}`}>
                {agendamento.status}
              </Badge>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Agendamento */}
          <div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {/* Linha 1 */}
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

              {/* Linha 2 */}
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

              {/* Linha 3 */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Data e Hora:</span>
                <span className="text-gray-700">{data} - {hora}</span>
              </div>
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Duração:</span>
                <span className="text-gray-700">{calcularDuracao()}</span>
              </div>
              
              {/* Linha 4 */}
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
              
              {/* Linha 5 */}
              {(agendamento.codLiberacao || agendamento.dataCodLiberacao) && (
                <>
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Código:</span>
                    <span className="text-gray-700 font-mono">{agendamento.codLiberacao || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Data Liberação:</span>
                    <span className="text-gray-700">{agendamento.dataCodLiberacao ? formatarDataHoraCompleta(agendamento.dataCodLiberacao) : '-'}</span>
                  </div>
                </>
              )}
              
              {/* Linha 6 */}
              {agendamento.dataAtendimento && (
                <div className="flex items-center gap-2 col-span-2">
                  <Stethoscope className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Data do Atendimento:</span>
                  <span className="text-gray-700">{formatarDataHoraCompleta(agendamento.dataAtendimento)}</span>
                </div>
              )}
              
              {/* Linha 7 */}
              {agendamento.motivoReprovacao && (
                <div className="flex items-center gap-2 col-span-2">
                  <AlertTriangle className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Motivo da Reprovação:</span>
                  <span className="text-gray-700">{agendamento.motivoReprovacao}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 