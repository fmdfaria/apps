import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, User, Calendar, Clock, FileText, CreditCard, UserCheck, Monitor, MapPin } from 'lucide-react';
import type { Agendamento } from '@/types/Agendamento';
import { liberarAgendamento } from '@/services/agendamentos';
import { AppToast } from '@/services/toast';
import { formatarDataHoraLocal } from '@/utils/dateUtils';

interface LiberarAgendamentoModalProps {
  isOpen: boolean;
  agendamento: Agendamento | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const LiberarAgendamentoModal: React.FC<LiberarAgendamentoModalProps> = ({
  isOpen,
  agendamento,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    codLiberacao: '',
    dataCodLiberacao: new Date().toISOString().split('T')[0] // Data de hoje
  });

  const resetForm = () => {
    setFormData({
      codLiberacao: '',
      dataCodLiberacao: new Date().toISOString().split('T')[0]
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agendamento) return;
    
    // Validações
    if (!formData.codLiberacao) {
      AppToast.validation('Campos obrigatórios', 'Preencha o código de liberação para continuar.');
      return;
    }

    setLoading(true);
    try {
      // Ajustar a data para evitar problemas de timezone
      const dataLiberacao = new Date(formData.dataCodLiberacao + 'T12:00:00.000Z');
      
      await liberarAgendamento(agendamento.id, {
        codLiberacao: formData.codLiberacao,
        statusCodLiberacao: 'APROVADO', // Default status quando não especificado
        dataCodLiberacao: dataLiberacao.toISOString()
      });
      AppToast.updated('Agendamento', 'O agendamento foi liberado com sucesso!');
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao liberar agendamento:', error);
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

  if (!agendamento) return null;

  const { data, hora } = formatarDataHora(agendamento.dataHoraInicio);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Liberação de Agendamento
            </span>
            <Badge className="bg-blue-100 text-blue-700 mr-8">
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

          {/* Formulário de Liberação */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Código de Liberação */}
                <div className="space-y-2">
                  <Label htmlFor="codLiberacao">Código de Liberação *</Label>
                  <Input
                    id="codLiberacao"
                    type="text"
                    placeholder="Ex: LIB123456"
                    value={formData.codLiberacao}
                    onChange={(e) => setFormData(prev => ({ ...prev, codLiberacao: e.target.value.toUpperCase() }))}
                  />
                </div>

                {/* Data da Liberação */}
                <div className="space-y-2">
                  <Label htmlFor="dataCodLiberacao">Data da Liberação *</Label>
                  <Input
                    id="dataCodLiberacao"
                    type="date"
                    value={formData.dataCodLiberacao}
                    onChange={(e) => setFormData(prev => ({ ...prev, dataCodLiberacao: e.target.value }))}
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
                className={`bg-gradient-to-r from-orange-600 to-red-600 shadow-lg hover:shadow-xl font-semibold px-8 transition-all duration-200`}
              >
                {loading ? (
                  <>
                    <span className="mr-2">⏳</span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🟢</span>
                    Liberar
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