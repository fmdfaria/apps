import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, XCircle, User, Calendar, Clock, FileText, CreditCard, CheckCircle2, Stethoscope, UserCheck, Monitor, MapPin } from 'lucide-react';
import type { Agendamento } from '@/types/Agendamento';
import { aprovarAgendamento, updateAgendamento } from '@/services/agendamentos';
import { useAuth } from '@/hooks/useAuth';
import { AppToast } from '@/services/toast';
import { formatarDataHoraLocal, formatarApenasData } from '@/utils/dateUtils';

interface AprovarAgendamentoModalProps {
  isOpen: boolean;
  agendamento: Agendamento | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AprovarAgendamentoModal: React.FC<AprovarAgendamentoModalProps> = ({
  isOpen,
  agendamento,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [acao, setAcao] = useState<'APROVAR' | 'REPROVAR' | null>(null);
  const [formData, setFormData] = useState({
    motivoCancelamento: ''
  });

  const resetForm = () => {
    setFormData({
      motivoCancelamento: ''
    });
    setAcao(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agendamento || !acao) return;
    
    if (acao === 'REPROVAR' && !formData.motivoCancelamento) {
      AppToast.validation('Motivo obrigatório', 'O motivo da reprovação é obrigatório.');
      return;
    }

    setLoading(true);
    try {
      if (acao === 'APROVAR') {
        await aprovarAgendamento(agendamento.id, {
          avaliadoPorId: user?.id
        });
        AppToast.updated('Agendamento', 'O agendamento foi aprovado com sucesso!');
      } else {
        await updateAgendamento(agendamento.id, {
          motivoCancelamento: formData.motivoCancelamento,
          avaliadoPorId: user?.id,
          motivoReprovacao: formData.motivoCancelamento,
          status: 'PENDENTE'
        });
        AppToast.updated('Agendamento', 'O agendamento foi marcado como PENDENTE.');
      }
      
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao processar agendamento:', error);
      AppToast.error(`Erro ao ${acao === 'APROVAR' ? 'aprovar' : 'reprovar'} agendamento`, {
        description: `Não foi possível ${acao === 'APROVAR' ? 'aprovar' : 'reprovar'} o agendamento. Tente novamente.`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const handleConcluirDireto = async () => {
    if (!agendamento) return;
    setLoading(true);
    try {
      await aprovarAgendamento(agendamento.id, {
        avaliadoPorId: user?.id
      });
      AppToast.updated('Agendamento', 'O agendamento foi aprovado com sucesso!');
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao concluir atendimento:', error);
      AppToast.error('Erro ao aprovar agendamento', { description: 'Não foi possível aprovar o agendamento. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  const formatarDataHora = formatarDataHoraLocal;

  if (!agendamento) return null;

  const { data, hora } = formatarDataHora(agendamento.dataHoraInicio);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xl">
              <ClipboardCheck className="w-6 h-6 text-blue-600" />
              Avaliar Atendimento
            </span>
            <Badge className="bg-blue-100 text-blue-700 mr-8">
              {agendamento.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Agendamento - Compacto */}
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
              
              {/* Data de Liberação */}
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Data Liberação:</span>
                <span className={`${
                  agendamento.dataCodLiberacao ? 'text-gray-700' : 'text-gray-500'
                }`}>
                  {agendamento.dataCodLiberacao ? formatarApenasData(agendamento.dataCodLiberacao) : 'Aguardando'}
                </span>
              </div>

              {/* Data do Atendimento */}
              {agendamento.dataAtendimento && (
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Data Atendimento:</span>
                  <span className="text-gray-700">{formatarApenasData(agendamento.dataAtendimento)}</span>
                </div>
              )}
            </div>

            {/* Observações do Atendimento - Se existir */}
            {agendamento.observacoesAtendimento && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">Observações:</span>
                <p className="text-sm text-gray-600 mt-1">{agendamento.observacoesAtendimento}</p>
              </div>
            )}
          </div>

          {/* Ações - Concluir e Reprovar */}
          {!acao && (
            <div className="flex gap-4 justify-center pt-4">
              <Button
                onClick={handleConcluirDireto}
                className="bg-green-600 hover:bg-green-700 flex items-center gap-2 px-8 py-3"
                disabled={loading}
              >
                <ClipboardCheck className="w-5 h-5" />
                {loading ? 'Concluindo...' : 'Concluir'}
              </Button>
              <Button
                onClick={() => setAcao('REPROVAR')}
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-600 hover:text-white flex items-center gap-2 px-8 py-3"
              >
                <XCircle className="w-5 h-5" />
                Reprovar
              </Button>
            </div>
          )}

          {/* Formulário de Reprovação */}
          {acao === 'REPROVAR' && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">Motivo da Reprovação</span>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Textarea
                  placeholder="Descreva o motivo da reprovação..."
                  value={formData.motivoCancelamento}
                  onChange={(e) => setFormData(prev => ({ ...prev, motivoCancelamento: e.target.value }))}
                  rows={3}
                  className="resize-none"
                  required
                />
                <DialogFooter className="gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setAcao(null)}
                    disabled={loading}
                    className="border-2 border-gray-300 text-gray-700 hover:border-red-400 hover:bg-red-50 hover:text-red-700 font-semibold px-6 transition-all duration-200"
                  >
                    <span className="mr-2">🔴</span>
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-xl font-semibold px-8 transition-all duration-200"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="mr-2">⏳</span>
                        Reprovando...
                      </>
                    ) : (
                      <>
                        <span className="mr-2">❌</span>
                        Reprovar
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 