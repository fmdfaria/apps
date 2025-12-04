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
import { AppToast } from '@/services/toast';

interface ContaPagarModalProps {
  isOpen: boolean;
  conta: ContaPagar | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export default function ContaPagarModal({ isOpen, conta, onClose, onSave }: ContaPagarModalProps) {
  const [loading, setLoading] = useState(false);
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
    status: 'PENDENTE' as 'PENDENTE' | 'SOLICITADO' | 'PARCIAL' | 'PAGO' | 'VENCIDO' | 'CANCELADO',
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

  useEffect(() => {
    if (conta) {
      // Formata o valor original para exibição
      const valorFormatado = conta.valorOriginal
        ? conta.valorOriginal.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })
        : '';

      setForm({
        status: conta.status || 'PENDENTE',
        descricao: conta.descricao || '',
        valorOriginal: valorFormatado,
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
        status: 'PENDENTE',
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

  // Processar campos especiais com underscore (similar ao ContaReceberModal)
  useEffect(() => {
    if (conta && empresas.length > 0 && categorias.length > 0) {
      const contaComControle = conta as any;
      
      // Buscar empresa por nome se especificado
      if (contaComControle._empresaNome && !form.empresaId) {
        const empresaEncontrada = empresas.find(empresa => 
          empresa.nomeFantasia?.toUpperCase().includes(contaComControle._empresaNome.toUpperCase()) ||
          empresa.razaoSocial?.toUpperCase().includes(contaComControle._empresaNome.toUpperCase())
        );
        
        if (empresaEncontrada) {
          setForm(prev => ({ ...prev, empresaId: empresaEncontrada.id }));
          // Carregar contas bancárias da empresa encontrada
          loadContasBancarias(empresaEncontrada.id);
        }
      }
      
      // Buscar categoria por nome se especificado
      if (contaComControle._categoriaNome && !form.categoriaId) {
        const categoriaEncontrada = categorias.find(categoria => 
          categoria.nome?.toUpperCase().includes(contaComControle._categoriaNome.toUpperCase())
        );
        
        if (categoriaEncontrada) {
          setForm(prev => ({ ...prev, categoriaId: categoriaEncontrada.id }));
        }
      }
    }
  }, [conta, empresas, categorias, form.empresaId, form.categoriaId]);

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
      AppToast.validation('Campo obrigatório', 'Descrição é obrigatória');
      return;
    }

    // Converte o valor formatado para número
    const valorNumerico = converterParaNumero(form.valorOriginal);

    if (!form.valorOriginal || valorNumerico <= 0) {
      AppToast.validation('Campo obrigatório', 'Valor deve ser maior que zero');
      return;
    }

    if (!form.dataEmissao) {
      AppToast.validation('Campo obrigatório', 'Data de emissão é obrigatória');
      return;
    }

    if (!form.dataVencimento) {
      AppToast.validation('Campo obrigatório', 'Data de vencimento é obrigatória');
      return;
    }

    if (!form.empresaId) {
      AppToast.validation('Campo obrigatório', 'Empresa é obrigatória');
      return;
    }

    if (!form.categoriaId) {
      AppToast.validation('Campo obrigatório', 'Categoria é obrigatória');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...form,
        valorOriginal: valorNumerico,
        valorLiquido: valorNumerico, // Inicialmente sem desconto/juros
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
      AppToast.success('Conta salva com sucesso!');
      onClose();
    } catch (error: any) {
      AppToast.error('Erro ao salvar', error.response?.data?.message || 'Erro ao salvar conta');
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

  const handleValorOriginalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarMoeda(e.target.value);
    setForm(prev => ({ ...prev, valorOriginal: valorFormatado }));
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

          {/* Linha 1: Valor Original | Data de Vencimento | Data Emissão | Status */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valorOriginal">
                Valor Original <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  R$
                </span>
                <Input
                  id="valorOriginal"
                  type="text"
                  value={form.valorOriginal}
                  onChange={handleValorOriginalChange}
                  placeholder="0,00"
                  className="pl-10"
                />
              </div>
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">
                Status <span className="text-red-500">*</span>
              </Label>
              <SingleSelectDropdown
                options={[
                  { id: 'PENDENTE', label: 'Pendente' },
                  { id: 'SOLICITADO', label: 'Solicitado' },
                  { id: 'PARCIAL', label: 'Parcial' },
                  { id: 'PAGO', label: 'Pago' },
                  { id: 'VENCIDO', label: 'Vencido' },
                  { id: 'CANCELADO', label: 'Cancelado' }
                ]}
                selected={[
                  { id: 'PENDENTE', label: 'Pendente' },
                  { id: 'SOLICITADO', label: 'Solicitado' },
                  { id: 'PARCIAL', label: 'Parcial' },
                  { id: 'PAGO', label: 'Pago' },
                  { id: 'VENCIDO', label: 'Vencido' },
                  { id: 'CANCELADO', label: 'Cancelado' }
                ].find(s => s.id === form.status) || null}
                onChange={(status) => handleChange('status', status?.id || 'PENDENTE')}
                placeholder="Selecione o status"
                formatOption={(status) => status.label}
                headerText="Status da conta"
              />
            </div>
          </div>

          {/* Linha 2: Descrição */}
          <div className="space-y-2">
            <Label htmlFor="descricao">
              Descrição <span className="text-red-500">*</span>
            </Label>
            <Input
              id="descricao"
              value={form.descricao}
              onChange={(e) => handleChange('descricao', e.target.value)}
              placeholder="Descrição da conta a pagar"
            />
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

          {/* Linha 4: Profissional | Número Documento | Tipo da Conta */}
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