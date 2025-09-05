import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDeleteAgendamentoModalProps {
  open: boolean;
  onClose: () => void;
  onConfirmSingle: () => void;
  onConfirmSeries: () => void;
  onConfirmThisAndFuture?: () => void; // Nova opção
  isLoading?: boolean;
  entityName: string;
  seriesCount: number; // inclui o atual
  futureCount?: number; // agendamentos futuros (para "esta e futuras")
}

export default function ConfirmDeleteAgendamentoModal({
  open,
  onClose,
  onConfirmSingle,
  onConfirmSeries,
  onConfirmThisAndFuture,
  isLoading = false,
  entityName,
  seriesCount,
  futureCount = 0
}: ConfirmDeleteAgendamentoModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !isLoading && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">🗑️</span>
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900">
            <span className="bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
              Excluir Agendamento
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="text-center py-2">
          <p className="text-gray-700 mb-3">Selecione o que deseja excluir</p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <span className="font-bold text-red-800 text-lg">{entityName}</span>
          </div>
          <div className="text-sm text-gray-600 mb-2">Recorrências encontradas: <span className="font-semibold">{seriesCount}</span></div>
          <div className="flex flex-col gap-3">
            <Button
              disabled={isLoading}
              onClick={onConfirmSingle}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            >
              {isLoading ? 'Excluindo...' : 'Excluir somente este'}
            </Button>
            {futureCount > 0 && onConfirmThisAndFuture && (
              <Button
                disabled={isLoading}
                onClick={onConfirmThisAndFuture}
                variant="outline"
                className="w-full border-2 border-orange-300 text-orange-700 bg-white hover:bg-orange-50 hover:text-orange-800 hover:border-orange-400 focus:ring-2 focus:ring-orange-200 font-semibold transition-all duration-200"
              >
                {isLoading ? 'Excluindo...' : `Excluir esta e futuras (${futureCount + 1})`}
              </Button>
            )}
            <Button
              disabled={isLoading || seriesCount <= 1}
              onClick={onConfirmSeries}
              variant="outline"
              className="w-full border-2 border-red-300 text-red-700 bg-white hover:bg-red-50 hover:text-red-800 hover:border-red-400 focus:ring-2 focus:ring-red-200 font-semibold transition-all duration-200 disabled:opacity-60"
            >
              {isLoading ? 'Excluindo...' : `Excluir toda a recorrência (${seriesCount})`}
            </Button>
          </div>
        </div>

        <DialogFooter className="flex gap-3 pt-4">
          <Button 
            variant="ghost"
            disabled={isLoading} 
            onClick={onClose} 
            className="flex-1 border border-transparent hover:bg-gray-50 hover:text-gray-700 font-semibold transition-all duration-200"
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


