import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info, 
  HelpCircle,
  AlertCircle,
  Zap
} from 'lucide-react';

export type ConfirmationType = 
  | 'warning' 
  | 'danger' 
  | 'success' 
  | 'info' 
  | 'question'
  | 'error'
  | 'alert';

export interface ConfirmationAction {
  label: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  className?: string;
  onClick: () => void;
}

export interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  type?: ConfirmationType;
  title: string;
  description?: string;
  details?: string[];
  entityName?: string;
  entityType?: string;
  customIcon?: React.ReactNode;
  actions?: ConfirmationAction[];
  defaultActions?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  loadingText?: string;
  showCloseButton?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const typeConfig = {
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-yellow-500',
    bgColor: 'bg-gradient-to-r from-yellow-50 to-orange-50',
    borderColor: 'border-yellow-200',
    badgeColor: 'bg-yellow-100 text-yellow-800',
    confirmVariant: 'default' as const,
    confirmClass: 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700'
  },
  danger: {
    icon: XCircle,
    iconColor: 'text-red-500',
    bgColor: 'bg-gradient-to-r from-red-50 to-pink-50',
    borderColor: 'border-red-200',
    badgeColor: 'bg-red-100 text-red-800',
    confirmVariant: 'destructive' as const,
    confirmClass: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
  },
  success: {
    icon: CheckCircle,
    iconColor: 'text-green-500',
    bgColor: 'bg-gradient-to-r from-green-50 to-emerald-50',
    borderColor: 'border-green-200',
    badgeColor: 'bg-green-100 text-green-800',
    confirmVariant: 'default' as const,
    confirmClass: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-500',
    bgColor: 'bg-gradient-to-r from-blue-50 to-indigo-50',
    borderColor: 'border-blue-200',
    badgeColor: 'bg-blue-100 text-blue-800',
    confirmVariant: 'default' as const,
    confirmClass: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
  },
  question: {
    icon: HelpCircle,
    iconColor: 'text-purple-500',
    bgColor: 'bg-gradient-to-r from-purple-50 to-violet-50',
    borderColor: 'border-purple-200',
    badgeColor: 'bg-purple-100 text-purple-800',
    confirmVariant: 'default' as const,
    confirmClass: 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700'
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-red-600',
    bgColor: 'bg-gradient-to-r from-red-50 to-red-100',
    borderColor: 'border-red-300',
    badgeColor: 'bg-red-100 text-red-900',
    confirmVariant: 'destructive' as const,
    confirmClass: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
  },
  alert: {
    icon: Zap,
    iconColor: 'text-orange-500',
    bgColor: 'bg-gradient-to-r from-orange-50 to-amber-50',
    borderColor: 'border-orange-200',
    badgeColor: 'bg-orange-100 text-orange-800',
    confirmVariant: 'default' as const,
    confirmClass: 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700'
  }
};

const maxWidthClasses = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl'
};

/**
 * GUIA DE USO DO CONFIRMATION DIALOG:
 * 
 * === TIPOS DISPONÍVEIS ===
 * 🟡 warning:  Para alertas e avisos importantes
 * 🔴 danger:   Para ações destrutivas (exclusões, cancelamentos)
 * 🟢 success:  Para confirmações de sucesso
 * 🔵 info:     Para informações e notificações
 * 🟣 question: Para perguntas ao usuário
 * ❌ error:    Para erros críticos que requerem confirmação
 * 🟠 alert:    Para alertas urgentes ou inconsistências
 * 
 * === USO BÁSICO ===
 * <ConfirmationDialog
 *   open={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   type="warning"
 *   title="Confirmar Ação"
 *   description="Tem certeza que deseja continuar?"
 *   onConfirm={handleConfirm}
 *   onCancel={handleCancel}
 * />
 * 
 * === USO AVANÇADO COM AÇÕES CUSTOMIZADAS ===
 * <ConfirmationDialog
 *   open={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   type="alert"
 *   title="Recurso Inconsistente"
 *   description="O recurso não está configurado para este profissional."
 *   details={["Recurso: Sala 1", "Profissional: Dr. João"]}
 *   actions={[
 *     {
 *       label: "Continuar Mesmo Assim",
 *       onClick: () => handleContinue(),
 *       className: "bg-orange-600 hover:bg-orange-700"
 *     },
 *     {
 *       label: "Escolher Outro Recurso",
 *       variant: "outline",
 *       onClick: () => handleCancel()
 *     }
 *   ]}
 * />
 */
