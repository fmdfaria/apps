import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import type { ContaPagar } from '@/types/ContaPagar';
import type { Empresa } from '@/types/Empresa';
import type { ContaBancaria } from '@/types/ContaBancaria';
import { ValorDisplay } from '@/components/financeiro';
import { getContasBancariasByEmpresa } from '@/services/contas-bancarias';

interface PagarContaModalProps {
  isOpen: boolean;
  conta: ContaPagar | null;
  empresas: Empresa[];
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

// Formas de pagamento disponíveis
const formasPagamento = [
  { id: 'DINHEIRO', nome: 'Dinheiro' },
  { id: 'PIX', nome: 'PIX' },
  { id: 'CARTAO_CREDITO', nome: 'Cartão de Crédito' },
  { id: 'CARTAO_DEBITO', nome: 'Cartão de Débito' },
  { id: 'TRANSFERENCIA', nome: 'Transferência Bancária' },
  { id: 'BOLETO', nome: 'Boleto' },
  { id: 'CHEQUE', nome: 'Cheque' },
  { id: 'OUTROS', nome: 'Outros' }
];

export default function PagarContaModal({ isOpen, conta, empresas, onClose, onSave }: PagarContaModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [contasLoading, setContasLoading] = useState(false);

  const [form, setForm] = useState({
    valorPago: '',
    dataPagamento: new Date().toISOString().split('T')[0],
    formaPagamento: '',
    contaBancariaId: '',
    observacoes: ''
  });

  // Função para formatar valor em moeda brasileira
  const formatarMoeda = (valor: string): string => {
    // Remove tudo que não é dígito
    const apenasNumeros = valor.replace(/\D/g, '');

    if (!apenasNumeros) return '';

    // Converte para número e divide por 100 (para ter os centavos)
    const numero = parseFloat(apenasNumeros) / 100;

    // Formata para moeda brasileira
    return numero.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Função para converter valor formatado para número
  const converterParaNumero = (valorFormatado: string): number => {
    const apenasNumeros = valorFormatado.replace(/\D/g, '');
    return parseFloat(apenasNumeros) / 100;
  };

  const valorRestante = conta ? conta.valorLiquido - conta.valorPago : 0;

  useEffect(() => {
    if (conta) {
      const valorRestanteCalc = conta.valorLiquido - conta.valorPago;
      // Formata o valor restante para exibição
      const valorFormatado = valorRestanteCalc.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      setForm({
        valorPago: valorFormatado,
        dataPagamento: new Date().toISOString().split('T')[0],
        formaPagamento: 'PIX', // PIX pré-selecionado
        contaBancariaId: conta.contaBancariaId || '',
        observacoes: ''
      });
      if (conta.empresaId) {
        loadContasBancarias(conta.empresaId);
      }
    } else {
      setForm({
        valorPago: '',
        dataPagamento: new Date().toISOString().split('T')[0],
        formaPagamento: 'PIX', // PIX pré-selecionado
        contaBancariaId: '',
        observacoes: ''
      });
    }
    setError('');
  }, [conta, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Converte o valor formatado para número
    const valorNumerico = converterParaNumero(form.valorPago);

    if (!form.valorPago || valorNumerico <= 0) {
      setError('Valor pago deve ser maior que zero');
      return;
    }

    if (valorNumerico > valorRestante) {
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
        valorPago: valorNumerico,
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

  const handleValorPagoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarMoeda(e.target.value);
    setForm(prev => ({ ...prev, valorPago: valorFormatado }));
  };

  const loadContasBancarias = async (empresaId: string) => {
    setContasLoading(true);
    try {
      const data = await getContasBancariasByEmpresa(empresaId);
      setContasBancarias(data);
    } catch (error) {
      console.error('Erro ao carregar contas bancárias:', error);
      setContasBancarias([]);
    } finally {
      setContasLoading(false);
    }
  };

  if (!conta) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
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
          <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-3 gap-4">
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">Valor Total:</span>
              <ValorDisplay valor={conta.valorLiquido} tipo="negativo" className="text-sm font-semibold" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">Já Pago:</span>
              <ValorDisplay valor={conta.valorPago} tipo="negativo" className="text-sm font-semibold" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">Valor Restante:</span>
              <ValorDisplay valor={valorRestante} tipo="negativo" className="text-sm font-semibold" />
            </div>
          </div>

          {/* Linha 1: Valor a Pagar | Data de Pagamento | Forma de Pagamento */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valorPago">
                Valor a Pagar <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  R$
                </span>
                <Input
                  id="valorPago"
                  type="text"
                  value={form.valorPago}
                  onChange={handleValorPagoChange}
                  placeholder="0,00"
                  className="pl-10"
                  required
                />
              </div>
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

            <div className="space-y-2">
              <Label htmlFor="formaPagamento">
                Forma de Pagamento <span className="text-red-500">*</span>
              </Label>
              <SingleSelectDropdown
                options={formasPagamento}
                selected={formasPagamento.find(f => f.id === form.formaPagamento) || null}
                onChange={(forma) => handleChange('formaPagamento', forma?.id || '')}
                placeholder="Selecione a forma de pagamento"
                headerText="Formas de pagamento"
              />
            </div>
          </div>

          {/* Linha 2: Conta Bancária */}
          <div className="space-y-2">
            <Label htmlFor="contaBancariaId">
              Conta Bancária <span className="text-red-500">*</span>
            </Label>
            <SingleSelectDropdown
              options={contasBancarias}
              selected={contasBancarias.find(c => c.id === form.contaBancariaId) || null}
              onChange={(conta) => handleChange('contaBancariaId', conta?.id || '')}
              placeholder={contasLoading ? "Carregando contas..." : "Selecione uma conta bancária"}
              formatOption={(conta) => `${conta.nome} - ${conta.banco}`}
              headerText="Contas bancárias"
              disabled={contasLoading}
            />
          </div>

          {/* Linha 3: Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={form.observacoes}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              placeholder="Observações sobre o pagamento..."
              rows={2}
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