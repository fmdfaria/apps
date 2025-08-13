import React, { forwardRef, useState } from 'react';
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
      // Se tem um valor inicial, aplica a máscara
      if (value && value.length >= 11) {
        // Se o valor não tem +55, assume que é o formato de armazenamento
        const cleanValue = value.replace(/\D/g, '');
        if (cleanValue.startsWith('55')) {
          return applyWhatsAppMask(cleanValue);
        }
        return applyWhatsAppMask(`55${cleanValue}`);
      }
      return value;
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Aplica a máscara para exibição
      const maskedValue = applyWhatsAppMask(inputValue);
      setDisplayValue(maskedValue);
      
      // Extrai o valor limpo para armazenamento
      const storageValue = whatsAppToStorage(maskedValue);
      
      // Valida o número
      const valid = storageValue.length >= 10 ? isValidWhatsApp(storageValue) : false;
      
      // Chama os callbacks
      onChange?.(storageValue);
      onValidityChange?.(valid);
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder="55 11 99999-9999"
        className={cn(
          className,
          error && "border-red-500 focus:border-red-500"
        )}
        maxLength={20} // +55 (11) 99999-9999 = 19 caracteres
      />
    );
  }
);

WhatsAppInput.displayName = "WhatsAppInput";

export { WhatsAppInput };
export type { WhatsAppInputProps };