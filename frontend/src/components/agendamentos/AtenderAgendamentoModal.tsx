import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, User, Calendar, Clock, FileText, CreditCard, CheckCircle2, UserCheck, Monitor, MapPin } from 'lucide-react';
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
      await atenderAgendamento(agendamento.id, formData);
      AppToast.updated('Agendamento', 'O atendimento foi registrado com sucesso!');
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
        <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 -mx-6 -mt-6 px-6 pt-6 pb-4 border-b border-gray-200">
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-2xl">🩺</span>
            Registrar Atendimento
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* Informações do Agendamento */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Informações do Agendamento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-gray-600">Paciente:</span>
                <span className="text-gray-800 font-medium">{agendamento.pacienteNome}</span>
              </div>
              <div className="flex items-center gap-3">
                <UserCheck className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-gray-600">Profissional:</span>
                <span className="text-gray-800 font-medium">{agendamento.profissionalNome}</span>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-gray-600">Convênio:</span>
                <span className="text-gray-800">{agendamento.convenioNome}</span>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-gray-600">Serviço:</span>
                <span className="text-gray-800">{agendamento.servicoNome}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-gray-600">Data:</span>
                <span className="text-gray-800 font-medium">{data}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-gray-600">Hora:</span>
                <span className="text-gray-800 font-medium">{hora}</span>
              </div>
              <div className="flex items-center gap-3">
                <Monitor className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-gray-600">Tipo:</span>
                <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">
                  {agendamento.tipoAtendimento}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-gray-600">Recurso:</span>
                <span className="text-gray-800">{agendamento.recursoNome || '-'}</span>
              </div>
            </div>
          </div>

          {/* Dados de Liberação - Sempre exibir */}
          <div>
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Dados da Liberação
              </h3>
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 text-sm p-4 rounded-lg border ${
                agendamento.codLiberacao || agendamento.statusCodLiberacao || agendamento.dataCodLiberacao
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-600">Código:</span>
                  <span className={`font-mono px-3 py-1 rounded border font-medium ${
                    agendamento.codLiberacao 
                      ? 'bg-white text-green-800' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {agendamento.codLiberacao || 'Aguardando'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-600">Status:</span>
                  <Badge 
                    className={`text-xs ${
                      agendamento.statusCodLiberacao === 'APROVADO'
                        ? 'bg-green-100 text-green-700 border-green-300'
                        : agendamento.statusCodLiberacao
                        ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                        : 'bg-gray-100 text-gray-500 border-gray-300'
                    }`}
                  >
                    {agendamento.statusCodLiberacao || 'Pendente'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-600">Data:</span>
                  <span className={`font-medium ${
                    agendamento.dataCodLiberacao ? 'text-gray-800' : 'text-gray-500'
                  }`}>
                    {agendamento.dataCodLiberacao ? formatarApenasData(agendamento.dataCodLiberacao) : 'Aguardando'}
                  </span>
                </div>
              </div>
            </div>

          {/* Formulário de Atendimento */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-blue-600" />
              Registro do Atendimento
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-4 text-sm">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-gray-700 min-w-fit">Data do Atendimento:</span>
                  <Input
                    id="dataAtendimento"
                    type="date"
                    value={formData.dataAtendimento}
                    onChange={(e) => setFormData(prev => ({ ...prev, dataAtendimento: e.target.value }))}
                    required
                    max={new Date().toISOString().split('T')[0]}
                    className="w-auto border-2 border-blue-200 focus:border-blue-500 bg-white"
                  />
                </div>
              </div>
            </form>
          </div>
        </div>

        <DialogFooter className="gap-2 mt-6">
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
            onClick={handleSubmit}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl font-semibold px-8 transition-all duration-200"
            disabled={loading}
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
      </DialogContent>
    </Dialog>
  );
}; 