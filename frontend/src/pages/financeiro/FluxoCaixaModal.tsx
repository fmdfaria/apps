import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import { Loader2 } from 'lucide-react';
import type { FluxoCaixa, TipoMovimento, FormaPagamento } from '@/types/FluxoCaixa';
import type { Empresa } from '@/types/Empresa';
import type { ContaBancaria } from '@/types/ContaBancaria';
import type { CategoriaFinanceira } from '@/types/CategoriaFinanceira';
import { getEmpresasAtivas } from '@/services/empresas';
import { getCategoriasByTipo } from '@/services/categorias-financeiras';
import { getContasBancariasByEmpresa } from '@/services/contas-bancarias';
import { getCurrentUser } from '@/services/auth';

interface FluxoCaixaModalProps {
  isOpen: boolean;
  movimento: FluxoCaixa | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export default function FluxoCaixaModal({ isOpen, movimento, onClose, onSave }: FluxoCaixaModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresasLoading, setEmpresasLoading] = useState(false);
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [categoriasLoading, setCategoriasLoading] = useState(false);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [contasLoading, setContasLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    empresaId: '',
    contaBancariaId: '',
    categoriaId: '',
    tipo: 'ENTRADA' as TipoMovimento,
    descricao: '',
    valor: '',
    dataMovimento: new Date().toISOString().split('T')[0],
    formaPagamento: 'DINHEIRO' as FormaPagamento,
    observacoes: ''
  });

  const tiposMovimento = [
    { id: 'ENTRADA', nome: 'Entrada' },
    { id: 'SAIDA', nome: 'Saída' }
  ];

  const formasPagamento = [
    { id: 'DINHEIRO', nome: 'Dinheiro' },
    { id: 'PIX', nome: 'PIX' },
    { id: 'CARTAO_CREDITO', nome: 'Cartão de Crédito' },
    { id: 'CARTAO_DEBITO', nome: 'Cartão de Débito' },
    { id: 'TRANSFERENCIA', nome: 'Transferência Bancária' },
    { id: 'CHEQUE', nome: 'Cheque' },
    { id: 'BOLETO', nome: 'Boleto' }
  ];

  useEffect(() => {
    if (movimento) {
      setForm({
        empresaId: movimento.empresaId || '',
        contaBancariaId: movimento.contaBancariaId || '',
        categoriaId: movimento.categoriaId || '',
        tipo: movimento.tipo || 'ENTRADA',
        descricao: movimento.descricao || '',
        valor: movimento.valor?.toString() || '',
        dataMovimento: movimento.dataMovimento ? new Date(movimento.dataMovimento).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        formaPagamento: movimento.formaPagamento || 'DINHEIRO',
        observacoes: movimento.observacoes || ''
      });
    } else {
      setForm({
        empresaId: '',
        contaBancariaId: '',
        categoriaId: '',
        tipo: 'ENTRADA',
        descricao: '',
        valor: '',
        dataMovimento: new Date().toISOString().split('T')[0],
        formaPagamento: 'DINHEIRO',
        observacoes: ''
      });
    }
    setError('');
  }, [movimento, isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadEmpresas();
      loadCurrentUser();
    }
  }, [isOpen]);

  useEffect(() => {
    if (form.tipo) {
      loadCategorias(form.tipo);
    }
  }, [form.tipo]);

  const loadEmpresas = async () => {
    setEmpresasLoading(true);
    try {
      const data = await getEmpresasAtivas();
      setEmpresas(data);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      setEmpresas([]);
    } finally {
      setEmpresasLoading(false);
    }
  };

  const loadCategorias = async (tipoMovimento: TipoMovimento) => {
    setCategoriasLoading(true);
    try {
      const tipoCategoria = tipoMovimento === 'ENTRADA' ? 'RECEITA' : 'DESPESA';
      const data = await getCategoriasByTipo(tipoCategoria);
      setCategorias(data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      setCategorias([]);
    } finally {
      setCategoriasLoading(false);
    }
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

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUserId(user.id);
    } catch (error) {
      console.error('Erro ao carregar usuário logado:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.descricao.trim()) {
      setError('Descrição é obrigatória');
      return;
    }

    if (!form.valor || parseFloat(form.valor) <= 0) {
      setError('Valor deve ser maior que zero');
      return;
    }

    if (!form.empresaId) {
      setError('Empresa é obrigatória');
      return;
    }

    if (!form.contaBancariaId) {
      setError('Conta bancária é obrigatória');
      return;
    }

    if (!form.categoriaId) {
      setError('Categoria é obrigatória');
      return;
    }

    if (!form.dataMovimento) {
      setError('Data do movimento é obrigatória');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const valor = parseFloat(form.valor);
      const payload = {
        ...form,
        valor,
        userUpdatedId: currentUserId,
        ...(movimento ? {} : { userCreatedId: currentUserId })
      };
      
      await onSave(payload);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Erro ao salvar movimento');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Limpar conta bancária quando empresa mudar e carregar novas contas
    if (field === 'empresaId') {
      setForm(prev => ({ ...prev, contaBancariaId: '' }));
      if (value) {
        loadContasBancarias(value);
      } else {
        setContasBancarias([]);
      }
    }

    // Limpar categoria quando tipo mudar
    if (field === 'tipo') {
      setForm(prev => ({ ...prev, categoriaId: '' }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {movimento ? 'Editar Movimento' : 'Nova Movimentação'}
          </DialogTitle>
          <DialogDescription>
            {movimento 
              ? 'Edite os dados da movimentação abaixo.' 
              : 'Preencha os dados da nova movimentação manual.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Linha 1: Tipo | Descrição */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">
                Tipo <span className="text-red-500">*</span>
              </Label>
              <SingleSelectDropdown
                options={tiposMovimento}
                selected={tiposMovimento.find(t => t.id === form.tipo) || null}
                onChange={(tipo) => handleChange('tipo', tipo?.id || 'ENTRADA')}
                placeholder="Selecione o tipo"
                formatOption={(tipo) => tipo.nome}
                headerText="Tipo de movimento"
              />
            </div>
            
            <div className="col-span-3 space-y-2">
              <Label htmlFor="descricao">
                Descrição <span className="text-red-500">*</span>
              </Label>
              <Input
                id="descricao"
                value={form.descricao}
                onChange={(e) => handleChange('descricao', e.target.value)}
                placeholder="Descrição da movimentação"
                required
              />
            </div>
          </div>

          {/* Linha 2: Valor | Data | Forma Pagamento */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor">
                Valor <span className="text-red-500">*</span>
              </Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                value={form.valor}
                onChange={(e) => handleChange('valor', e.target.value)}
                placeholder="0,00"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dataMovimento">
                Data do Movimento <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dataMovimento"
                type="date"
                value={form.dataMovimento}
                onChange={(e) => handleChange('dataMovimento', e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="formaPagamento">
                Forma de Pagamento
              </Label>
              <SingleSelectDropdown
                options={formasPagamento}
                selected={formasPagamento.find(f => f.id === form.formaPagamento) || null}
                onChange={(forma) => handleChange('formaPagamento', forma?.id || 'DINHEIRO')}
                placeholder="Selecione a forma"
                formatOption={(forma) => forma.nome}
                headerText="Formas de pagamento"
              />
            </div>
          </div>

          {/* Linha 3: Empresa | Conta Bancária | Categoria */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="empresaId">
                Empresa <span className="text-red-500">*</span>
              </Label>
              <SingleSelectDropdown
                options={empresas}
                selected={empresas.find(e => e.id === form.empresaId) || null}
                onChange={(empresa) => handleChange('empresaId', empresa?.id || '')}
                placeholder={empresasLoading ? "Carregando empresas..." : "Selecione uma empresa"}
                formatOption={(empresa) => empresa.nomeFantasia || empresa.razaoSocial}
                headerText="Empresas ativas"
                disabled={empresasLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contaBancariaId">
                Conta Bancária <span className="text-red-500">*</span>
              </Label>
              <SingleSelectDropdown
                options={contasBancarias}
                selected={contasBancarias.find(c => c.id === form.contaBancariaId) || null}
                onChange={(conta) => handleChange('contaBancariaId', conta?.id || '')}
                placeholder={
                  !form.empresaId ? "Selecione primeiro uma empresa" :
                  contasLoading ? "Carregando contas..." : 
                  "Selecione uma conta bancária"
                }
                formatOption={(conta) => `${conta.nome} - ${conta.banco}`}
                headerText="Contas bancárias"
                disabled={!form.empresaId || contasLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="categoriaId">
                Categoria <span className="text-red-500">*</span>
              </Label>
              <SingleSelectDropdown
                options={categorias}
                selected={categorias.find(c => c.id === form.categoriaId) || null}
                onChange={(categoria) => handleChange('categoriaId', categoria?.id || '')}
                placeholder={categoriasLoading ? "Carregando categorias..." : "Selecione uma categoria"}
                headerText={`Categorias de ${form.tipo === 'ENTRADA' ? 'receita' : 'despesa'}`}
                disabled={categoriasLoading}
              />
            </div>
          </div>

          {/* Linha 4: Observações */}
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
              {movimento ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}