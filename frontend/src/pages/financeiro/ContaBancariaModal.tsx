import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import { Loader2 } from 'lucide-react';
import { getEmpresasAtivas } from '@/services/empresas';
import type { ContaBancaria } from '@/types/ContaBancaria';
import type { Empresa } from '@/types/Empresa';

interface ContaBancariaModalProps {
  isOpen: boolean;
  conta: ContaBancaria | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

const TIPOS_CONTA = [
  { value: 'CORRENTE', label: 'Conta Corrente' },
  { value: 'POUPANCA', label: 'Conta Poupança' },
  { value: 'INVESTIMENTO', label: 'Conta Investimento' }
];

const TIPOS_PIX = [
  { value: 'CPF', label: 'CPF' },
  { value: 'CNPJ', label: 'CNPJ' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'TELEFONE', label: 'Telefone' },
  { value: 'ALEATORIA', label: 'Chave Aleatória' }
];

export default function ContaBancariaModal({ isOpen, conta, onClose, onSave }: ContaBancariaModalProps) {
  const [loading, setLoading] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [error, setError] = useState('');
  
  const [form, setForm] = useState({
    empresaId: '',
    nome: '',
    banco: '',
    agencia: '',
    conta: '',
    digito: '',
    tipoConta: 'CORRENTE',
    pixPrincipal: '',
    tipoPix: '',
    contaPrincipal: false,
    ativo: true,
    saldoInicial: 0,
    observacoes: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchEmpresas();
    }
  }, [isOpen]);

  useEffect(() => {
    if (conta) {
      setForm({
        empresaId: conta.empresaId || '',
        nome: conta.nome || '',
        banco: conta.banco || '',
        agencia: conta.agencia || '',
        conta: conta.conta || '',
        digito: conta.digito || '',
        tipoConta: conta.tipoConta || 'CORRENTE',
        pixPrincipal: conta.pixPrincipal || '',
        tipoPix: conta.tipoPix || '',
        contaPrincipal: conta.contaPrincipal || false,
        ativo: conta.ativo !== undefined ? conta.ativo : true,
        saldoInicial: conta.saldoInicial || 0,
        observacoes: conta.observacoes || ''
      });
    } else {
      setForm({
        empresaId: '',
        nome: '',
        banco: '',
        agencia: '',
        conta: '',
        digito: '',
        tipoConta: 'CORRENTE',
        pixPrincipal: '',
        tipoPix: '',
        contaPrincipal: false,
        ativo: true,
        saldoInicial: 0,
        observacoes: ''
      });
    }
  }, [conta]);

  const fetchEmpresas = async () => {
    try {
      const data = await getEmpresasAtivas();
      setEmpresas(data);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!form.empresaId || !form.nome || !form.banco || !form.agencia || !form.conta) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }
    
