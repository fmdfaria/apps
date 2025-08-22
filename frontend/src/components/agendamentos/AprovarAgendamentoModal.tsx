import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, XCircle, User, Calendar, Clock, FileText, CreditCard, CheckCircle2, Stethoscope } from 'lucide-react';
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ClipboardCheck className="w-6 h-6 text-blue-600" />
            Avaliar Atendimento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações do Agendamento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5" />
                Informações do Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Paciente:</span>
                  <span>{agendamento.pacienteNome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Profissional:</span>
                  <span>{agendamento.profissionalNome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Serviço:</span>
                  <span>{agendamento.servicoNome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Convênio:</span>
                  <span>{agendamento.convenioNome}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Data:</span>
                  <span>{data}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Horário:</span>
                  <span>{hora}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <Badge className="bg-yellow-100 text-yellow-700">
                    {agendamento.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Tipo:</span>
                  <Badge variant="outline">
                    {agendamento.tipoAtendimento}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dados de Liberação */}
          {agendamento.codLiberacao && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Dados da Liberação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Código:</span>
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">
                      {agendamento.codLiberacao}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>
                    <Badge 
                      className={agendamento.statusCodLiberacao === 'APROVADO' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                      }
                    >
                      {agendamento.statusCodLiberacao}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Data:</span>
                    <span>{agendamento.dataCodLiberacao ? formatarApenasData(agendamento.dataCodLiberacao) : '-'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dados do Atendimento */}
          {agendamento.dataAtendimento && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Stethoscope className="w-5 h-5 text-blue-600" />
                  Dados do Atendimento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Data do Atendimento:</span>
                    <span>{formatarApenasData(agendamento.dataAtendimento)}</span>
                  </div>
                </div>
                {agendamento.observacoesAtendimento && (
                  <div className="space-y-2">
                    <span className="font-medium">Observações:</span>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-700">{agendamento.observacoesAtendimento}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Seleção de Ação */}
          {/* Seleção de Ação - Concluir agora é automático, Reprovar abre formulário */}
          {!acao && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ClipboardCheck className="w-5 h-5" />
                  Avaliar Atendimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={handleConcluirDireto}
                    className="bg-green-600 hover:bg-green-700 flex items-center gap-2 px-8 py-4 text-lg"
                    disabled={loading}
                  >
                    <ClipboardCheck className="w-5 h-5" />
                    Concluir Atendimento
                  </Button>
                  <Button
                    onClick={() => setAcao('REPROVAR')}
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-600 hover:text-white flex items-center gap-2 px-8 py-4 text-lg"
                  >
                    <XCircle className="w-5 h-5" />
                    Reprovar Atendimento
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Formulário de Avaliação */}
          {acao === 'REPROVAR' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <XCircle className="w-5 h-5 text-red-600" />
                  Motivo da Reprovação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Motivo da Reprovação - apenas se reprovar */}
                  <div className="space-y-2">
                    <Textarea
                      id="motivoCancelamento"
                      placeholder="Descreva detalhadamente o motivo da reprovação..."
                      value={formData.motivoCancelamento}
                      onChange={(e) => setFormData(prev => ({ ...prev, motivoCancelamento: e.target.value }))}
                      rows={4}
                      className="resize-none"
                      required
                    />
                  </div>

                  <DialogFooter className="gap-2 mt-6">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setAcao(null)}
                      disabled={loading}
                    >
                      Voltar
                    </Button>
                    <Button 
                      type="submit" 
                      className={'bg-red-600 hover:bg-red-700'}
                      disabled={loading}
                    >
                      {loading ? 'Reprovando...' : 'Confirmar Reprovação'}
                    </Button>
                  </DialogFooter>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}; 