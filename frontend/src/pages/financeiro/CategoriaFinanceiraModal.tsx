import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { CategoriaFinanceira } from '@/types/CategoriaFinanceira';

interface CategoriaFinanceiraModalProps {
  isOpen: boolean;
  categoria: CategoriaFinanceira | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export default function CategoriaFinanceiraModal({ isOpen, categoria, onClose, onSave }: CategoriaFinanceiraModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [form, setForm] = useState({
    nome: '',
    tipo: 'RECEITA' as const,
    descricao: '',
    ativo: true
  });

  useEffect(() => {
    if (categoria) {
      setForm({
        nome: categoria.nome || '',
        tipo: categoria.tipo || 'RECEITA',
        descricao: categoria.descricao || '',
        ativo: categoria.ativo !== undefined ? categoria.ativo : true
      });
    } else {
      setForm({
        nome: '',
        tipo: 'RECEITA',
        descricao: '',
        ativo: true
      });
    }
    setError('');
  }, [categoria, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!form.nome.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    
    setLoading(true);
    try {
      const data = {
        ...form,
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || undefined
      };
      
      await onSave(data);
    } catch (error: any) {
      setError(error?.message || 'Erro ao salvar categoria financeira');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {categoria ? 'Editar Categoria Financeira' : 'Nova Categoria Financeira'}
          </DialogTitle>
          <DialogDescription>
            {categoria ? 'Atualize as informações da categoria financeira.' : 'Preencha os dados para cadastrar uma nova categoria financeira.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome" className="text-sm font-medium">
              Nome <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              placeholder="Ex: Vendas, Consultas, Aluguel..."
              required
            />
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label htmlFor="tipo" className="text-sm font-medium">
              Tipo <span className="text-red-500">*</span>
            </Label>
            <Select value={form.tipo} onValueChange={(value) => handleInputChange('tipo', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RECEITA">
                  💰 Receita
                </SelectItem>
                <SelectItem value="DESPESA">
                  💸 Despesa
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao" className="text-sm font-medium">
              Descrição
            </Label>
            <Textarea
              id="descricao"
              value={form.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              placeholder="Descrição detalhada da categoria..."
              rows={3}
            />
          </div>

          {/* Status Ativo */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="ativo"
              checked={form.ativo}
              onCheckedChange={(checked) => handleInputChange('ativo', checked)}
            />
            <Label htmlFor="ativo" className="text-sm">
              Categoria Ativa
            </Label>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? 'Salvando...' : categoria ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}