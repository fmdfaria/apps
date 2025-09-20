import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import { Loader2 } from 'lucide-react';
import type { ContaPagar } from '@/types/ContaPagar';
import type { Empresa } from '@/types/Empresa';
import type { Profissional } from '@/types/Profissional';
import { getEmpresasAtivas } from '@/services/empresas';
import { getCategoriasByTipo } from '@/services/categorias-financeiras';
import { getContasBancariasByEmpresa } from '@/services/contas-bancarias';
import { getProfissionais } from '@/services/profissionais';
import { getCurrentUser } from '@/services/auth';
import type { CategoriaFinanceira } from '@/types/CategoriaFinanceira';
import type { ContaBancaria } from '@/types/ContaBancaria';

interface ContaPagarModalProps {
  isOpen: boolean;
  conta: ContaPagar | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export default function ContaPagarModal({ isOpen, conta, onClose, onSave }: ContaPagarModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresasLoading, setEmpresasLoading] = useState(false);
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [categoriasLoading, setCategoriasLoading] = useState(false);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [contasLoading, setContasLoading] = useState(false);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [profissionaisLoading, setProfissionaisLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    descricao: '',
    valorOriginal: '',
    dataVencimento: '',
    dataEmissao: '',
    empresaId: '',
    contaBancariaId: '',
    categoriaId: '',
    profissionalId: '',
    numeroDocumento: '',
    tipoConta: 'DESPESA' as const,
    recorrente: false,
    observacoes: ''
  });

  useEffect(() => {
    if (conta) {
      setForm({
        descricao: conta.descricao || '',
        valorOriginal: conta.valorOriginal?.toString() || '',
        dataVencimento: conta.dataVencimento ? new Date(conta.dataVencimento).toISOString().split('T')[0] : '',
        dataEmissao: conta.dataEmissao ? new Date(conta.dataEmissao).toISOString().split('T')[0] : '',
        empresaId: conta.empresaId || '',
        contaBancariaId: conta.contaBancariaId || '',
        categoriaId: conta.categoriaId || '',
        profissionalId: conta.profissionalId || '',
        numeroDocumento: conta.numeroDocumento || '',
        tipoConta: conta.tipoConta || 'DESPESA',
        recorrente: conta.recorrente || false,
        observacoes: conta.observacoes || ''
      });
    } else {
      setForm({
        descricao: '',
        valorOriginal: '',
        dataVencimento: '',
        dataEmissao: '',
        empresaId: '',
        contaBancariaId: '',
        categoriaId: '',
        profissionalId: '',
        numeroDocumento: '',
        tipoConta: 'DESPESA',
        recorrente: false,
        observacoes: ''
      });
    }
    setError('');
  }, [conta, isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadEmpresas();
      loadProfissionais();
      loadCurrentUser();
    }
  }, [isOpen]);

  // Carregar categorias quando o form.tipoConta mudar
  useEffect(() => {
    if (isOpen && form.tipoConta) {
      loadCategorias(form.tipoConta);
    }
  }, [isOpen, form.tipoConta]);

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

  const loadCategorias = async (tipoConta: string = 'DESPESA') => {
    setCategoriasLoading(true);
    try {
      // Categorias financeiras só têm tipos RECEITA/DESPESA
      // Para contas do tipo SALARIO, ENCARGO, etc., usamos categorias DESPESA
      const tipoCategoria = ['SALARIO', 'ENCARGO', 'IMPOSTO', 'INVESTIMENTO'].includes(tipoConta) ? 'DESPESA' : tipoConta;
      const data = await getCategoriasByTipo(tipoCategoria as 'RECEITA' | 'DESPESA');
      setCategorias(data);
      
      // Pré-selecionar categoria baseada no tipo da conta
      if (!form.categoriaId && data.length > 0) {
        let categoriaParaSelecionar = data[0]; // Padrão: primeira categoria
        
        if (tipoConta === 'SALARIO') {
          // Para SALARIO, procurar categoria específica
          const categoriaSalario = data.find(cat => 
            cat.nome.toLowerCase().includes('salario') || 
            cat.nome.toLowerCase().includes('salário') ||
            cat.nome.toLowerCase().includes('pagamento') ||
            cat.nome.toLowerCase().includes('profissional')
          );
          
          if (categoriaSalario) {
            categoriaParaSelecionar = categoriaSalario;
          }
        }
        
        setForm(prev => ({ ...prev, categoriaId: categoriaParaSelecionar.id }));
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      setCategorias([]);
    } finally {
      setCategoriasLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.descricao.trim()) {
      setError('Descrição é obrigatória');
      return;
    }

    if (!form.valorOriginal || parseFloat(form.valorOriginal) <= 0) {
      setError('Valor deve ser maior que zero');
      return;
    }

    if (!form.dataEmissao) {
      setError('Data de emissão é obrigatória');
      return;
    }

    if (!form.dataVencimento) {
      setError('Data de vencimento é obrigatória');
      return;
    }

    if (!form.categoriaId) {
      setError('Categoria é obrigatória');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const valorOriginal = parseFloat(form.valorOriginal);
      const payload = {
        ...form,
        valorOriginal,
        valorLiquido: valorOriginal, // Inicialmente sem desconto/juros
        empresaId: form.empresaId || null,
        contaBancariaId: form.contaBancariaId || null,
        categoriaId: form.categoriaId || null,
        profissionalId: form.profissionalId || null,
        numeroDocumento: form.numeroDocumento || null,
        // Incluir userCreatedId apenas para criação, userUpdatedId sempre
        ...(conta ? {} : { userCreatedId: currentUserId }),
        userUpdatedId: currentUserId
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
    
    // Limpar conta bancária quando empresa mudar e carregar novas contas
    if (field === 'empresaId') {
      setForm(prev => ({ ...prev, contaBancariaId: '' }));
      if (value) {
        loadContasBancarias(value);
      } else {
        setContasBancarias([]);
      }
    }
    
    // Recarregar categorias quando tipo da conta mudar
    if (field === 'tipoConta') {
      setForm(prev => ({ ...prev, categoriaId: '' }));
      loadCategorias(value);
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

  const loadProfissionais = async () => {
    setProfissionaisLoading(true);
    try {
      const data = await getProfissionais();
      setProfissionais(data);
    } catch (error) {
      console.error('Erro ao carregar profissionais:', error);
      setProfissionais([]);
    } finally {
      setProfissionaisLoading(false);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {conta ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
          </DialogTitle>
          <DialogDescription>
            {conta 
              ? 'Edite os dados da conta a pagar abaixo.' 
              : 'Preencha os dados da nova conta a pagar.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Linha 1: Descrição (mesmo tamanho da Empresa) | Valor Original | Data de Vencimento | Data Emissão */}
          <div className="grid grid-cols-5 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="descricao">
                Descrição <span className="text-red-500">*</span>
              </Label>
              <Input
                id="descricao"
                value={form.descricao}
                onChange={(e) => handleChange('descricao', e.target.value)}
                placeholder="Descrição da conta a pagar"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="valorOriginal">
                Valor Original <span className="text-red-500">*</span>
              </Label>
              <Input
                id="valorOriginal"
                type="number"
                step="0.01"
                min="0"
                value={form.valorOriginal}
                onChange={(e) => handleChange('valorOriginal', e.target.value)}
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
            
            <div className="space-y-2">
              <Label htmlFor="dataEmissao">
                Data Emissão <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dataEmissao"
                type="date"
                value={form.dataEmissao}
                onChange={(e) => handleChange('dataEmissao', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Linha 2: Empresa | Conta Bancária | Categoria */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="empresaId">Empresa</Label>
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
              <Label htmlFor="contaBancariaId">Conta Bancária</Label>
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
                headerText="Categorias de despesa"
                disabled={categoriasLoading}
              />
            </div>
          </div>

          {/* Linha 3: Profissional | Número Documento | Tipo da Conta */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profissionalId">Profissional</Label>
              <SingleSelectDropdown
                options={profissionais}
                selected={profissionais.find(p => p.id === form.profissionalId) || null}
                onChange={(profissional) => handleChange('profissionalId', profissional?.id || '')}
                placeholder={profissionaisLoading ? "Carregando profissionais..." : "Selecione um profissional"}
                formatOption={(profissional) => profissional.nome}
                headerText="Profissionais"
                disabled={profissionaisLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="numeroDocumento">Número Documento</Label>
              <Input
                id="numeroDocumento"
                value={form.numeroDocumento}
                onChange={(e) => handleChange('numeroDocumento', e.target.value)}
                placeholder="Ex: NF-001234"
                maxLength={50}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tipoConta">Tipo da Conta</Label>
              <SingleSelectDropdown
                options={[
                  { id: 'DESPESA', label: 'Despesa' },
                  { id: 'SALARIO', label: 'Salário' },
                  { id: 'ENCARGO', label: 'Encargo' },
                  { id: 'IMPOSTO', label: 'Imposto' },
                  { id: 'INVESTIMENTO', label: 'Investimento' }
                ]}
                selected={[
                  { id: 'DESPESA', label: 'Despesa' },
                  { id: 'SALARIO', label: 'Salário' },
                  { id: 'ENCARGO', label: 'Encargo' },
                  { id: 'IMPOSTO', label: 'Imposto' },
                  { id: 'INVESTIMENTO', label: 'Investimento' }
                ].find(t => t.id === form.tipoConta) || null}
                onChange={(tipo) => handleChange('tipoConta', tipo?.id || 'DESPESA')}
                placeholder="Selecione o tipo"
                formatOption={(tipo) => tipo.label}
                headerText="Tipos de conta"
              />
            </div>
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