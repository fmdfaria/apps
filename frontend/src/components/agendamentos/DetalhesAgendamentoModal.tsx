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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <FileText className="w-6 h-6" />
            Detalhes do Agendamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 1. Informações Principais */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="text-xl">👤</span>
              Informações Principais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Paciente:</span>
                  <span className="font-medium">{agendamento.pacienteNome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Profissional:</span>
                  <span className="font-medium">{agendamento.profissionalNome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Serviço:</span>
                  <span className="font-medium">{agendamento.servicoNome}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Convênio:</span>
                  <span className="font-medium">{agendamento.convenioNome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Recurso:</span>
                  <span className="font-medium">{agendamento.recursoNome || 'Não informado'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Tipo:</span>
                  <Badge variant="outline" className="text-xs">
                    {getTipoAtendimentoIcon(agendamento.tipoAtendimento)} {agendamento.tipoAtendimento}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Data e Horário */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="text-xl">📅</span>
              Data e Horário
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Data:</span>
                  <span className="font-medium">{dataInicio}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Horário de Início:</span>
                  <span className="font-medium">{horaInicio}</span>
                </div>
              </div>
              <div className="space-y-3">
                {dataFim && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Horário de Fim:</span>
                    <span className="font-medium">{dataFim.hora}</span>
                  </div>
                )}
                {agendamento.recorrencia && (
                  <div className="flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Recorrência:</span>
                    <Badge variant="outline" className="text-xs">
                      {formatarRecorrencia(agendamento.recorrencia)}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Status e Workflow */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="text-xl">✅</span>
              Status e Workflow
            </h3>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-600">Status Atual:</span>
              <Badge className={`${getStatusColor(agendamento.status)} flex items-center gap-1`}>
                {getStatusIcon(agendamento.status)}
                {agendamento.status}
              </Badge>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {(agendamento.codLiberacao || agendamento.statusCodLiberacao || agendamento.dataCodLiberacao) && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Liberação
                  </h4>
                  {agendamento.codLiberacao && (
                    <div className="text-sm">
                      <span className="text-gray-600">Código: </span>
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded">{agendamento.codLiberacao}</span>
                    </div>
                  )}
                  {agendamento.statusCodLiberacao && (
                    <div className="text-sm">
                      <span className="text-gray-600">Status: </span>
                      <span>{agendamento.statusCodLiberacao}</span>
                    </div>
                  )}
                  {agendamento.dataCodLiberacao && (
                    <div className="text-sm">
                      <span className="text-gray-600">Data: </span>
                      <span>{formatarDataHoraCompleta(agendamento.dataCodLiberacao)}</span>
                    </div>
                  )}
                </div>
              )}

              {(agendamento.dataAtendimento || agendamento.observacoesAtendimento) && (
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Atendimento
                  </h4>
                  {agendamento.dataAtendimento && (
                    <div className="text-sm">
                      <span className="text-gray-600">Data: </span>
                      <span>{formatarDataHoraCompleta(agendamento.dataAtendimento)}</span>
                    </div>
                  )}
                  {agendamento.observacoesAtendimento && (
                    <div className="text-sm">
                      <span className="text-gray-600">Observações: </span>
                      <p className="mt-1 p-2 bg-gray-50 rounded text-sm">{agendamento.observacoesAtendimento}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {(agendamento.dataAprovacao || agendamento.aprovadoPor || agendamento.motivoCancelamento) && (
              <>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4" />
                    Aprovação
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {agendamento.dataAprovacao && (
                      <div className="text-sm">
                        <span className="text-gray-600">Data de Aprovação: </span>
                        <span>{formatarDataHoraCompleta(agendamento.dataAprovacao)}</span>
                      </div>
                    )}
                    {agendamento.aprovadoPor && (
                      <div className="text-sm">
                        <span className="text-gray-600">Aprovado por: </span>
                        <span>{agendamento.aprovadoPor}</span>
                      </div>
                    )}
                  </div>
                  {agendamento.motivoCancelamento && (
                    <div className="text-sm">
                      <span className="text-gray-600">Motivo do Cancelamento: </span>
                      <p className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-sm">{agendamento.motivoCancelamento}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Seção de informações do sistema removida conforme diretriz de simplificação */}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 