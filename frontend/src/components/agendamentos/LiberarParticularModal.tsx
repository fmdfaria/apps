import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, User, Calendar, Clock, FileText, CreditCard, UserCheck, Monitor, MapPin } from 'lucide-react';
import type { Agendamento } from '@/types/Agendamento';
import { liberarAgendamentoParticular, getAgendamentos } from '@/services/agendamentos';
import { AppToast } from '@/services/toast';
import { formatarDataHoraLocal } from '@/utils/dateUtils';

interface LiberarParticularModalProps {
  isOpen: boolean;
  agendamento: Agendamento | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const LiberarParticularModal: React.FC<LiberarParticularModalProps> = ({
  isOpen,
  agendamento,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [sessionNumber, setSessionNumber] = useState<number | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [formData, setFormData] = useState({
    recebimento: false,
    dataLiberacao: new Date().toISOString().split('T')[0] // Data de hoje
  });

  const resetForm = () => {
    setFormData({
      recebimento: false,
      dataLiberacao: new Date().toISOString().split('T')[0]
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agendamento) return;
    
    // Validações
    if (!formData.recebimento) {
      AppToast.validation('Campos obrigatórios', 'Marque o recebimento do pagamento para continuar.');
      return;
    }

    if (!formData.dataLiberacao) {
      AppToast.validation('Campos obrigatórios', 'Informe a data da liberação para continuar.');
      return;
    }

    setLoading(true);
    try {
      await liberarAgendamentoParticular(agendamento.id, {
        recebimento: formData.recebimento,
        dataLiberacao: formData.dataLiberacao
      });
      AppToast.updated('Agendamento', 'O agendamento particular foi liberado com sucesso!');
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao liberar agendamento particular:', error);
      AppToast.error('Erro ao liberar agendamento', {
        description: 'Não foi possível liberar o agendamento. Tente novamente.'
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

  const formatarDataHora = formatarDataHoraLocal;
  
  // Calcular número da sessão ao abrir o modal
  useEffect(() => {
    const calcularSessao = async () => {
      if (!agendamento) return;
      try {
        setLoadingSessions(true);
        // Obter data (YYYY-MM-DD) do agendamento
        const [dataStr] = agendamento.dataHoraInicio.split('T');
        const agendamentoDate = new Date(agendamento.dataHoraInicio);

        // Chamada única: tudo até o fim do dia atual; filtramos localmente horários do mesmo dia posteriores
        const sameDayRes = await getAgendamentos({
          pacienteId: agendamento.pacienteId,
          profissionalId: agendamento.profissionalId,
          servicoId: agendamento.servicoId,
          dataFim: dataStr,
          // backend limita a 100
          limit: 100,
        });
        const anterioresAteAgora = sameDayRes.data.filter(a => new Date(a.dataHoraInicio).getTime() < agendamentoDate.getTime()).length;
        setSessionNumber(anterioresAteAgora + 1);
      } catch (e) {
        setSessionNumber(null);
      } finally {
        setLoadingSessions(false);
      }
    };
    calcularSessao();
  }, [agendamento?.id]);

  if (!agendamento) return null;

  const { data, hora } = formatarDataHora(agendamento.dataHoraInicio);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Liberação de Agendamento Particular
            </span>
            <span className="flex items-center gap-2 mr-8">
              {sessionNumber !== null && (
                <Badge className="bg-emerald-100 text-emerald-700">
                  Sessão #{sessionNumber}
                </Badge>
              )}
              <Badge className="bg-blue-100 text-blue-700">
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
                <Monitor className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Tipo:</span>
                <Badge variant="outline" className="text-xs">
                  {agendamento.tipoAtendimento}
                </Badge>
              </div>
              {/* Linha 2 */}
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Particular</span>
                <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                  Pagamento Direto
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Serviço:</span>
                <span className="text-gray-700">{agendamento.servicoNome}</span>
              </div>
              {/* Linha 3 */}
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
              {/* Linha 4 */}
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Profissional:</span>
                <span className="text-gray-700">{agendamento.profissionalNome}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Recurso:</span>
                <span className="text-gray-700">{agendamento.recursoNome || '-'}</span>
              </div>
            </div>
          </div>

          {/* Formulário de Liberação Particular */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Recebimento */}
                <div className="space-y-2">
                  <Label className="text-base font-medium">Recebimento *</Label>
                  <div className="flex items-center space-x-3 p-3 border rounded-md">
                    <Checkbox
                      id="recebimento"
                      checked={formData.recebimento}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, recebimento: !!checked }))
                      }
                    />
                    <label 
                      htmlFor="recebimento"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Recebido do paciente
                    </label>
                  </div>
                </div>

                {/* Data da Liberação */}
                <div className="space-y-2">
                  <Label htmlFor="dataLiberacao">Data da Liberação *</Label>
                  <Input
                    id="dataLiberacao"
                    type="date"
                    value={formData.dataLiberacao}
                    onChange={(e) => setFormData(prev => ({ ...prev, dataLiberacao: e.target.value }))}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              
              <DialogFooter className="mt-6">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    className="border-2 border-gray-300 text-gray-700 hover:border-red-400 hover:bg-red-50 hover:text-red-700 font-semibold px-6 transition-all duration-200"
                  >
                    <span className="mr-2">🔴</span>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 shadow-lg hover:shadow-xl font-semibold px-8 transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <span className="mr-2">⏳</span>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">🟢</span>
                      Liberar Particular
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};