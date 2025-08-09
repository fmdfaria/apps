import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Calendar, ArrowLeft } from 'lucide-react';
import { FormularioPorProfissional } from './FormularioPorProfissional';
import { FormularioPorData } from './FormularioPorData';
import type { TipoFluxo, AgendamentoFormContext } from '../types/agendamento-form';

interface FluxoSelecaoProps {
  isOpen: boolean;
  onClose: () => void;
  onFluxoSelecionado?: (fluxo: TipoFluxo) => void;
  context?: AgendamentoFormContext;
  onSubmit?: (e: React.FormEvent) => Promise<void>;
}

export const FluxoSelecao: React.FC<FluxoSelecaoProps> = ({
  isOpen,
  onClose,
  onFluxoSelecionado,
  context,
  onSubmit
}) => {
  const [tipoFluxoSelecionado, setTipoFluxoSelecionado] = useState<TipoFluxo | null>(null);

  const handleFluxoSelecionado = (fluxo: TipoFluxo) => {
    setTipoFluxoSelecionado(fluxo);
    context?.updateTipoFluxo(fluxo);
    
    // Se tem callback externo, usar ele (modo antigo)
    if (onFluxoSelecionado) {
      onFluxoSelecionado(fluxo);
    }
  };

  const handleVoltarParaFluxo = () => {
    setTipoFluxoSelecionado(null);
    context?.updateTipoFluxo(null);
  };

  const handleClose = () => {
    setTipoFluxoSelecionado(null);
    context?.updateTipoFluxo(null);
    onClose();
  };
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      {/* Tela de Seleção de Fluxo */}
      {!tipoFluxoSelecionado && (
        <DialogContent className="max-w-2xl">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 -mx-6 -mt-6 px-6 pt-6 pb-4 border-b border-gray-200">
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <span className="text-2xl">📅</span>
              Novo Agendamento
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-2">
              Escolha como deseja criar o agendamento:
            </p>
          </DialogHeader>

          <div className="mt-6 space-y-4">
            <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-300" 
                  onClick={() => handleFluxoSelecionado('por-profissional')}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">Por Profissional</h3>
                    <p className="text-sm text-gray-600">
                      Escolha primeiro o profissional e depois os demais dados do agendamento
                    </p>
                  </div>
                  <div className="text-2xl">👨‍⚕️</div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-green-300" 
                  onClick={() => handleFluxoSelecionado('por-data')}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">Por Data</h3>
                    <p className="text-sm text-gray-600">
                      Escolha primeiro a data e hora e depois os demais dados do agendamento
                    </p>
                  </div>
                  <div className="text-2xl">📅</div>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="border-2 border-gray-300 text-gray-700 hover:border-red-400 hover:bg-red-50 hover:text-red-700 font-semibold px-6"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      )}

      {/* Tela do Formulário - Idêntica ao AgendamentosPage */}
      {tipoFluxoSelecionado && context && (
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 -mx-6 -mt-6 px-6 pt-6 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleVoltarParaFluxo}
                className="p-2 hover:bg-blue-100"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex-1">
                <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <span className="text-2xl">📅</span>
                  Novo Agendamento - {tipoFluxoSelecionado === 'por-profissional' ? 'Por Profissional' : 'Por Data'}
                  {context.loadingState.loadingData && (
                    <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      Carregando dados...
                    </div>
                  )}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={onSubmit}>
            <div className="mt-4 space-y-6">
              {tipoFluxoSelecionado === 'por-profissional' ? (
                <FormularioPorProfissional context={context} />
              ) : tipoFluxoSelecionado === 'por-data' ? (
                <FormularioPorData context={context} />
              ) : null}
            </div>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}; 