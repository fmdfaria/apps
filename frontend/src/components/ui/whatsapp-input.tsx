import React, { forwardRef, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { applyWhatsAppMask, whatsAppToStorage, isValidWhatsApp } from '@/utils/whatsapp';
import { cn } from '@/lib/utils';

interface WhatsAppInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void; // Retorna valor limpo para armazenamento
  onValidityChange?: (isValid: boolean) => void;
  error?: boolean;
}

const WhatsAppInput = forwardRef<HTMLInputElement, WhatsAppInputProps>(
  ({ className, value = '', onChange, onValidityChange, error, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(() => {
      // Aplica máscara respeitando DDI do próprio valor
      const cleanValue = (value || '').replace(/\D/g, '');
      if (!cleanValue) return '';
      return applyWhatsAppMask(cleanValue);
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Aplica a máscara para exibição
      const maskedValue = applyWhatsAppMask(inputValue);
      setDisplayValue(maskedValue);
      
      // Extrai o valor limpo para armazenamento (E.164 dígitos)
      const storageValue = whatsAppToStorage(maskedValue);
      
      // Valida o número
      const valid = isValidWhatsApp(storageValue);
      
      // Chama os callbacks
      onChange?.(storageValue);
      onValidityChange?.(valid);
    };

    // Sincroniza quando o valor externo mudar
    useEffect(() => {
      const clean = (value || '').replace(/\D/g, '');
      setDisplayValue(clean ? applyWhatsAppMask(clean) : '');
    }, [value]);

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder="+55 (11) 99999-9999"
        className={cn(
          className,
          error && "border-red-500 focus:border-red-500"
        )}
        maxLength={22}
      />
    );
  }
);

WhatsAppInput.displayName = "WhatsAppInput";

export { WhatsAppInput };
export type { WhatsAppInputProps };