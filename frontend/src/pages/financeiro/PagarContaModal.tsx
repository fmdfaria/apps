import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import type { ContaPagar } from '@/types/ContaPagar';
import type { Empresa } from '@/types/Empresa';
import { ValorDisplay, FormaPagamentoSelect, ContaBancariaSelect } from '@/components/financeiro';

interface PagarContaModalProps {
  isOpen: boolean;
  conta: ContaPagar | null;
  empresas: Empresa[];
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export default function PagarContaModal({ isOpen, conta, empresas, onClose, onSave }: PagarContaModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [form, setForm] = useState({
    valorPago: '',
    dataPagamento: new Date().toISOString().split('T')[0],
    formaPagamento: '',
    contaBancariaId: '',
    observacoes: ''
  });

  const valorRestante = conta ? conta.valorTotal - conta.valorPago : 0;

  useEffect(() => {
    if (conta) {
      const valorRestanteCalc = conta.valorTotal - conta.valorPago;
      setForm({
        valorPago: valorRestanteCalc.toString(),
        dataPagamento: new Date().toISOString().split('T')[0],
        formaPagamento: '',
        contaBancariaId: conta.contaBancariaId || '',
        observacoes: ''
      });
    } else {
      setForm({
        valorPago: '',
        dataPagamento: new Date().toISOString().split('T')[0],
        formaPagamento: '',
        contaBancariaId: '',
        observacoes: ''
      });
    }
    setError('');
  }, [conta, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.valorPago || parseFloat(form.valorPago) <= 0) {
      setError('Valor pago deve ser maior que zero');
      return;
    }

    if (parseFloat(form.valorPago) > valorRestante) {
      setError('Valor pago não pode ser maior que o valor restante');
      return;
    }

    if (!form.dataPagamento) {
      setError('Data de pagamento é obrigatória');
      return;
    }

    if (!form.formaPagamento) {
      setError('Forma de pagamento é obrigatória');
      return;
    }

    if (!form.contaBancariaId) {
      setError('Conta bancária é obrigatória');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        valorPago: parseFloat(form.valorPago),
        dataPagamento: form.dataPagamento,
        formaPagamento: form.formaPagamento,
        contaBancariaId: form.contaBancariaId,
        observacoes: form.observacoes.trim() || null
      };
      
      await onSave(payload);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao registrar pagamento');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (!conta) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pagar Conta</DialogTitle>
          <DialogDescription>
            Registre o pagamento da conta "{conta.descricao}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Resumo da Conta */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Valor Total:</span>
              <ValorDisplay valor={conta.valorTotal} tipo="negativo" className="text-sm" />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Já Pago:</span>
              <ValorDisplay valor={conta.valorPago} tipo="negativo" className="text-sm" />
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-sm">Valor Restante:</span>
              <ValorDisplay valor={valorRestante} tipo="negativo" className="text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valorPago">
                Valor a Pagar <span className="text-red-500">*</span>
              </Label>
              <Input
                id="valorPago"
                type="number"
                step="0.01"
                min="0"
                max={valorRestante}
                value={form.valorPago}
                onChange={(e) => handleChange('valorPago', e.target.value)}
                placeholder="0,00"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dataPagamento">
                Data de Pagamento <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dataPagamento"
                type="date"
                value={form.dataPagamento}
                onChange={(e) => handleChange('dataPagamento', e.target.value)}
                required
              />
            </div>
          </div>

          <FormaPagamentoSelect
            label="Forma de Pagamento"
            required
            value={form.formaPagamento}
            onValueChange={(value) => handleChange('formaPagamento', value)}
            placeholder="Selecione a forma de pagamento"
          />

          <ContaBancariaSelect
            label="Conta Bancária"
            required
            value={form.contaBancariaId}
            onValueChange={(value) => handleChange('contaBancariaId', value)}
            empresaId={conta.empresaId}
            placeholder="Selecione a conta bancária"
            showSaldo
          />

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={form.observacoes}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              placeholder="Observações sobre o pagamento..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar Pagamento
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}