import React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getModuleTheme } from '@/types/theme';

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  module: string; // Nome do módulo para aplicar o tema correto
  className?: string;
}

/**
 * Barra de busca responsiva
 */
export const SearchBar: React.FC<SearchBarProps> = ({ 
  placeholder = "Buscar...", 
  value, 
  onChange,
  module,
  className 
}) => {
  const theme = getModuleTheme(module);
  
  return (
    <div className={cn("relative", className)}>
      <Search className={`w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 transition-colors duration-200 ${value ? 'text-gray-600' : 'text-gray-400'}`} />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`!w-full sm:!w-64 md:!w-80 lg:!w-96 !h-10 !pl-10 !pr-4 !border-2 !border-gray-200 !rounded-lg !bg-white hover:!border-gray-300 focus:!ring-2 ${theme.focusRing} focus:!border-transparent !transition-all !duration-200 font-medium placeholder:text-gray-400 !py-0`}
        style={{ height: '40px', minHeight: '40px', maxHeight: '40px' }}
      />
    </div>
  );
};