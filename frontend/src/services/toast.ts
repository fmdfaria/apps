import { toast } from 'sonner';

// Definir estilos CSS customizados para diferentes tipos de toast
const toastStyles = {
  success: {
    style: {
      background: 'linear-gradient(135deg, #10b981, #059669)',
      border: '1px solid #10b981',
      color: 'white',
      boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.25)',
    }
  },
  error: {
    style: {
      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
      border: '1px solid #ef4444',
      color: 'white',
      boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.25)',
    }
  },
  warning: {
    style: {
      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
      border: '1px solid #f59e0b',
      color: 'white',
      boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.25)',
    }
  },
  info: {
    style: {
      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      border: '1px solid #3b82f6',
      color: 'white',
      boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.25)',
    }
  },
  accessDenied: {
    style: {
      background: 'linear-gradient(135deg, #dc2626, #991b1b)',
      border: '2px solid #dc2626',
      color: 'white',
      boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.4)',
    }
  }
};

export interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}
/**
 * GUIA DE USO DO SISTEMA DE TOAST PADRONIZADO:
 * 
 * === MÉTODOS BÁSICOS ===
 * 🟢 SUCESSO (Verde):     AppToast.success('Título', { description: 'Descrição opcional' })
 * 🔴 ERRO (Vermelho):     AppToast.error('Título', { description: 'Descrição opcional' })
 * 🟡 AVISO (Laranja):     AppToast.warning('Título', { description: 'Descrição opcional' })
 * 🔵 INFO (Azul):         AppToast.info('Título', { description: 'Descrição opcional' })
 * 🛡️ ACESSO NEGADO:       AppToast.accessDenied(routeName?, routeDescription?)
 * ⏳ LOADING:             const toastId = AppToast.loading('Carregando...')
 * 
 * === MÉTODOS CRUD (COM CORES E ÍCONES ESPECÍFICOS) ===
 * ✅ CRIAR (Verde):       AppToast.created('Recurso', 'Descrição personalizada opcional')
 * 🔄 ATUALIZAR (Azul):    AppToast.updated('Recurso', 'Descrição personalizada opcional')  
 * 🗑️ EXCLUIR (Vermelho):  AppToast.deleted('Recurso', 'Descrição personalizada opcional')
 * ⚠️ VALIDAÇÃO (Laranja): AppToast.validation('Erro de validação', 'Descrição do problema')
 * 
 * === CONTROLE ===
 * AppToast.dismiss(toastId)  // remove toast específico
 * AppToast.dismissAll()      // remove todos os toasts
 */
/**
 * Sistema de Toast padronizado e moderno para toda a aplicação
 * Utiliza Sonner com ícones e cores consistentes
 */
export const AppToast = {
  /**
   * Toast de SUCESSO - Verde
   * Para ações concluídas com êxito
   */
  success: (title: string, options?: ToastOptions) => {
    return toast.success(title, {
      description: options?.description,
      duration: options?.duration || 4000,
      action: options?.action,
      ...toastStyles.success,
    });
  },

  /**
   * Toast de ERRO - Vermelho
   * Para erros, falhas e problemas críticos
   */
  error: (title: string, options?: ToastOptions) => {
    return toast.error(title, {
      description: options?.description,
      duration: options?.duration || 6000,
      action: options?.action,
      ...toastStyles.error,
    });
  },

  /**
   * Toast de AVISO - Laranja/Amarelo
   * Para alertas, validações e situações de atenção
   */
  warning: (title: string, options?: ToastOptions) => {
    return toast.warning(title, {
      description: options?.description,
      duration: options?.duration || 5000,
      action: options?.action,
      ...toastStyles.warning,
    });
  },

  /**
   * Toast de INFORMAÇÃO - Azul
   * Para notificações informativas e dicas
   */
  info: (title: string, options?: ToastOptions) => {
    return toast.info(title, {
      description: options?.description,
      duration: options?.duration || 4000,
      action: options?.action,
      ...toastStyles.info,
    });
  },

  /**
   * Toast de ACESSO NEGADO - Vermelho especial
   * Para erros de permissão e autorização
   */
  accessDenied: (routeName?: string, routeDescription?: string, options?: Omit<ToastOptions, 'description'>) => {
    const description = routeName && routeDescription
      ? `Você não tem permissão para: "${routeName}". ${routeDescription}`
      : 'Você não possui permissão para realizar esta ação. Entre em contato com o administrador.';

    return toast.error('🛡️ Acesso Negado', {
      description,
      duration: options?.duration || 6000,
      action: options?.action,
      ...toastStyles.accessDenied,
    });
  },

  /**
   * Toast personalizado
   * Para casos específicos que precisam de customização total
   */
  custom: (title: string, options: ToastOptions & { 
    type?: 'success' | 'error' | 'warning' | 'info';
  }) => {
    const toastFn = options.type === 'success' ? toast.success
      : options.type === 'error' ? toast.error
      : options.type === 'warning' ? toast.warning
      : options.type === 'info' ? toast.info
      : toast;

    return toastFn(title, {
      description: options.description,
      duration: options.duration || 4000,
      action: options.action,
    });
  },

  /**
   * Toast de loading
   * Para operações em andamento
   */
  loading: (title: string, options?: Omit<ToastOptions, 'duration'>) => {
    return toast.loading(title, {
      description: options?.description,
    });
  },

  /**
   * Dismiss um toast específico
   */
  dismiss: (toastId: string | number) => {
    return toast.dismiss(toastId);
  },

  /**
   * Dismiss todos os toasts
   */
  dismissAll: () => {
    return toast.dismiss();
  },

  // ========== MÉTODOS ESPECÍFICOS PARA CRUD ==========

  /**
   * Toast para CRIAR recursos - Verde com ícone específico
   */
  created: (entityName: string, description?: string) => {
    return toast.success(`✅ ${entityName} Criado!`, {
      description: description || `${entityName} foi criado com sucesso.`,
      duration: 4000,
      ...toastStyles.success,
    });
  },

  /**
   * Toast para ATUALIZAR recursos - Azul com ícone específico  
   */
  updated: (entityName: string, description?: string) => {
    return toast.info(`🔄 ${entityName} Atualizado!`, {
      description: description || `${entityName} foi atualizado com sucesso.`,
      duration: 4000,
      ...toastStyles.info,
    });
  },

  /**
   * Toast para EXCLUIR recursos - Vermelho com ícone específico
   */
  deleted: (entityName: string, description?: string) => {
    return toast.error(`🗑️ ${entityName} Excluído!`, {
      description: description || `${entityName} foi excluído permanentemente.`,
      duration: 5000,
      ...toastStyles.error,
    });
  },

  /**
   * Toast para VALIDAÇÃO/AVISO - Laranja com ícone específico
   */
  validation: (title: string, description?: string) => {
    return toast.warning(`⚠️ ${title}`, {
      description: description || 'Verifique os dados informados.',
      duration: 4000,
      ...toastStyles.warning,
    });
  }
};

// Tipos para facilitar o uso
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'accessDenied';