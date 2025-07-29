import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, User, Calendar, Clock, FileText, CreditCard } from 'lucide-react';
import type { Agendamento } from '@/types/Agendamento';
import { liberarAgendamento } from '@/services/agendamentos';
import { toast } from 'sonner';

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
    statusCodLiberacao: '',
    dataCodLiberacao: new Date().toISOString().split('T')[0] // Data de hoje
  });

  const resetForm = () => {
    setFormData({
      codLiberacao: '',
      statusCodLiberacao: '',
      dataCodLiberacao: new Date().toISOString().split('T')[0]
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agendamento) return;
    
    // Validações
    if (!formData.codLiberacao || !formData.statusCodLiberacao) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      await liberarAgendamento(agendamento.id, formData);
      toast.success('Agendamento liberado com sucesso!');
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao liberar agendamento:', error);
      toast.error('Erro ao liberar agendamento');
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

  const formatarDataHora = (dataISO: string) => {
    const data = new Date(dataISO);
    return {
      data: data.toLocaleDateString('pt-BR'),
      hora: data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  if (!agendamento) return null;

  const { data, hora } = formatarDataHora(agendamento.dataHoraInicio);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CheckCircle className="w-6 h-6 text-green-600" />
            Liberação de Agendamento
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
                  <Badge className="bg-blue-100 text-blue-700">
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

          {/* Formulário de Liberação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="w-5 h-5" />
                Dados de Liberação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Código de Liberação */}
                  <div className="space-y-2">
                    <Label htmlFor="codLiberacao">Código de Liberação *</Label>
                    <Input
                      id="codLiberacao"
                      type="text"
                      placeholder="Ex: LIB123456"
                      value={formData.codLiberacao}
                      onChange={(e) => setFormData(prev => ({ ...prev, codLiberacao: e.target.value.toUpperCase() }))}
                      required
                    />
                  </div>

                  {/* Status da Liberação */}
                  <div className="space-y-2">
                    <Label htmlFor="statusCodLiberacao">Status da Liberação *</Label>
                    <Select 
                      value={formData.statusCodLiberacao} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, statusCodLiberacao: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="APROVADO">APROVADO</SelectItem>
                        <SelectItem value="PENDENTE">PENDENTE</SelectItem>
                        <SelectItem value="EM_ANALISE">EM ANÁLISE</SelectItem>
                        <SelectItem value="REPROVADO">REPROVADO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Data da Liberação */}
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="dataCodLiberacao">Data da Liberação *</Label>
                    <Input
                      id="dataCodLiberacao"
                      type="date"
                      value={formData.dataCodLiberacao}
                      onChange={(e) => setFormData(prev => ({ ...prev, dataCodLiberacao: e.target.value }))}
                      required
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2 mt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleClose}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-green-600 hover:bg-green-700"
                    disabled={loading}
                  >
                    {loading ? 'Liberando...' : 'Confirmar Liberação'}
                  </Button>
                </DialogFooter>
              </form>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 