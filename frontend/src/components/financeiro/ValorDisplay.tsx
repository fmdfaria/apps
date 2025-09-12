import React from 'react';
import { cn } from '@/lib/utils';

interface ValorDisplayProps {
  valor: number;
  tipo?: 'positivo' | 'negativo' | 'neutro';
  prefixo?: string;
  className?: string;
  showSign?: boolean;
}

export function ValorDisplay({ 
  valor, 
  tipo = 'neutro', 
  prefixo = 'R$', 
  className,
  showSign = false 
}: ValorDisplayProps) {
  const formatValue = (value: number) => {
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(value));
    
    if (showSign && value !== 0) {
      return value > 0 ? `+${prefixo} ${formatted}` : `-${prefixo} ${formatted}`;
    }
    
    return `${prefixo} ${formatted}`;
  };

  const getColorClass = () => {
    if (tipo === 'positivo' || (showSign && valor > 0)) {
      return 'text-green-600 dark:text-green-400';
    }
    if (tipo === 'negativo' || (showSign && valor < 0)) {
      return 'text-red-600 dark:text-red-400';
    }
    return 'text-foreground';
  };

  return (
    <span className={cn('font-mono font-medium', getColorClass(), className)}>
      {formatValue(valor)}
    </span>
  );
}