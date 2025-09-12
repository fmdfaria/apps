import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getContasBancariasByEmpresa } from '@/services/contas-bancarias';
import type { ContaBancaria } from '@/types/ContaBancaria';
import { ValorDisplay } from './ValorDisplay';

interface ContaBancariaSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  empresaId?: string;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showSaldo?: boolean;
}

export function ContaBancariaSelect({
  value,
  onValueChange,
  empresaId,
  placeholder = "Selecione uma conta bancária",
  label,
  required = false,
  disabled = false,
  className,
  showSaldo = false
}: ContaBancariaSelectProps) {
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!empresaId) {
      setContas([]);
      return;
    }

    const loadContas = async () => {
      setLoading(true);
      try {
        const data = await getContasBancariasByEmpresa(empresaId);
        setContas(data);
      } catch (error) {
        console.error('Erro ao carregar contas bancárias:', error);
        setContas([]);
      } finally {
        setLoading(false);
      }
    };

    loadContas();
  }, [empresaId]);

  const renderContent = () => (
    <Select 
      value={value} 
      onValueChange={onValueChange} 
      disabled={disabled || loading || !empresaId}
    >
      <SelectTrigger className={className}>
        <SelectValue 
          placeholder={
            !empresaId 
              ? "Selecione primeiro uma empresa"
              : loading 
                ? "Carregando..." 
                : placeholder
          } 
        />
      </SelectTrigger>
      <SelectContent>
        {contas.map((conta) => (
          <SelectItem key={conta.id} value={conta.id}>
            <div className="flex flex-col w-full">
              <div className="flex justify-between items-center">
                <span className="font-medium">{conta.nome}</span>
                {conta.contaPrincipal && (
                  <span className="text-xs bg-blue-100 text-blue-600 px-1 py-0.5 rounded ml-2">
                    Principal
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>{conta.banco} - Ag: {conta.agencia} - C/C: {conta.conta}</span>
                {showSaldo && (
                  <ValorDisplay 
                    valor={conta.saldoAtual} 
                    className="text-xs"
                  />
                )}
              </div>
            </div>
          </SelectItem>
        ))}
        {contas.length === 0 && !loading && empresaId && (
          <SelectItem value="" disabled>
            Nenhuma conta bancária encontrada
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