    setLoading(true);
    try {
      const data = {
        ...form,
        saldoInicial: Number(form.saldoInicial) || 0,
        pixPrincipal: form.pixPrincipal || undefined,
        tipoPix: form.tipoPix || undefined,
        digito: form.digito || undefined,
        observacoes: form.observacoes || undefined
      };
      
      await onSave(data);
    } catch (error: any) {
      setError(error?.message || 'Erro ao salvar conta bancária');
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {conta ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
          </DialogTitle>
          <DialogDescription>
            {conta ? 'Atualize as informações da conta bancária.' : 'Preencha os dados para cadastrar uma nova conta bancária.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Linha 1: Empresa | Nome da Conta | Tipo de Conta */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="empresaId" className="text-sm font-medium">
                Empresa <span className="text-red-500">*</span>
              </Label>
              <SingleSelectDropdown
                options={empresas}
                selected={empresas.find(e => e.id === form.empresaId) || null}
                onChange={(empresa) => handleInputChange('empresaId', empresa?.id || '')}
                placeholder="Selecione uma empresa"
                formatOption={(empresa) => empresa.nomeFantasia || empresa.razaoSocial}
                headerText="Empresas ativas"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-sm font-medium">
                Nome da Conta <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nome"
                value={form.nome}
                onChange={(e) => handleInputChange('nome', e.target.value)}
                placeholder="Ex: Conta Principal, Conta Operacional..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tipoConta" className="text-sm font-medium">
                Tipo de Conta
              </Label>
              <SingleSelectDropdown
                options={TIPOS_CONTA.map(tipo => ({ id: tipo.value, label: tipo.label }))}
                selected={TIPOS_CONTA.map(tipo => ({ id: tipo.value, label: tipo.label })).find(t => t.id === form.tipoConta) || null}
                onChange={(tipo) => handleInputChange('tipoConta', tipo?.id || 'CORRENTE')}
                placeholder="Selecione o tipo de conta"
                formatOption={(tipo) => tipo.label}
                headerText="Tipos de conta"
              />
            </div>
          </div>

          {/* Linha 2: Banco | Agência | Conta | Dígito */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="banco" className="text-sm font-medium">
                Banco <span className="text-red-500">*</span>
              </Label>
              <Input
                id="banco"
                value={form.banco}
                onChange={(e) => handleInputChange('banco', e.target.value)}
                placeholder="Ex: Banco do Brasil, Itaú, Bradesco..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="agencia" className="text-sm font-medium">
                Agência <span className="text-red-500">*</span>
              </Label>
              <Input
                id="agencia"
                value={form.agencia}
                onChange={(e) => handleInputChange('agencia', e.target.value)}
                placeholder="0001"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="conta" className="text-sm font-medium">
                Conta <span className="text-red-500">*</span>
              </Label>
              <Input
                id="conta"
                value={form.conta}
                onChange={(e) => handleInputChange('conta', e.target.value)}
                placeholder="12345678"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="digito" className="text-sm font-medium">
                Dígito
              </Label>
              <Input
                id="digito"
                value={form.digito}
                onChange={(e) => handleInputChange('digito', e.target.value)}
                placeholder="9"
                maxLength={2}
              />
            </div>
          </div>

          {/* Linha 3: Tipo PIX | Chave PIX | Saldo Inicial */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipoPix" className="text-sm font-medium">
                Tipo PIX
              </Label>
              <SingleSelectDropdown
                options={TIPOS_PIX.map(tipo => ({ id: tipo.value, label: tipo.label }))}
                selected={TIPOS_PIX.map(tipo => ({ id: tipo.value, label: tipo.label })).find(t => t.id === form.tipoPix) || null}
                onChange={(tipo) => handleInputChange('tipoPix', tipo?.id || '')}
                placeholder="Selecione o tipo de PIX"
                formatOption={(tipo) => tipo.label}
                headerText="Tipos de PIX"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pixPrincipal" className="text-sm font-medium">
                Chave PIX
              </Label>
              <Input
                id="pixPrincipal"
                value={form.pixPrincipal}
                onChange={(e) => handleInputChange('pixPrincipal', e.target.value)}
                placeholder="Chave PIX principal"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="saldoInicial" className="text-sm font-medium">
                Saldo Inicial
              </Label>
              <Input
                id="saldoInicial"
                type="number"
                step="0.01"
                value={form.saldoInicial}
                onChange={(e) => handleInputChange('saldoInicial', e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          {/* Linha 4: Conta Principal da Empresa | Conta Ativa */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="contaPrincipal"
                checked={form.contaPrincipal}
                onCheckedChange={(checked) => handleInputChange('contaPrincipal', checked)}
              />
              <Label htmlFor="contaPrincipal" className="text-sm">
                Conta Principal da Empresa
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="ativo"
                checked={form.ativo}
                onCheckedChange={(checked) => handleInputChange('ativo', checked)}
              />
              <Label htmlFor="ativo" className="text-sm">
                Conta Ativa
              </Label>
            </div>
          </div>

          {/* Linha 5: Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes" className="text-sm font-medium">
              Observações
            </Label>
            <Textarea
              id="observacoes"
              value={form.observacoes}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              placeholder="Observações adicionais sobre a conta..."
              rows={3}
            />
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
              {loading ? 'Salvando...' : conta ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}