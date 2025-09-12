import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getEmpresasAtivas } from '@/services/empresas';
import type { Empresa } from '@/types/Empresa';

interface EmpresaSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function EmpresaSelect({
  value,
  onValueChange,
  placeholder = "Selecione uma empresa",
  label,
  required = false,
  disabled = false,
  className
}: EmpresaSelectProps) {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEmpresas = async () => {
      try {
        const data = await getEmpresasAtivas();
        setEmpresas(data);
      } catch (error) {
        console.error('Erro ao carregar empresas:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEmpresas();
  }, []);

  const renderContent = () => (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || loading}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={loading ? "Carregando..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {empresas.map((empresa) => (
          <SelectItem key={empresa.id} value={empresa.id}>
            <div className="flex flex-col">
              <span className="font-medium">{empresa.razaoSocial}</span>
              {empresa.nomeFantasia && empresa.nomeFantasia !== empresa.razaoSocial && (
                <span className="text-sm text-muted-foreground">{empresa.nomeFantasia}</span>
              )}
              {empresa.empresaPrincipal && (
                <span className="text-xs text-blue-600 font-medium">Principal</span>
              )}
            </div>
          </SelectItem>
        ))}
        {empresas.length === 0 && !loading && (
          <SelectItem value="" disabled>
            Nenhuma empresa encontrada
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