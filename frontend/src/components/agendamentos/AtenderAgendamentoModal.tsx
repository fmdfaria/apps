import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, User, Calendar, Clock, FileText, CreditCard, CheckCircle2 } from 'lucide-react';
import type { Agendamento } from '@/types/Agendamento';
import { atenderAgendamento } from '@/services/agendamentos';
import { toast } from 'sonner';

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
  const [formData, setFormData] = useState({
    dataAtendimento: new Date().toISOString().split('T')[0], // Data de hoje
    observacoesAtendimento: ''
  });

  const resetForm = () => {
    setFormData({
      dataAtendimento: new Date().toISOString().split('T')[0],
      observacoesAtendimento: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agendamento) return;
    
    // Validações
    if (!formData.dataAtendimento) {
      toast.error('A data de atendimento é obrigatória');
      return;
    }

    setLoading(true);
    try {
      await atenderAgendamento(agendamento.id, formData);
      toast.success('Atendimento registrado com sucesso!');
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao registrar atendimento:', error);
      toast.error('Erro ao registrar atendimento');
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
            <Stethoscope className="w-6 h-6 text-blue-600" />
            Registrar Atendimento
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
                  <Badge className="bg-green-100 text-green-700">
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
                    <span>{agendamento.dataCodLiberacao ? new Date(agendamento.dataCodLiberacao).toLocaleDateString('pt-BR') : '-'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Formulário de Atendimento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Stethoscope className="w-5 h-5" />
                Registro do Atendimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Data do Atendimento */}
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

                {/* Observações */}
                <div className="space-y-2">
                  <Label htmlFor="observacoesAtendimento">Observações do Atendimento</Label>
                  <Textarea
                    id="observacoesAtendimento"
                    placeholder="Descreva como foi o atendimento, se houve intercorrências, etc..."
                    value={formData.observacoesAtendimento}
                    onChange={(e) => setFormData(prev => ({ ...prev, observacoesAtendimento: e.target.value }))}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-sm text-gray-500">
                    Registre informações importantes sobre o atendimento realizado.
                  </p>
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
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? 'Registrando...' : 'Registrar Atendimento'}
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