export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onClose,
  type = 'question',
  title,
  description,
  details,
  entityName,
  entityType,
  customIcon,
  actions,
  defaultActions = true,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  loading = false,
  loadingText = 'Processando...',
  showCloseButton = true,
  maxWidth = 'md'
}) => {
  const config = typeConfig[type];
  const IconComponent = config.icon;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  const renderDefaultActions = () => (
    <div className="flex gap-3 justify-end">
      <Button
        variant="outline"
        onClick={handleCancel}
        disabled={loading}
        className="border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 font-semibold px-6 transition-all duration-200"
      >
        {cancelText}
      </Button>
      <Button
        variant={config.confirmVariant}
        onClick={handleConfirm}
        disabled={loading}
        className={`${config.confirmClass} shadow-lg hover:shadow-xl font-semibold px-8 transition-all duration-200`}
      >
        {loading ? loadingText : confirmText}
      </Button>
    </div>
  );

  const renderCustomActions = () => (
    <div className="flex gap-3 justify-end flex-wrap">
      {actions?.map((action, index) => (
        <Button
          key={index}
          variant={action.variant || 'default'}
          onClick={action.onClick}
          disabled={loading}
          className={action.className || ''}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={showCloseButton ? onClose : undefined}>
      <DialogContent className={`${maxWidthClasses[maxWidth]} ${config.bgColor} ${config.borderColor} border-2`}>
        <DialogHeader>
          <DialogTitle className="flex items-start gap-4 text-lg font-semibold text-gray-800">
            <div className={`flex-shrink-0 w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center ${config.borderColor} border`}>
              {customIcon || <IconComponent className={`w-6 h-6 ${config.iconColor}`} />}
            </div>
            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span>{title}</span>
                {type && (
                  <Badge className={`${config.badgeColor} text-xs font-medium px-2 py-1`}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Badge>
                )}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Descrição principal */}
          {description && (
            <div className="text-gray-700 leading-relaxed">
              {description}
            </div>
          )}

          {/* Detalhes adicionais */}
          {details && details.length > 0 && (
            <div className="bg-white/70 rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-gray-600" />
                Detalhes:
              </h4>
              <ul className="space-y-1">
                {details.map((detail, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0"></span>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Informações da entidade */}
          {entityName && entityType && (
            <div className="bg-white/50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">{entityType}:</span>
                <span className="text-sm font-semibold text-gray-800">{entityName}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6">
          {actions && actions.length > 0 ? renderCustomActions() : (defaultActions && renderDefaultActions())}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Hook para facilitar o uso do componente
export const useConfirmationDialog = () => {
  const [dialogState, setDialogState] = React.useState<{
    open: boolean;
    config: Partial<ConfirmationDialogProps>;
  }>({
    open: false,
    config: {}
  });

  const showConfirmation = (config: Omit<ConfirmationDialogProps, 'open' | 'onClose'>) => {
    setDialogState({
      open: true,
      config
    });
  };

  const hideConfirmation = () => {
    setDialogState(prev => ({
      ...prev,
      open: false
    }));
  };

  const ConfirmationDialogComponent = () => (
    <ConfirmationDialog
      {...dialogState.config}
      open={dialogState.open}
      onClose={hideConfirmation}
    />
  );

  return {
    showConfirmation,
    hideConfirmation,
    ConfirmationDialog: ConfirmationDialogComponent
  };
};

export default ConfirmationDialog;