import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle } from 'lucide-react';
import type { FluxoCaixa } from '@/types/FluxoCaixa';
import { ValorDisplay } from '@/components/financeiro';

interface ConciliarMovimentoModalProps {
  isOpen: boolean;
  movimento: FluxoCaixa | null;
  onClose: () => void;
  onConciliar: (data: { dataConciliacao?: string }) => Promise<void>;
}

export default function ConciliarMovimentoModal({ isOpen, movimento, onClose, onConciliar }: ConciliarMovimentoModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dataConciliacao, setDataConciliacao] = useState('');

  useEffect(() => {
    if (isOpen && movimento) {
      // Pré-preencher com a data atual
      setDataConciliacao(new Date().toISOString().split('T')[0]);
      setError('');
    }
  }, [isOpen, movimento]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dataConciliacao) {
      setError('Data da conciliação é obrigatória');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onConciliar({ dataConciliacao });
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao conciliar movimento');
    } finally {
      setLoading(false);
    }
  };

  if (!movimento) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Conciliar Movimento
          </DialogTitle>
          <DialogDescription>
            Confirme a conciliação desta movimentação financeira.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do movimento */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Descrição:</span>
              <span className="text-sm font-medium">{movimento.descricao}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Valor:</span>
              <ValorDisplay 
                valor={movimento.valor} 
                tipo={movimento.tipo === 'ENTRADA' ? 'positivo' : 'negativo'} 
                className="text-sm font-medium"
              />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Data:</span>
              <span className="text-sm font-medium">
                {new Date(movimento.dataMovimento).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Conta:</span>
              <span className="text-sm font-medium">{movimento.contaBancaria?.nome}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="dataConciliacao">
                Data da Conciliação <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dataConciliacao"
                type="date"
                value={dataConciliacao}
                onChange={(e) => setDataConciliacao(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
              />
              <p className="text-xs text-gray-500">
                Data em que o movimento foi confirmado no extrato bancário
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <CheckCircle className="w-4 h-4 mr-2" />
                Conciliar
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}