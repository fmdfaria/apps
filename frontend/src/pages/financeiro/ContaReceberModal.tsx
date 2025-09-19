import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import { Loader2 } from 'lucide-react';
import type { ContaReceber } from '@/types/ContaReceber';
import type { Empresa } from '@/types/Empresa';
import type { Paciente } from '@/types/Paciente';
import type { Convenio } from '@/types/Convenio';
import { getEmpresasAtivas } from '@/services/empresas';
import { getCategoriasByTipo } from '@/services/categorias-financeiras';
import { getContasBancariasByEmpresa } from '@/services/contas-bancarias';
import { getPacientesAtivos } from '@/services/pacientes';
import { getConveniosAtivos } from '@/services/convenios';
import { getCurrentUser } from '@/services/auth';
import type { CategoriaFinanceira } from '@/types/CategoriaFinanceira';
import type { ContaBancaria } from '@/types/ContaBancaria';

interface ContaReceberModalProps {
  isOpen: boolean;
  conta: ContaReceber | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export default function ContaReceberModal({ isOpen, conta, onClose, onSave }: ContaReceberModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresasLoading, setEmpresasLoading] = useState(false);
  const [categorias, setCategorias] = useState<CategoriaFinanceira[]>([]);
  const [categoriasLoading, setCategoriasLoading] = useState(false);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [contasLoading, setContasLoading] = useState(false);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacientesLoading, setPacientesLoading] = useState(false);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [conveniosLoading, setConveniosLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    descricao: '',
    valorOriginal: '',
    dataVencimento: '',
    dataEmissao: '',
    empresaId: '',
    contaBancariaId: '',
    categoriaId: '',
    pacienteId: '',
    convenioId: '',
    numeroDocumento: '',
    observacoes: '',
    formaRecebimento: 'DINHEIRO'
  });
  
  // Controla se deve mostrar o campo forma recebimento
  const [showFormaRecebimento, setShowFormaRecebimento] = useState(false);

  useEffect(() => {
    if (conta) {
      // Verificar se tem dados especiais de controle
      const contaComControle = conta as any;
      
      setForm({
        descricao: conta.descricao || '',
        valorOriginal: conta.valorOriginal?.toString() || '',
        dataVencimento: conta.dataVencimento ? new Date(conta.dataVencimento).toISOString().split('T')[0] : '',
        dataEmissao: conta.dataEmissao ? new Date(conta.dataEmissao).toISOString().split('T')[0] : '',
        empresaId: conta.empresaId || '',
        contaBancariaId: conta.contaBancariaId || '',
        categoriaId: conta.categoriaId || '',
        pacienteId: conta.pacienteId || '',
        convenioId: conta.convenioId || '',
        numeroDocumento: conta.numeroDocumento || '',
        observacoes: conta.observacoes || '',
        formaRecebimento: contaComControle._formaRecebimento || conta.formaRecebimento || 'DINHEIRO'
      });
      
      // Verificar se deve mostrar o campo forma recebimento
      // Mostra se: 1) tem flag especial OU 2) está editando uma conta existente (que tem ID)
      setShowFormaRecebimento(!!contaComControle._showFormaRecebimento || !!conta.id);
    } else {
      setForm({
        descricao: '',
        valorOriginal: '',
        dataVencimento: '',
        dataEmissao: '',
        empresaId: '',
        contaBancariaId: '',
        categoriaId: '',
        pacienteId: '',
        convenioId: '',
        numeroDocumento: '',
        observacoes: '',
        formaRecebimento: 'DINHEIRO'
      });
      setShowFormaRecebimento(false);
    }
    setError('');
  }, [conta, isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadEmpresas();
      loadCategorias();
      loadPacientes();
      loadConvenios();
      loadCurrentUser();
    }
  }, [isOpen]);

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

  const loadCategorias = async () => {
    setCategoriasLoading(true);
    try {
      const data = await getCategoriasByTipo('RECEITA');
      setCategorias(data);
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

    setLoading(true);
    setError('');

    try {
      const valorOriginal = parseFloat(form.valorOriginal);
      // Extrair dados especiais se existirem
      const contaComControle = conta as any;
      const { formaRecebimento, ...formSemFormaRecebimento } = form;
      
      const payload = {
        ...formSemFormaRecebimento,
        valorOriginal,
        valorLiquido: valorOriginal, // Inicialmente sem desconto/juros
        empresaId: form.empresaId || null,
        contaBancariaId: form.contaBancariaId || null,
        categoriaId: form.categoriaId || null,
        pacienteId: form.pacienteId || null,
        convenioId: form.convenioId || null,
        numeroDocumento: form.numeroDocumento || null,
        // Incluir forma recebimento se estiver visível
        ...(showFormaRecebimento && { formaRecebimento }),
        // Incluir userCreatedId apenas para criação, userUpdatedId sempre
        ...(conta ? {} : { userCreatedId: currentUserId }),
        userUpdatedId: currentUserId,
        // Incluir dados de controle se existirem (para o fluxo de auto-recebimento)
        ...(contaComControle?._autoReceived && {
          _autoReceived: contaComControle._autoReceived,
          _dataRecebimento: contaComControle._dataRecebimento,
          _formaRecebimento: formaRecebimento,
          _valorRecebido: contaComControle._valorRecebido
        })
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
    
    // Regra de negócio: Paciente só habilitado para convênio "Particular"
    if (field === 'convenioId') {
      const convenioSelecionado = convenios.find(c => c.id === value);
      // Se não for convênio "Particular", limpar o campo paciente
      if (convenioSelecionado && convenioSelecionado.nome !== 'Particular') {
        setForm(prev => ({ ...prev, pacienteId: '' }));
      }
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

  const loadPacientes = async () => {
    setPacientesLoading(true);
    try {
      const data = await getPacientesAtivos();
      setPacientes(data);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
      setPacientes([]);
    } finally {
      setPacientesLoading(false);
    }
  };

  const loadConvenios = async () => {
    setConveniosLoading(true);
    try {
      const data = await getConveniosAtivos();
      setConvenios(data);
    } catch (error) {
      console.error('Erro ao carregar convênios:', error);
      setConvenios([]);
    } finally {
      setConveniosLoading(false);
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

  // Verificar se o paciente deve estar habilitado
  const isPacienteEnabled = () => {
    if (!form.convenioId) return true; // Se não tem convênio selecionado, permite paciente
    const convenioSelecionado = convenios.find(c => c.id === form.convenioId);
    return convenioSelecionado?.nome === 'Particular';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
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

          {/* Linha 1: Descrição (2 colunas) | Valor (1 coluna) */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
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
            
            <div className="space-y-2">
              <Label htmlFor="valorOriginal">
                Valor <span className="text-red-500">*</span>
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
          </div>

          {/* Linha 2: Forma de Recebimento | Data de Vencimento | Data Emissão */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="formaRecebimento">
                Forma de Recebimento {showFormaRecebimento && <span className="text-red-500">*</span>}
              </Label>
              <SingleSelectDropdown
                options={[
                  { id: 'DINHEIRO', nome: 'Dinheiro' },
                  { id: 'PIX', nome: 'PIX' },
                  { id: 'CARTAO_CREDITO', nome: 'Cartão de Crédito' },
                  { id: 'CARTAO_DEBITO', nome: 'Cartão de Débito' },
                  { id: 'TRANSFERENCIA', nome: 'Transferência Bancária' },
                  { id: 'CHEQUE', nome: 'Cheque' },
                  { id: 'BOLETO', nome: 'Boleto' }
                ]}
                selected={[
                  { id: 'DINHEIRO', nome: 'Dinheiro' },
                  { id: 'PIX', nome: 'PIX' },
                  { id: 'CARTAO_CREDITO', nome: 'Cartão de Crédito' },
                  { id: 'CARTAO_DEBITO', nome: 'Cartão de Débito' },
                  { id: 'TRANSFERENCIA', nome: 'Transferência Bancária' },
                  { id: 'CHEQUE', nome: 'Cheque' },
                  { id: 'BOLETO', nome: 'Boleto' }
                ].find(option => option.id === form.formaRecebimento) || null}
                onChange={(option) => handleChange('formaRecebimento', option?.id || 'DINHEIRO')}
                placeholder="Selecione a forma de recebimento"
                formatOption={(option) => option.nome}
                headerText="Formas de recebimento"
                disabled={!showFormaRecebimento}
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

          {/* Linha 3: Empresa | Conta Bancária | Categoria */}
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
              <Label htmlFor="categoriaId">Categoria</Label>
              <SingleSelectDropdown
                options={categorias}
                selected={categorias.find(c => c.id === form.categoriaId) || null}
                onChange={(categoria) => handleChange('categoriaId', categoria?.id || '')}
                placeholder={categoriasLoading ? "Carregando categorias..." : "Selecione uma categoria"}
                headerText="Categorias de receita"
                disabled={categoriasLoading}
              />
            </div>
          </div>

          {/* Linha 4: Convênio | Paciente | Número Documento */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="convenioId">Convênio</Label>
              <SingleSelectDropdown
                options={convenios}
                selected={convenios.find(c => c.id === form.convenioId) || null}
                onChange={(convenio) => handleChange('convenioId', convenio?.id || '')}
                placeholder={conveniosLoading ? "Carregando convênios..." : "Selecione um convênio"}
                formatOption={(convenio) => convenio.nome}
                headerText="Convênios ativos"
                disabled={conveniosLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pacienteId" className={!isPacienteEnabled() ? "text-gray-400" : ""}>
                Paciente {!isPacienteEnabled() && <span className="text-xs text-gray-400">(disponível apenas para Particular)</span>}
              </Label>
              <SingleSelectDropdown
                options={pacientes}
                selected={pacientes.find(p => p.id === form.pacienteId) || null}
                onChange={(paciente) => handleChange('pacienteId', paciente?.id || '')}
                placeholder={
                  !isPacienteEnabled() ? "Selecione convênio 'Particular' para habilitar" :
                  pacientesLoading ? "Carregando pacientes..." : 
                  "Selecione um paciente"
                }
                formatOption={(paciente) => paciente.nomeCompleto}
                headerText="Pacientes ativos"
                disabled={pacientesLoading || !isPacienteEnabled()}
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
          </div>

          {/* Linha 5: Observações */}
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