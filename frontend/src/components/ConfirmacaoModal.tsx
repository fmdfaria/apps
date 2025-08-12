import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmacaoModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel?: () => void; // Handler opcional para o botão cancelar
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  loadingText?: string;
  variant?: 'default' | 'warning' | 'danger';
  icon?: React.ReactNode;
}

export default function ConfirmacaoModal({
  open,
  onClose,
  onConfirm,
  onCancel,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isLoading = false,
  loadingText = 'Processando...',
  variant = 'default',
  icon
}: ConfirmacaoModalProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          confirmButton: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
          defaultIcon: <AlertTriangle className="w-6 h-6" />
        };
      case 'danger':
        return {
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          confirmButton: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
          defaultIcon: <AlertTriangle className="w-6 h-6" />
        };
      default:
        return {
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          confirmButton: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          defaultIcon: <AlertTriangle className="w-6 h-6" />
        };
    }
  };

  const styles = getVariantStyles();
  const displayIcon = icon || styles.defaultIcon;

  return (
    <Dialog open={open} onOpenChange={() => !isLoading && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className={`flex items-center justify-center w-12 h-12 rounded-full ${styles.iconBg}`}>
              <div className={styles.iconColor}>
                {displayIcon}
              </div>
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {title}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>
        
        <DialogDescription className="text-sm text-gray-600 mt-4 leading-relaxed">
          {description}
        </DialogDescription>

        <DialogFooter className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={onCancel || onClose}
            disabled={isLoading}
            className="flex-1 border-2 border-gray-300 text-gray-700 hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700 transition-all duration-200"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 text-white ${styles.confirmButton} focus:ring-2 focus:ring-offset-2`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {loadingText}
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}