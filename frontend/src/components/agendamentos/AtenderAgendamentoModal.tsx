import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, User, Calendar, Clock, FileText, CreditCard, UserCheck, Monitor, MapPin, CheckCircle2 } from 'lucide-react';
import type { Agendamento } from '@/types/Agendamento';
import { atenderAgendamento } from '@/services/agendamentos';
import { AppToast } from '@/services/toast';
import { formatarDataHoraLocal, formatarApenasData } from '@/utils/dateUtils';

interface AtenderAgendamentoModalProps {
  isOpen: boolean;
  agendamento: Agendamento | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AtenderAgendamentoModal: React.FC<AtenderAgendamentoModalProps> = ({
  isOpen,
  agendamento,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{ dataAtendimento: string; observacoes?: string}>({
    dataAtendimento: new Date().toISOString().split('T')[0]
  });

  const resetForm = () => {
    setFormData({
      dataAtendimento: new Date().toISOString().split('T')[0]
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agendamento) return;
    
    // Validações
    if (!formData.dataAtendimento) {
      AppToast.validation('Data obrigatória', 'A data de atendimento é obrigatória.');
      return;
    }

    setLoading(true);
    try {
      await atenderAgendamento(agendamento.id, {
        ...formData,
        convenioNome: agendamento.convenioNome
      });
      
      // Mensagem diferente baseada no convênio
      const isParticular = agendamento.convenioNome === 'Particular';
      const mensagem = isParticular 
        ? 'O atendimento foi registrado e finalizado com sucesso!' 
        : 'O atendimento foi registrado com sucesso!';
      
      AppToast.updated('Agendamento', mensagem);
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao registrar atendimento:', error);
      AppToast.error('Erro ao registrar atendimento', {
        description: 'Não foi possível registrar o atendimento. Tente novamente.'
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
              <Stethoscope className="w-6 h-6 text-blue-600" />
              Registrar Atendimento
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
            </div>
          </div>

          {/* Formulário de Atendimento */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dataAtendimento">Data do Atendimento *</Label>
                <Input
                  id="dataAtendimento"
                  type="date"
                  value={formData.dataAtendimento}
                  onChange={(e) => setFormData(prev => ({ ...prev, dataAtendimento: e.target.value }))}
                  required
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              <DialogFooter className="mt-6">
                {/* Botão Meet para agendamentos online */}
                {agendamento?.tipoAtendimento === 'online' && agendamento?.urlMeet && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.open(agendamento.urlMeet!, '_blank', 'noopener,noreferrer')}
                    className="border-2 border-blue-300 text-blue-700 hover:border-blue-400 hover:bg-blue-50 font-semibold px-6 transition-all duration-200"
                  >
                    <span className="mr-2">📹</span>
                    Entrar no Meet
                  </Button>
                )}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                  className="border-2 border-gray-300 text-gray-700 hover:border-red-400 hover:bg-red-50 hover:text-red-700 font-semibold px-6 transition-all duration-200"
                >
                  <span className="mr-2">🔴</span>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl font-semibold px-8 transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <span className="mr-2">⏳</span>
                      Registrando...
                    </>
                  ) : (
                    <>
                      <span className="mr-2">✅</span>
                      Registrar
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