import React, { useEffect, useState } from 'react';
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
  // Número da sessão passa a ser usado do backend: agendamento.numeroSessao
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
      await liberarAgendamento(agendamento.id, {
        codLiberacao: formData.codLiberacao,
        statusCodLiberacao: 'APROVADO', // Default status quando não especificado
        dataCodLiberacao: formData.dataCodLiberacao // Enviar apenas a data no formato YYYY-MM-DD
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
  // Removido cálculo local de sessão

  if (!agendamento) return null;

  const { data, hora } = formatarDataHora(agendamento.dataHoraInicio);
  const conselhoSigla = agendamento.profissionalConselhoSigla || (agendamento as any).profissional?.conselho?.sigla || '-';
  const numeroConselho = agendamento.profissionalNumeroConselho || (agendamento as any).profissional?.numeroConselho || (agendamento as any).profissional?.numero_conselho || '-';
  const procPrimeiro = agendamento.servicoProcedimentoPrimeiro || (agendamento as any).servico?.procedimentoPrimeiroAtendimento || (agendamento as any).servico?.procedimento_primeiro_atendimento || '-';
  const procDemais = agendamento.servicoProcedimentoDemais || (agendamento as any).servico?.procedimentoDemaisAtendimentos || (agendamento as any).servico?.procedimento_demais_atendimentos || '-';
  const numeroCarteirinha = (agendamento as any).paciente?.numeroCarteirinha || (agendamento as any).paciente?.numero_carteirinha || '';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Liberação de Agendamento
            </span>
            <span className="flex items-center gap-2 mr-8">
              {typeof agendamento.numeroSessao === 'number' && (
                <Badge className="bg-emerald-100 text-emerald-700">
                  Sessão #{agendamento.numeroSessao}
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
                <span className="text-gray-700">{`${data} ${hora}`}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="font-medium">N° Carteirinha:</span>
                <span className="text-gray-700">{numeroCarteirinha || '-'}</span>
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
              {/* Linha 5 */}
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Conselho:</span>
                <span className="text-gray-700">{conselhoSigla}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Núm Conselho:</span>
                <span className="text-gray-700">{numeroConselho}</span>
              </div>
              {/* Linha 6 */}
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Procedimento 1º:</span>
                <span className="text-gray-700">{procPrimeiro}</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Procedimento Demais:</span>
                <span className="text-gray-700">{procDemais}</span>
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