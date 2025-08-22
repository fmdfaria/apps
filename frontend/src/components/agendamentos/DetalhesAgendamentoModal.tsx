import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  User,
  FileText,
  CreditCard,
  Info,
  UserCheck,
  Monitor,
  MapPin
} from 'lucide-react';
import type { Agendamento } from '@/types/Agendamento';

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

  const formatarDataHora = (dataISO: string) => {
    const data = new Date(dataISO);
    return {
      data: data.toLocaleDateString('pt-BR'),
      hora: data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const formatarDataHoraCompleta = (dataISO: string) => {
    if (!dataISO) return '';
    
    const data = new Date(dataISO);
    
    // Sempre mostrar apenas a data, sem horário
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    
    return `${dia}/${mes}/${ano}`;
  };

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xl">
              <Info className="w-6 h-6 text-blue-600" />
              Detalhes do Agendamento
            </span>
            <Badge className={`${getStatusColor(agendamento.status)} mr-8`}>
              {agendamento.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Agendamento */}
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
                <span className="font-medium">Data:</span>
                <span className="text-gray-700">{data}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Hora:</span>
                <span className="text-gray-700">{hora}</span>
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

          {/* Informações Adicionais */}
          {(agendamento.codLiberacao || agendamento.dataAtendimento || agendamento.observacoesAtendimento || 
            agendamento.dataAprovacao || agendamento.motivoCancelamento) && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Informações Adicionais</h3>
              <div className="space-y-3 text-sm">
                {agendamento.codLiberacao && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Dados da Liberação</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <span className="font-medium">Código:</span>
                        <span className="text-gray-700 ml-2 font-mono">{agendamento.codLiberacao}</span>
                      </div>
                      <div>
                        <span className="font-medium">Data:</span>
                        <span className="text-gray-700 ml-2">{agendamento.dataCodLiberacao ? formatarDataHoraCompleta(agendamento.dataCodLiberacao) : '-'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {agendamento.dataAtendimento && (
                  <div>
                    <span className="font-medium">Data do Atendimento:</span>
                    <span className="text-gray-700 ml-2">{formatarDataHoraCompleta(agendamento.dataAtendimento)}</span>
                  </div>
                )}

                {agendamento.dataAprovacao && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="font-medium">Data de Aprovação:</span>
                      <span className="text-gray-700 ml-2">{formatarDataHoraCompleta(agendamento.dataAprovacao)}</span>
                    </div>
                    {agendamento.aprovadoPor && (
                      <div>
                        <span className="font-medium">Aprovado por:</span>
                        <span className="text-gray-700 ml-2">{agendamento.aprovadoPor}</span>
                      </div>
                    )}
                  </div>
                )}

                {agendamento.observacoesAtendimento && (
                  <div>
                    <span className="font-medium">Observações do Atendimento:</span>
                    <p className="mt-1 p-3 bg-gray-50 rounded border text-gray-700">
                      {agendamento.observacoesAtendimento}
                    </p>
                  </div>
                )}

                {agendamento.motivoCancelamento && (
                  <div>
                    <span className="font-medium">Motivo do Cancelamento:</span>
                    <p className="mt-1 p-3 bg-red-50 border border-red-200 rounded text-red-800">
                      {agendamento.motivoCancelamento}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 