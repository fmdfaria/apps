import React, { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { getProfissionais } from '@/services/profissionais';
import type { Profissional } from '@/types/Profissional';

interface ProfissionalSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  apenasAtivos?: boolean;
}

export function ProfissionalSelect({
  value,
  onValueChange,
  placeholder = "Selecione um profissional",
  label,
  required = false,
  disabled = false,
  className,
  apenasAtivos = true
}: ProfissionalSelectProps) {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfissionais = async () => {
      try {
        const data = await getProfissionais({ ativo: apenasAtivos });
        setProfissionais(data);
      } catch (error) {
        console.error('Erro ao carregar profissionais:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfissionais();
  }, [apenasAtivos]);

  const renderContent = () => (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || loading}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={loading ? "Carregando..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {profissionais.map((profissional) => (
          <SelectItem key={profissional.id} value={profissional.id}>
            <div className="flex flex-col">
              <span className="font-medium">{profissional.nome}</span>
              <div className="text-sm text-muted-foreground">
                <span>{profissional.especialidade}</span>
                {profissional.conselho && profissional.numeroConselho && (
                  <span className="ml-2">
                    {profissional.conselho}: {profissional.numeroConselho}
                  </span>
                )}
              </div>
            </div>
          </SelectItem>
        ))}
        {profissionais.length === 0 && !loading && (
          <SelectItem value="" disabled>
            Nenhum profissional encontrado
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