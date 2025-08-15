import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Clock,
  User,
  Users,
  FileText,
  CreditCard,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Repeat,
  ThumbsUp,
  Key
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
    const data = new Date(dataISO);
    return data.toLocaleString('pt-BR');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'AGENDADO':
        return <Calendar className="w-4 h-4" />;
      case 'SOLICITADO':
        return <AlertCircle className="w-4 h-4" />;
      case 'LIBERADO':
        return <CheckCircle className="w-4 h-4" />;
      case 'ATENDIDO':
        return <Users className="w-4 h-4" />;
      case 'FINALIZADO':
        return <CheckCircle className="w-4 h-4" />;
      case 'CANCELADO':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AGENDADO':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'SOLICITADO':
        return 'bg-orange-100 text-orange-800 border-orange-300';
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

  const getTipoAtendimentoIcon = (tipo: string) => {
    return tipo === 'online' ? '💻' : '🏥';
  };

  const formatarRecorrencia = (recorrencia: any) => {
    if (!recorrencia) return null;
    
    const tipos = {
      semanal: 'Semanal',
      quinzenal: 'Quinzenal',
      mensal: 'Mensal'
    };
    
    let texto = tipos[recorrencia.tipo] || recorrencia.tipo;
    
    if (recorrencia.repeticoes) {
      texto += ` (${recorrencia.repeticoes} vezes)`;
    }
    
    if (recorrencia.ate) {
      const dataFim = new Date(recorrencia.ate).toLocaleDateString('pt-BR');
      texto += ` até ${dataFim}`;
    }
    
    return texto;
  };

  const { data: dataInicio, hora: horaInicio } = formatarDataHora(agendamento.dataHoraInicio);
  const dataFim = agendamento.dataHoraFim ? formatarDataHora(agendamento.dataHoraFim) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 -mx-6 -mt-6 px-6 pt-6 pb-4 border-b border-gray-200">
          <DialogTitle className="flex items-center justify-between text-xl font-bold text-gray-900">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📋</span>
              Detalhes do Agendamento
            </div>
            <Badge className={`${getStatusColor(agendamento.status)} flex items-center gap-1 text-xs`}>
              {getStatusIcon(agendamento.status)}
              {agendamento.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Card Principal - Informações Essenciais */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
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
                      {getTipoAtendimentoIcon(agendamento.tipoAtendimento)}
                      {agendamento.recursoNome || agendamento.tipoAtendimento}
                    </p>
                  </div>
                </div>
              </div>

              {/* Coluna 3: Data e Convênio */}
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-700 text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Agendamento
                </h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-gray-600">Data:</span>
                    <p className="font-medium text-gray-800">{dataInicio}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Horário:</span>
                    <p className="font-medium text-gray-800">
                      {horaInicio} {dataFim && `- ${dataFim.hora}`}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Convênio:</span>
                    <p className="font-medium text-gray-800">{agendamento.convenioNome}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recorrência (se existir) */}
            {agendamento.recorrencia && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Recorrência:</span>
                  <Badge variant="outline" className="text-xs">
                    {formatarRecorrencia(agendamento.recorrencia)}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Informações Adicionais (condicionais) */}
          {(agendamento.codLiberacao || agendamento.dataAtendimento || agendamento.observacoesAtendimento || 
            agendamento.dataAprovacao || agendamento.motivoCancelamento) && (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
              <h4 className="font-semibold text-gray-700 text-sm mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Informações Adicionais
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {/* Liberação */}
                {agendamento.codLiberacao && (
                  <div className="space-y-1">
                    <span className="text-gray-600 font-medium flex items-center gap-1">
                      <Key className="w-3 h-3" />
                      Código de Liberação:
                    </span>
                    <p className="font-mono bg-white px-2 py-1 rounded border text-xs">
                      {agendamento.codLiberacao}
                    </p>
                    {agendamento.dataCodLiberacao && (
                      <p className="text-xs text-gray-500">
                        {formatarDataHoraCompleta(agendamento.dataCodLiberacao)}
                      </p>
                    )}
                  </div>
                )}

                {/* Atendimento */}
                {agendamento.dataAtendimento && (
                  <div className="space-y-1">
                    <span className="text-gray-600 font-medium flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Data do Atendimento:
                    </span>
                    <p className="text-gray-800">{formatarDataHoraCompleta(agendamento.dataAtendimento)}</p>
                  </div>
                )}

                {/* Aprovação */}
                {agendamento.dataAprovacao && (
                  <div className="space-y-1">
                    <span className="text-gray-600 font-medium flex items-center gap-1">
                      <ThumbsUp className="w-3 h-3" />
                      Data de Aprovação:
                    </span>
                    <p className="text-gray-800">{formatarDataHoraCompleta(agendamento.dataAprovacao)}</p>
                    {agendamento.aprovadoPor && (
                      <p className="text-xs text-gray-500">Por: {agendamento.aprovadoPor}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Observações */}
              {agendamento.observacoesAtendimento && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <span className="text-gray-600 font-medium text-sm">Observações do Atendimento:</span>
                  <p className="mt-1 p-3 bg-white rounded border text-sm text-gray-700">
                    {agendamento.observacoesAtendimento}
                  </p>
                </div>
              )}

              {/* Motivo Cancelamento */}
              {agendamento.motivoCancelamento && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <span className="text-gray-600 font-medium text-sm">Motivo do Cancelamento:</span>
                  <p className="mt-1 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    {agendamento.motivoCancelamento}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 