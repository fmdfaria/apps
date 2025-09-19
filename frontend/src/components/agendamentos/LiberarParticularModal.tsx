import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, User, Calendar, Clock, FileText, CreditCard, UserCheck, Monitor, MapPin, Users } from 'lucide-react';
import type { Agendamento } from '@/types/Agendamento';
import { liberarAgendamentoParticular, liberarAgendamentosParticularesMensal, getAgendamentos } from '@/services/agendamentos';
import { AppToast } from '@/services/toast';
import { formatarDataHoraLocal } from '@/utils/dateUtils';
import ContaReceberModal from '@/pages/financeiro/ContaReceberModal';
import { createContaReceber } from '@/services/contas-receber';

// Interface para dados do grupo mensal
interface GrupoMensal {
  pacienteId: string;
  profissionalId: string;
  servicoId: string;
  mesAno: string; // formato "2024-09"
  mesAnoDisplay: string; // formato "Setembro 2024"
  quantidadeAgendamentos: number;
  precoTotal: number;
  pagamentoAntecipado?: boolean; // Informação se é pagamento antecipado
}

interface LiberarParticularModalProps {
  isOpen: boolean;
  agendamento: Agendamento | null;
  grupo?: GrupoMensal | null; // Dados do grupo se for liberação mensal
  pagamentoAntecipado?: boolean; // Para agendamentos individuais
  onClose: () => void;
  onSuccess: () => void;
}

