import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { ContaReceber } from '@/types/ContaReceber';
import type { Empresa } from '@/types/Empresa';
import type { Profissional } from '@/types/Profissional';
import { EmpresaSelect, ContaBancariaSelect, CategoriaFinanceiraSelect, ProfissionalSelect } from '@/components/financeiro';

interface ContaReceberModalProps {
  isOpen: boolean;
  conta: ContaReceber | null;
  empresas: Empresa[];
  profissionais: Profissional[];
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export default function ContaReceberModal({ isOpen, conta, empresas, profissionais, onClose, onSave }: ContaReceberModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [form, setForm] = useState({
    descricao: '',
    valorTotal: '',
    dataVencimento: '',
    empresaId: '',
    contaBancariaId: '',
    categoriaFinanceiraId: '',
    profissionalId: '',
    tipoConta: 'AVULSO' as const,
    recorrente: false,
    observacoes: ''
  });

  useEffect(() => {
    if (conta) {
      setForm({
        descricao: conta.descricao || '',
        valorTotal: conta.valorTotal?.toString() || '',
        dataVencimento: conta.dataVencimento ? new Date(conta.dataVencimento).toISOString().split('T')[0] : '',
        empresaId: conta.empresaId || '',
        contaBancariaId: conta.contaBancariaId || '',
        categoriaFinanceiraId: conta.categoriaFinanceiraId || '',
        profissionalId: conta.profissionalId || '',
        tipoConta: conta.tipoConta || 'AVULSO',
        recorrente: conta.recorrente || false,
        observacoes: conta.observacoes || ''
      });
    } else {
      setForm({
        descricao: '',
        valorTotal: '',
        dataVencimento: '',
        empresaId: '',
        contaBancariaId: '',
        categoriaFinanceiraId: '',
        profissionalId: '',
        tipoConta: 'AVULSO',
        recorrente: false,
        observacoes: ''
      });
    }
    setError('');
  }, [conta, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.descricao.trim()) {
      setError('Descrição é obrigatória');
      return;
    }

    if (!form.valorTotal || parseFloat(form.valorTotal) <= 0) {
      setError('Valor deve ser maior que zero');
      return;
    }

    if (!form.dataVencimento) {
      setError('Data de vencimento é obrigatória');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        ...form,
        valorTotal: parseFloat(form.valorTotal),
        empresaId: form.empresaId || null,
        contaBancariaId: form.contaBancariaId || null,
        categoriaFinanceiraId: form.categoriaFinanceiraId || null,
        profissionalId: form.profissionalId || null
      };
      
      await onSave(payload);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao salvar conta');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Limpar conta bancária quando empresa mudar
    if (field === 'empresaId') {
      setForm(prev => ({ ...prev, contaBancariaId: '' }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {conta ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}
          </DialogTitle>
          <DialogDescription>
            {conta 
              ? 'Edite os dados da conta a receber abaixo.' 
              : 'Preencha os dados da nova conta a receber.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="descricao">
              Descrição <span className="text-red-500">*</span>
            </Label>
            <Input
              id="descricao"
              value={form.descricao}
              onChange={(e) => handleChange('descricao', e.target.value)}
              placeholder="Descrição da conta a receber"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valorTotal">
                Valor Total <span className="text-red-500">*</span>
              </Label>
              <Input
                id="valorTotal"
                type="number"
                step="0.01"
                min="0"
                value={form.valorTotal}
                onChange={(e) => handleChange('valorTotal', e.target.value)}
                placeholder="0,00"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dataVencimento">
                Data de Vencimento <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dataVencimento"
                type="date"
                value={form.dataVencimento}
                onChange={(e) => handleChange('dataVencimento', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <EmpresaSelect
              label="Empresa"
              value={form.empresaId}
              onValueChange={(value) => handleChange('empresaId', value)}
              placeholder="Selecione uma empresa"
            />
            
            <ContaBancariaSelect
              label="Conta Bancária"
              value={form.contaBancariaId}
              onValueChange={(value) => handleChange('contaBancariaId', value)}
              empresaId={form.empresaId}
              placeholder="Selecione uma conta"
              disabled={!form.empresaId}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <CategoriaFinanceiraSelect
              label="Categoria"
              tipo="RECEITA"
              value={form.categoriaFinanceiraId}
              onValueChange={(value) => handleChange('categoriaFinanceiraId', value)}
              placeholder="Selecione uma categoria"
            />
            
            <ProfissionalSelect
              label="Profissional"
              value={form.profissionalId}
              onValueChange={(value) => handleChange('profissionalId', value)}
              placeholder="Selecione um profissional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipoConta">Tipo da Conta</Label>
            <Select value={form.tipoConta} onValueChange={(value) => handleChange('tipoConta', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AVULSO">Avulso</SelectItem>
                <SelectItem value="MENSAL">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={form.observacoes}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {conta ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}