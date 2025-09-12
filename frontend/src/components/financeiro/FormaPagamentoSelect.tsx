import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface FormaPagamentoSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const formasPagamento = [
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito' },
  { value: 'CARTAO_DEBITO', label: 'Cartão de Débito' },
  { value: 'TRANSFERENCIA', label: 'Transferência Bancária' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OUTROS', label: 'Outros' }
];

export function FormaPagamentoSelect({
  value,
  onValueChange,
  placeholder = "Selecione a forma de pagamento",
  label,
  required = false,
  disabled = false,
  className
}: FormaPagamentoSelectProps) {
  const renderContent = () => (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {formasPagamento.map((forma) => (
          <SelectItem key={forma.value} value={forma.value}>
            {forma.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (label) {
    return (
      <div className="space-y-2">
        <Label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {renderContent()}
      </div>
    );
  }

  return renderContent();
}