export const LiberarParticularModal: React.FC<LiberarParticularModalProps> = ({
  isOpen,
  agendamento,
  grupo,
  pagamentoAntecipado,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [sessionNumber, setSessionNumber] = useState<number | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showContaReceberModal, setShowContaReceberModal] = useState(false);
  const [contaReceberData, setContaReceberData] = useState<any>(null);
  const [formData, setFormData] = useState({
    recebimento: false,
    dataLiberacao: new Date().toISOString().split('T')[0] // Data de hoje
  });

  const resetForm = () => {
    setFormData({
      recebimento: false,
      dataLiberacao: new Date().toISOString().split('T')[0]
    });
    setShowContaReceberModal(false);
    setContaReceberData(null);
  };

  const handleRecebimentoChange = (checked: boolean) => {
    if (checked) {
      // Marca o checkbox imediatamente
      setFormData(prev => ({ 
        ...prev, 
        recebimento: true 
      }));
      // Preparar dados para o modal de conta a receber
      prepararDadosContaReceber();
    } else {
      // Quando desmarca, resetar as opções
      setFormData(prev => ({ 
        ...prev, 
        recebimento: false 
      }));
    }
  };

  const prepararDadosContaReceber = () => {
    if (!agendamento) return;

    // Preparar dados pré-preenchidos para a conta a receber
    const dadosPreenchidos = {
      descricao: `Pagamento particular - ${agendamento.servicoNome} - ${agendamento.pacienteNome}`,
      pacienteId: agendamento.pacienteId,
      convenioId: agendamento.convenioId || '',
      numeroDocumento: `AGD-${agendamento.id.slice(-8)}`,
      dataEmissao: new Date().toISOString().split('T')[0],
      dataVencimento: formData.dataLiberacao,
      observacoes: `Gerado automaticamente pela liberação do agendamento ${agendamento.id}`,
      // Status será RECEBIDO com data de recebimento preenchida
      status: 'RECEBIDO',
      dataRecebimento: formData.dataLiberacao,
      formaRecebimento: 'DINHEIRO'
    };

    setContaReceberData(dadosPreenchidos);
    setShowContaReceberModal(true);
  };

  const handleSaveContaReceber = async (dadosConta: any) => {
    try {
      // Criar a conta a receber
      await createContaReceber(dadosConta);
      
      AppToast.created('Conta a Receber', 'Conta a receber criada com sucesso!');
      
      // Fechar o modal
      setShowContaReceberModal(false);
      setContaReceberData(null);
    } catch (error: any) {
      AppToast.error('Erro ao criar conta a receber', {
        description: error.response?.data?.message || 'Erro inesperado ao criar conta a receber'
      });
    }
  };

  const handleCloseContaReceberModal = () => {
    setShowContaReceberModal(false);
    setContaReceberData(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agendamento) return;
    
    // Validações baseadas no tipo de pagamento
    if (isPagamentoAntecipado && !formData.recebimento) {
      AppToast.validation('Campos obrigatórios', 'Para pagamento antecipado é obrigatório marcar o recebimento do pagamento para continuar.');
      return;
    }

    if (!formData.dataLiberacao) {
      AppToast.validation('Campos obrigatórios', 'Informe a data da liberação para continuar.');
      return;
    }

    setLoading(true);
    try {
      if (grupo) {
        // Liberação em grupo (mensal)
        const resultado = await liberarAgendamentosParticularesMensal({
          pacienteId: grupo.pacienteId,
          profissionalId: grupo.profissionalId,
          servicoId: grupo.servicoId,
          mesAno: grupo.mesAno,
          recebimento: formData.recebimento,
          dataLiberacao: formData.dataLiberacao,
          pagamentoAntecipado: grupo.pagamentoAntecipado
        });
        
        AppToast.updated('Grupo Liberado', `${resultado.totalLiberados} agendamentos particulares foram liberados com sucesso para ${grupo.mesAnoDisplay}!`);
      } else {
        // Liberação individual
        await liberarAgendamentoParticular(agendamento.id, {
          recebimento: formData.recebimento,
          dataLiberacao: formData.dataLiberacao,
          pagamentoAntecipado: pagamentoAntecipado
        });
        AppToast.updated('Agendamento', 'O agendamento particular foi liberado com sucesso!');
      }
      
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao liberar agendamento particular:', error);
      
      // Para erros 403 (acesso negado), o interceptador da API já trata
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
        if (axiosError.response?.status === 403) {
          // Interceptador da API já mostrou o toast de acesso negado, não duplicar
          return;
        }
        
        // Para outros erros, extrair mensagem do backend se disponível
        const errorMessage = axiosError.response?.data?.message || 'Não foi possível liberar o agendamento. Tente novamente.';
        AppToast.error('Erro ao liberar agendamento', {
          description: errorMessage
        });
      } else {
        AppToast.error('Erro ao liberar agendamento', {
          description: 'Não foi possível liberar o agendamento. Tente novamente.'
        });
      }
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
  
  // Determinar se é pagamento antecipado
  const isPagamentoAntecipado = grupo?.pagamentoAntecipado ?? pagamentoAntecipado ?? false;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
              {grupo ? 'Liberação de Grupo Particular' : 'Liberação de Agendamento Particular'}
            </span>
            <span className="flex items-center gap-2 mr-8">
              {grupo && (
                <Badge className="bg-purple-100 text-purple-700">
                  {grupo.quantidadeAgendamentos} agendamentos
                </Badge>
              )}
              {!grupo && sessionNumber !== null && (
                <Badge className="bg-emerald-100 text-emerald-700">
                  Sessão #{sessionNumber}
                </Badge>
              )}
              <Badge className="bg-blue-100 text-blue-700">
                {grupo ? grupo.mesAnoDisplay : agendamento.status}
              </Badge>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações específicas do grupo */}
          {grupo && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-purple-800 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Liberação em Grupo - {grupo.mesAnoDisplay}
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-500" />
                  <span className="font-medium">Quantidade:</span>
                  <span className="text-purple-700">{grupo.quantidadeAgendamentos} agendamentos</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-purple-500" />
                  <span className="font-medium">Valor Total:</span>
                  <span className="text-purple-700">{grupo.precoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>
              <p className="text-xs text-purple-600 mt-2">
                ⚠️ Esta ação irá liberar TODOS os agendamentos deste grupo mensal
              </p>
            </div>
          )}

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
                  <Label className="text-base font-medium">
                    Recebimento {isPagamentoAntecipado ? '*' : '(Opcional)'}
                  </Label>
                  <div className={`flex items-center space-x-3 p-3 border rounded-md ${
                    isPagamentoAntecipado ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}>
                    <Checkbox
                      id="recebimento"
                      checked={formData.recebimento}
                      onCheckedChange={handleRecebimentoChange}
                    />
                    <div className="flex flex-col">
                      <label 
                        htmlFor="recebimento"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Recebido do paciente
                      </label>
                      {isPagamentoAntecipado && (
                        <span className="text-xs text-red-600 mt-1">
                          ⚠️ Obrigatório para pagamento antecipado
                        </span>
                      )}
                      {!isPagamentoAntecipado && (
                        <span className="text-xs text-gray-500 mt-1">
                          ℹ️ Opcional para pagamento não antecipado
                        </span>
                      )}
                    </div>
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
                      {grupo ? `Liberar Grupo (${grupo.quantidadeAgendamentos})` : 'Liberar Particular'}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Modal de criação de conta a receber */}
    <ContaReceberModal
      isOpen={showContaReceberModal}
      conta={contaReceberData}
      onClose={handleCloseContaReceberModal}
      onSave={handleSaveContaReceber}
    />
    </>
  );
};