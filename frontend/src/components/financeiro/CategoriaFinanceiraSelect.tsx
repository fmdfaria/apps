import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getCategoriasByTipo } from '@/services/categorias-financeiras';
import type { CategoriaFinanceira } from '@/types/CategoriaFinanceira';

interface CategoriaFinanceiraSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  tipo: 'RECEITA' | 'DESPESA';
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function CategoriaFinanceiraSelect({
  value,
  onValueChange,
  tipo,
  placeholder = "Selecione uma categoria",
  label,
  required = false,
  disabled = false,
  className
}: CategoriaFinanceiraSelectProps) {
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const data = await getCategoriasByTipo(tipo);
        setCategorias(data);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCategorias();
  }, [tipo]);

  const renderContent = () => (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || loading}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={loading ? "Carregando..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {categorias.map((categoria) => (
          <SelectItem key={categoria.id} value={categoria.id}>
            <div className="flex flex-col">
              <span className="font-medium">{categoria.nome}</span>
              {categoria.descricao && (
                <span className="text-sm text-muted-foreground">{categoria.descricao}</span>
              )}
            </div>
          </SelectItem>
        ))}
        {categorias.length === 0 && !loading && (
          <SelectItem value="" disabled>
            Nenhuma categoria encontrada
          </SelectItem>
        )}
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