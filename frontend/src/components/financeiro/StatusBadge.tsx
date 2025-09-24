import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { StatusContaReceber, StatusContaPagar } from '@/types/ContaReceber';

interface StatusBadgeProps {
  status: StatusContaReceber | StatusContaPagar;
  className?: string;
}

const statusConfig = {
  PENDENTE: {
    label: 'Pendente',
    variant: 'outline' as const,
    className: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
  },
  SOLICITADO: {
    label: 'Solicitado',
    variant: 'outline' as const,
    className: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
  },
  PARCIAL: {
    label: 'Parcial',
    variant: 'outline' as const,
    className: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
  },
  RECEBIDO: {
    label: 'Recebido',
    variant: 'outline' as const,
    className: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
  },
  PAGO: {
    label: 'Pago',
    variant: 'outline' as const,
    className: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
  },
  VENCIDO: {
    label: 'Vencido',
    variant: 'outline' as const,
    className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
  },
  CANCELADO: {
    label: 'Cancelado',
    variant: 'outline' as const,
    className: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
  }
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${className || ''}`}
    >
      {config.label}
    </Badge>
  );
}