import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  entityName: string;
  entityType?: string;
  isLoading?: boolean;
  loadingText?: string;
  confirmText?: string;
  additionalMessage?: string;
}

export default function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  title = "Confirmar Exclusão",
  entityName,
  entityType = "item",
  isLoading = false,
  loadingText = "Excluindo...",
  confirmText = "Excluir",
  additionalMessage
}: ConfirmDeleteModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && !isLoading && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900">
            <span className="bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
              {title}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="text-center py-4">
          <p className="text-gray-700 mb-3">
            Tem certeza que deseja excluir {entityType === "item" ? "o item" : `o ${entityType}`}
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <span className="font-bold text-red-800 text-lg">{entityName}</span>
          </div>
          {additionalMessage && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 text-left">
              <div className="flex items-start gap-2">
                <span className="text-lg">ℹ️</span>
                <span className="text-sm text-blue-800">{additionalMessage}</span>
              </div>
            </div>
          )}
          <div className="flex items-center justify-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
            <span className="text-lg">🚨</span>
            <span className="font-medium">Esta ação não pode ser desfeita</span>
          </div>
        </div>
        <DialogFooter className="flex gap-3 pt-6">
          <Button 
            variant="outline"
            disabled={isLoading} 
            onClick={onClose} 
            className="flex-1 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 hover:text-gray-700 font-semibold transition-all duration-200"
          >
            <span className="mr-2">↩️</span>
            Cancelar
          </Button>
          <Button 
            disabled={isLoading} 
            onClick={onConfirm}
            className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 font-semibold shadow-md hover:shadow-lg transition-all duration-200"
          >
            <span className="mr-2">{isLoading ? '⏳' : '♻️'}</span>
            {isLoading ? loadingText : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}