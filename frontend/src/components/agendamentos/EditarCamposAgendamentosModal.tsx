import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Save, X, Calendar, Clock, User, FileText, CheckCircle, XCircle, UserCheck, CreditCard, Monitor, MapPin, Hash } from 'lucide-react';
import type { Agendamento } from '@/types/Agendamento';
import { AppToast } from '@/services/toast';
import api from '@/services/api';
import { processarErroBackend } from '@/utils/MensagensErro';

interface EditarCamposAgendamentosModalProps {
  isOpen: boolean;
  agendamento: Agendamento | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditarCamposAgendamentosModal: React.FC<EditarCamposAgendamentosModalProps> = ({
  isOpen,
  agendamento,
  onClose,
  onSuccess,
}) => {
  const [codLiberacao, setCodLiberacao] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && agendamento) {
      // Deixar o campo "Novo Valor" sempre vazio ao abrir o modal
      setCodLiberacao('');
    } else {
      setCodLiberacao('');
    }
  }, [isOpen, agendamento]);

  const handleSave = async () => {
    if (!agendamento) return;

    setSaving(true);

    try {
      // Trim e converte string vazia para null
      const valorCodLiberacao = codLiberacao.trim() || null;

      await api.put(`/agendamentos/${agendamento.id}`, {
        codLiberacao: valorCodLiberacao,
        // Include other required fields that shouldn't change
        pacienteId: agendamento.pacienteId,
        profissionalId: agendamento.profissionalId,
        servicoId: agendamento.servicoId,
        convenioId: agendamento.convenioId,
        recursoId: agendamento.recursoId,
        tipoAtendimento: agendamento.tipoAtendimento,
        status: agendamento.status,
        dataHoraInicio: agendamento.dataHoraInicio
      });

      AppToast.success('Campos atualizados', {
        description: 'Os campos do agendamento foram atualizados com sucesso.'
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao atualizar campos do agendamento:', error);
      const mensagemMelhorada = processarErroBackend(error);
      AppToast.error('Erro ao atualizar campos', {
        description: mensagemMelhorada
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  // Funções para status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'AGENDADO':
        return <Calendar className="w-3 h-3" />;
      case 'LIBERADO':
        return <CheckCircle className="w-3 h-3" />;
      case 'ATENDIDO':
        return <User className="w-3 h-3" />;
      case 'FINALIZADO':
        return <CheckCircle className="w-3 h-3" />;
      case 'CANCELADO':
        return <XCircle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AGENDADO':
        return 'bg-blue-100 text-blue-800 border-blue-300';
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

  if (!agendamento) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xl">
              <span className="text-2xl">✏️</span>
              Editar Campos do Agendamento
            </span>
            <div className="flex items-center gap-3 mr-8">
              <Badge className={`${getStatusColor(agendamento.status)} flex items-center gap-1 text-xs`}>
                {getStatusIcon(agendamento.status)}
                {agendamento.status}
              </Badge>
              {saving && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  Salvando...
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Agendamento - Layout compacto */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Informações do Agendamento</h4>
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
                <span className="text-gray-700">{new Date(agendamento.dataHoraInicio).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Hora:</span>
                <span className="text-gray-700">{new Date(agendamento.dataHoraInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
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

          {/* Campos Editáveis */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Campos Editáveis
            </h4>

            <div className="space-y-4">
              {/* Campo Código de Liberação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Código de Liberação
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {/* Valor Atual */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">
                      Valor Atual
                    </label>
                    <div className="bg-gray-100 border-2 border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 min-h-[42px] flex items-center">
                      {agendamento.codLiberacao || '-'}
                    </div>
                  </div>

                  {/* Novo Valor */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-2">
                      Novo Valor
                    </label>
                    <Input
                      type="text"
                      value={codLiberacao}
                      onChange={(e) => setCodLiberacao(e.target.value)}
                      placeholder="Digite o novo código"
                      className="border-2 border-blue-200 focus:border-blue-500"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Código de liberação do convênio/plano de saúde
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={saving}
            className="border-2 border-gray-300 text-gray-700 hover:border-red-400 hover:bg-red-50 hover:text-red-700 font-semibold px-6"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl font-semibold px-8"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Salvando...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Salvar Alterações
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
