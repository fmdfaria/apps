import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAgendamentoForm } from './hooks/useAgendamentoForm';
import { FluxoSelecao } from './components/FluxoSelecao';
import { FormularioPorProfissional } from './components/FormularioPorProfissional';
import { FormularioPorData } from './components/FormularioPorData';
import { createAgendamento } from '@/services/agendamentos';
import { toast } from 'sonner';
import type { CriarAgendamentoModalProps } from './types/agendamento-form';

export const CriarAgendamentoModal: React.FC<CriarAgendamentoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preenchimentoInicial
}) => {
  const context = useAgendamentoForm({
    isOpen,
    preenchimentoInicial,
    onSuccess,
    onClose
  });

  const { state, loadingState, updateTipoFluxo, resetForm } = context;
  const { tipoFluxo } = state;
  const { loading, loadingData } = loadingState;

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const handleVoltar = () => {
    resetForm();
    updateTipoFluxo(null);
    // Recarregar dados após resetar o formulário
    context.carregarDados();
  };

  const handleFluxoSelecionado = (fluxo: 'por-profissional' | 'por-data') => {
    updateTipoFluxo(fluxo);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!state.formData.pacienteId || !state.formData.profissionalId || !state.formData.servicoId || 
        !state.formData.convenioId || !state.formData.recursoId || !state.dataAgendamento || !state.horaAgendamento) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Combinar data e hora
    const dataHoraCombinada = `${state.dataAgendamento}T${state.horaAgendamento}`;
    
    // Validação adicional: verificar se a data/hora não é no passado
    const dataHoraSelecionada = new Date(dataHoraCombinada);
    const agora = new Date();
    
    if (dataHoraSelecionada <= agora) {
      toast.error('A data e hora do agendamento deve ser no futuro');
      return;
    }

    try {
      const dadosParaEnvio = {
        ...state.formData,
        dataHoraInicio: dataHoraCombinada,
        recorrencia: state.temRecorrencia ? {
          tipo: state.recorrencia.tipo,
          ...(state.recorrencia.repeticoes && { repeticoes: state.recorrencia.repeticoes }),
          ...(state.recorrencia.ate && { ate: state.recorrencia.ate })
        } : undefined
      };

      await createAgendamento(dadosParaEnvio);
      toast.success('Agendamento criado com sucesso!');
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      toast.error('Erro ao criar agendamento');
    }
  };

  // Se o tipo de fluxo não foi selecionado, mostrar seleção
  if (!tipoFluxo) {
    return (
      <FluxoSelecao
        isOpen={isOpen}
        onClose={handleClose}
        onFluxoSelecionado={handleFluxoSelecionado}
      />
    );
  }

  // Conteúdo do formulário baseado no tipo de fluxo selecionado
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 -mx-6 -mt-6 px-6 pt-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleVoltar}
              className="p-2 hover:bg-blue-100"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <span className="text-2xl">📅</span>
                Novo Agendamento - {tipoFluxo === 'por-profissional' ? 'Por Profissional' : 'Por Data'}
                {loadingData && (
                  <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Carregando dados...
                  </div>
                )}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="mt-4 space-y-6">
            {tipoFluxo === 'por-profissional' ? (
              <FormularioPorProfissional context={context} />
            ) : (
              <FormularioPorData context={context} />
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleVoltar}
              disabled={loading || loadingData}
              className="border-2 border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 font-semibold px-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading || loadingData}
              className="border-2 border-gray-300 text-gray-700 hover:border-red-400 hover:bg-red-50 hover:text-red-700 font-semibold px-6"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || loadingData}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl font-semibold px-8"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Criando...
                </>
              ) : loadingData ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Carregando...
                </>
              ) : (
                <>
                  <span className="mr-2">✅</span>
                  Criar Agendamento
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};