import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast, toast } from '@/components/ui/use-toast';
import { getServicos, createServico, updateServico, deleteServico } from '@/services/servicos';
import { getConvenios } from '@/services/convenios';
import type { Servico } from '@/types/Servico';
import type { Convenio } from '@/types/Convenio';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown } from 'lucide-react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { FormErrorMessage } from '@/components/form-error-message';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

// Interface para compatibilidade com API atual
interface ServicoAPI extends Servico {
  convenio?: { id: string; nome: string } | null;
}

// Definir tipo de formulário separado
interface FormularioServico {
  nome: string;
  descricao?: string | null;
  duracaoMinutos: string;
  preco: string;
  percentualClinica?: number | null;
  percentualProfissional?: number | null;
  procedimentoPrimeiroAtendimento?: string | null;
  procedimentoDemaisAtendimentos?: string | null;
  convenioId?: string;
}

// Função utilitária para formatar como moeda BRL
function formatarMoedaBRL(valor: string | number) {
  let num: number;
  if (typeof valor === 'number') {
    num = valor;
  } else {
    // Só troca vírgula por ponto, não remove pontos de milhar
    num = Number(valor.replace(',', '.'));
  }
  if (isNaN(num)) return '';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Função para gerar cores diferentes para cada convênio
function getConvenioColor(convenioId: string) {
  const colors = [
    { bg: 'bg-blue-100', text: 'text-blue-800' },
    { bg: 'bg-green-100', text: 'text-green-800' },
    { bg: 'bg-purple-100', text: 'text-purple-800' },
    { bg: 'bg-orange-100', text: 'text-orange-800' },
    { bg: 'bg-pink-100', text: 'text-pink-800' },
    { bg: 'bg-indigo-100', text: 'text-indigo-800' },
    { bg: 'bg-cyan-100', text: 'text-cyan-800' },
    { bg: 'bg-teal-100', text: 'text-teal-800' },
    { bg: 'bg-lime-100', text: 'text-lime-800' },
    { bg: 'bg-amber-100', text: 'text-amber-800' },
    { bg: 'bg-rose-100', text: 'text-rose-800' },
    { bg: 'bg-violet-100', text: 'text-violet-800' },
  ];
  
  // Gera um hash simples do ID para sempre ter a mesma cor para o mesmo convênio
  let hash = 0;
  for (let i = 0; i < convenioId.length; i++) {
    const char = convenioId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export const ServicosPage = () => {
  const [servicos, setServicos] = useState<ServicoAPI[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Servico | null>(null);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [form, setForm] = useState<FormularioServico>({
    nome: '',
    descricao: '',
    duracaoMinutos: '',
    preco: '',
    percentualClinica: null,
    percentualProfissional: null,
    procedimentoPrimeiroAtendimento: '',
    procedimentoDemaisAtendimentos: '',
    convenioId: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [excluindo, setExcluindo] = useState<Servico | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [paginaAtual, setPaginaAtual] = useState(1);

  useEffect(() => {
    fetchServicos();
    fetchConvenios();
  }, []);

  const fetchServicos = async () => {
    setLoading(true);
    try {
      const data = await getServicos();
      setServicos(data);
    } catch (e) {
      toast({ title: 'Erro ao carregar serviços', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchConvenios = async () => {
    try {
      const data = await getConvenios();
      setConvenios(data);
    } catch (e) {
      toast({ title: 'Erro ao carregar convênios', variant: 'destructive' });
    }
  };

  const servicosFiltrados = servicos.filter(s =>
    s.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (s.descricao || '').toLowerCase().includes(busca.toLowerCase())
  );

  const totalPaginas = Math.ceil(servicosFiltrados.length / itensPorPagina);
  const servicosPaginados = servicosFiltrados.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, itensPorPagina]);

  const abrirModalNovo = () => {
    setEditando(null);
    setForm({
      nome: '',
      descricao: '',
      duracaoMinutos: '',
      preco: '',
      percentualClinica: null,
      percentualProfissional: null,
      procedimentoPrimeiroAtendimento: '',
      procedimentoDemaisAtendimentos: '',
      convenioId: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const abrirModalEditar = (s: ServicoAPI) => {
    setEditando(s);
    let precoValue = '';
    if (s.preco !== undefined && s.preco !== null) {
      precoValue = formatarMoedaBRL(String(s.preco));
    }
    setForm({
      nome: s.nome,
      descricao: s.descricao || '',
      duracaoMinutos: s.duracaoMinutos !== undefined && s.duracaoMinutos !== null ? String(s.duracaoMinutos) : '',
      preco: precoValue,
      percentualClinica: s.percentualClinica != null ? s.percentualClinica : 38,
      percentualProfissional: s.percentualProfissional != null ? s.percentualProfissional : 62,
      procedimentoPrimeiroAtendimento: s.procedimentoPrimeiroAtendimento || '',
      procedimentoDemaisAtendimentos: s.procedimentoDemaisAtendimentos || '',
      convenioId: s.convenio?.id || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
    setForm({
      nome: '',
      descricao: '',
      duracaoMinutos: '',
      preco: '',
      percentualClinica: null,
      percentualProfissional: null,
      procedimentoPrimeiroAtendimento: '',
      procedimentoDemaisAtendimentos: '',
      convenioId: '',
    });
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || form.nome.trim().length < 2) {
      setFormError('O nome deve ter pelo menos 2 caracteres.');
      return;
    }
    const duracaoNumber = Number(form.duracaoMinutos);
    if (isNaN(duracaoNumber) || duracaoNumber < 1) {
      setFormError('A duração deve ser maior ou igual a 1.');
      return;
    }
    // Converter para número puro (substituir vírgula por ponto, remover pontos)
    const precoNumber = Number(form.preco.replace(/\./g, '').replace(',', '.'));
    if (isNaN(precoNumber) || precoNumber < 1) {
      setFormError('O preço deve ser maior ou igual a 1.');
      return;
    }
    if (!form.convenioId) {
      setFormError('Selecione um convênio.');
      return;
    }
    const nomeDuplicado = servicos.some(s =>
      s.nome.trim().toLowerCase() === form.nome.trim().toLowerCase() &&
      s.convenio?.id === form.convenioId &&
      String(s.duracaoMinutos) === String(form.duracaoMinutos) &&
      (!editando || s.id !== editando.id)
    );
    if (nomeDuplicado) {
      setFormError('Já existe um serviço com este nome, convênio e duração.');
      setFormLoading(false);
      return;
    }
    setFormLoading(true);
    try {
      const payload = { ...form, duracaoMinutos: duracaoNumber, preco: precoNumber, convenioId: form.convenioId };
      console.log('Payload enviado para o backend:', payload);
      if (editando) {
        await updateServico(editando.id, payload);
        toast({ title: 'Serviço atualizado com sucesso', variant: 'success' });
      } else {
        await createServico(payload);
        toast({ title: 'Serviço criado com sucesso', variant: 'success' });
      }
      fecharModal();
      fetchServicos();
    } catch (e: any) {
      let msg = 'Erro ao salvar serviço';
      if (e?.response?.data?.message) {
        msg = e.response.data.message;
      } else if (e?.message) {
        msg = e.message;
      }
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setFormLoading(false);
    }
  };

  const confirmarExclusao = (s: Servico) => {
    setExcluindo(s);
  };

  const cancelarExclusao = () => {
    setExcluindo(null);
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    setDeleteLoading(true);
    try {
      await deleteServico(excluindo.id);
      toast({ title: 'Serviço excluído com sucesso', variant: 'success' });
      setExcluindo(null);
      fetchServicos();
    } catch (e) {
      toast({ title: 'Erro ao excluir serviço', variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="pt-2 pl-6 pr-6 h-full flex flex-col">
      <div className="sticky top-0 z-10 bg-white backdrop-blur border-b border-gray-200 flex justify-between items-center mb-6 px-6 py-4 rounded-lg gap-4 transition-shadow">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-4xl">🩺</span>
            <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Serviços
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar serviços..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full sm:w-64 md:w-80 lg:w-96 pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-blue-300"
              />
          </div>
          <Button 
            onClick={abrirModalNovo} 
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Serviço
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto rounded-lg bg-white shadow-sm border border-gray-100">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-200">
              <TableHead className="text-center py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg">🏥</span>
                  Convênios
                </div>
              </TableHead>
              <TableHead className="py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  Nome
                </div>
              </TableHead>
              <TableHead className="py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  Descrição
                </div>
              </TableHead>
              <TableHead className="text-center py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg">⏱️</span>
                  Duração (min)
                </div>
              </TableHead>
              <TableHead className="text-center py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg">💰</span>
                  Preço (R$)
                </div>
              </TableHead>
              <TableHead className="text-center py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg">🏥</span>
                  Clínica (%)
                </div>
              </TableHead>
              <TableHead className="text-center py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg">👨‍⚕️</span>
                  Profissional (%)
                </div>
              </TableHead>
              <TableHead className="py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚙️</span>
                  Ações
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {servicosPaginados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-3xl">🩺</span>
                    </div>
                    <p className="text-gray-500 font-medium">Nenhum serviço encontrado</p>
                    <p className="text-gray-400 text-sm">Tente ajustar os filtros de busca</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              servicosPaginados.map((s) => (
                <TableRow key={s.id} className="hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 transition-all duration-200 h-12">
                  <TableCell className="text-center py-2">
                    {s.convenio ? (() => {
                      const colors = getConvenioColor(s.convenio.id);
                      return (
                        <span className={`${colors.bg} ${colors.text} text-xs font-medium px-2 py-0.5 rounded`}>
                          {s.convenio.nome}
                        </span>
                      );
                    })() : (
                      <span className="text-gray-400 text-xs">Nenhum</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm font-medium">{s.nome}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm">{s.descricao}</span>
                  </TableCell>
                  <TableCell className="text-center py-2">
                    <span className="text-sm">{s.duracaoMinutos}</span>
                  </TableCell>
                  <TableCell className="text-center py-2">
                    <span className="text-sm font-medium text-green-600">{s.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </TableCell>
                  <TableCell className="text-center py-2">
                    <span className="text-sm">{s.percentualClinica != null ? s.percentualClinica.toFixed(2) : '-'}</span>
                  </TableCell>
                  <TableCell className="text-center py-2">
                    <span className="text-sm">{s.percentualProfissional != null ? s.percentualProfissional.toFixed(2) : '-'}</span>
                  </TableCell>
                  <TableCell className="py-2">
                      <div className="flex gap-1.5 flex-wrap">
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform" 
                        onClick={() => abrirModalEditar(s)}
                        title="Editar Serviço"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                        <Button
                          variant="outline"
                          size="sm"
                        className="group border-2 border-red-300 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 focus:ring-4 focus:ring-red-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                        onClick={() => confirmarExclusao(s)}
                        title="Excluir Serviço"
                        >
                        <Trash2 className="w-4 h-4 text-red-600 group-hover:text-white transition-colors" />
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 py-4 px-6 z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 flex items-center gap-2">
            <span className="text-lg">📊</span>
            Exibir
          </span>
          <select
            className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-blue-300"
            value={itensPorPagina}
            onChange={e => setItensPorPagina(Number(e.target.value))}
          >
            {[10, 25, 50, 100].map(qtd => (
              <option key={qtd} value={qtd}>{qtd}</option>
            ))}
          </select>
          <span className="text-sm text-gray-600">itens por página</span>
        </div>
        
        <div className="text-sm text-gray-600 flex items-center gap-2">
          <span className="text-lg">📈</span>
          Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, servicosFiltrados.length)} de {servicosFiltrados.length} resultados
        </div>

        {totalPaginas > 1 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
              disabled={paginaAtual === 1}
              className="border-2 border-gray-200 text-gray-700 hover:border-blue-500 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
            >
              <span className="mr-1 text-gray-600 group-hover:text-blue-600 transition-colors">⬅️</span>
              Anterior
            </Button>
            {(() => {
              const startPage = Math.max(1, Math.min(paginaAtual - 2, totalPaginas - 4));
              const endPage = Math.min(totalPaginas, startPage + 4);
              return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(page => (
                <Button
                  key={page}
                  variant={page === paginaAtual ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPaginaAtual(page)}
                  className={page === paginaAtual 
                    ? "bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-lg font-semibold" 
                    : "border-2 border-gray-200 text-gray-700 hover:border-blue-500 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
                  }
                >
                  {page}
                </Button>
              ));
            })()}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaAtual === totalPaginas}
              className="border-2 border-gray-200 text-gray-700 hover:border-blue-500 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
            >
              Próximo
              <span className="ml-1 text-gray-600 group-hover:text-blue-600 transition-colors">➡️</span>
            </Button>
          </div>
        )}
      </div>
      {/* Modal de cadastro/edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar Serviço' : 'Novo Serviço'}</DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">🏥</span>
                  <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent font-semibold">Convênio</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <SingleSelectDropdown
                    options={convenios}
                    selected={convenios.find(c => c.id === form.convenioId) || null}
                    onChange={(selected) => setForm(f => ({ ...f, convenioId: selected?.id || '' }))}
                    placeholder="Digite para buscar convênios..."
                    formatOption={(option) => option.nome}
                    headerText="Convênios disponíveis"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold">Nome do Serviço</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={form.nome}
                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    minLength={2}
                    disabled={formLoading}
                    autoFocus
                    className="hover:border-blue-300 focus:border-blue-500 focus:ring-blue-100"
                    placeholder="Ex: Consulta Médica"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-semibold">Descrição</span>
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    value={form.descricao || ''}
                    onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                    disabled={formLoading}
                    className="hover:border-purple-300 focus:border-purple-500 focus:ring-purple-100"
                    placeholder="Ex: Consulta médica especializada"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">⏱️</span>
                    <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent font-semibold">Duração (min)</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={form.duracaoMinutos}
                      onChange={e => setForm(f => ({ ...f, duracaoMinutos: e.target.value }))}
                      min={1}
                      disabled={formLoading}
                      className="hover:border-orange-300 focus:border-orange-500 focus:ring-orange-100"
                      placeholder="Ex: 30"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">💰</span>
                    <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent font-semibold">Preço (R$)</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={form.preco}
                      onChange={e => {
                        let valor = e.target.value;
                        valor = valor.replace(/[^\d,]/g, '');
                        const partes = valor.split(',');
                        if (partes.length > 2) valor = partes[0] + ',' + partes.slice(1).join('');
                        setForm(f => {
                          const precoNum = Number(valor.replace(/\./g, '').replace(',', '.'));
                          if (!editando && precoNum > 0 && (f.percentualClinica == null && f.percentualProfissional == null)) {
                            return { ...f, preco: valor, percentualClinica: 38, percentualProfissional: 62 };
                          }
                          return { ...f, preco: valor };
                        });
                      }}
                      onBlur={e => {
                        setForm(f => {
                          let novoForm = { ...f, preco: formatarMoedaBRL(f.preco) };
                          if (!editando && (f.percentualClinica == null && f.percentualProfissional == null)) {
                            novoForm.percentualClinica = 38;
                            novoForm.percentualProfissional = 62;
                          }
                          return novoForm;
                        });
                      }}
                      className="hover:border-green-300 focus:border-green-500 focus:ring-green-100"
                      placeholder="Ex: 150,00"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-4">
                {/* Clínica */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">🏥</span>
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent font-semibold">Valor Clínica</span>
                  </label>
                  <div className="flex gap-2 items-center">
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-sm">%</span>
                        <Input
                          type="number"
                          value={form.percentualClinica ?? ''}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '') {
                              setForm(f => ({ ...f, percentualClinica: null, percentualProfissional: null }));
                            } else {
                              const num = Math.max(0, Math.min(100, Number(val)));
                              setForm(f => ({
                                ...f,
                                percentualClinica: num,
                                percentualProfissional: 100 - num
                              }));
                            }
                          }}
                          min={0}
                          max={100}
                          step={0.01}
                          disabled={formLoading || !form.preco || isNaN(Number(form.preco.replace(/\./g, '').replace(',', '.'))) || Number(form.preco.replace(/\./g, '').replace(',', '.')) <= 0}
                          className="hover:border-blue-300 focus:border-blue-500 focus:ring-blue-100"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-sm">R$</span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={
                            form.percentualClinica != null && form.preco && !isNaN(Number(form.preco.replace(/\./g, '').replace(',', '.'))) && Number(form.preco.replace(/\./g, '').replace(',', '.')) > 0
                              ? ((form.percentualClinica / 100) * Number(form.preco.replace(/\./g, '').replace(',', '.'))).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : ''
                          }
                          onChange={e => {
                            let valor = e.target.value;
                            valor = valor.replace(/[^\d,]/g, '');
                            const partes = valor.split(',');
                            if (partes.length > 2) valor = partes[0] + ',' + partes.slice(1).join('');
                            // Atualiza percentualClinica e percentualProfissional a partir do valor em R$
                            const precoNum = Number(form.preco.replace(/\./g, '').replace(',', '.'));
                            if (!precoNum) return setForm(f => ({ ...f, percentualClinica: null, percentualProfissional: null }));
                            const valorNum = Number(valor.replace(/\./g, '').replace(',', '.'));
                            if (isNaN(valorNum)) return;
                            const pct = Number(((valorNum / precoNum) * 100).toFixed(2));
                            setForm(f => ({ ...f, percentualClinica: pct, percentualProfissional: 100 - pct }));
                          }}
                          onBlur={e => {
                            setForm(f => {
                              const precoNum = Number(f.preco.replace(/\./g, '').replace(',', '.'));
                              if (!precoNum || f.percentualClinica == null) return f;
                              const valor = ((f.percentualClinica / 100) * precoNum).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                              return { ...f, percentualClinica: f.percentualClinica, percentualProfissional: f.percentualProfissional };
                            });
                          }}
                          disabled={formLoading || !form.preco || isNaN(Number(form.preco.replace(/\./g, '').replace(',', '.'))) || Number(form.preco.replace(/\./g, '').replace(',', '.')) <= 0}
                          className="hover:border-blue-300 focus:border-blue-500 focus:ring-blue-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Profissional */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">👨‍⚕️</span>
                    <span className="bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent font-semibold">Valor Profissional</span>
                  </label>
                  <div className="flex gap-2 items-center">
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-sm">%</span>
                        <Input
                          type="number"
                          value={form.percentualProfissional ?? ''}
                          onChange={e => {
                            const val = e.target.value;
                            if (val === '') {
                              setForm(f => ({ ...f, percentualProfissional: null, percentualClinica: null }));
                            } else {
                              const num = Math.max(0, Math.min(100, Number(val)));
                              setForm(f => ({
                                ...f,
                                percentualProfissional: num,
                                percentualClinica: 100 - num
                              }));
                            }
                          }}
                          min={0}
                          max={100}
                          step={0.01}
                          disabled={formLoading || !form.preco || isNaN(Number(form.preco.replace(/\./g, '').replace(',', '.'))) || Number(form.preco.replace(/\./g, '').replace(',', '.')) <= 0}
                          className="hover:border-green-300 focus:border-green-500 focus:ring-green-100"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-sm">R$</span>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={
                            form.percentualProfissional != null && form.preco && !isNaN(Number(form.preco.replace(/\./g, '').replace(',', '.'))) && Number(form.preco.replace(/\./g, '').replace(',', '.')) > 0
                              ? ((form.percentualProfissional / 100) * Number(form.preco.replace(/\./g, '').replace(',', '.'))).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : ''
                          }
                          onChange={e => {
                            let valor = e.target.value;
                            valor = valor.replace(/[^\d,]/g, '');
                            const partes = valor.split(',');
                            if (partes.length > 2) valor = partes[0] + ',' + partes.slice(1).join('');
                            // Atualiza percentualProfissional e percentualClinica a partir do valor em R$
                            const precoNum = Number(form.preco.replace(/\./g, '').replace(',', '.'));
                            if (!precoNum) return setForm(f => ({ ...f, percentualProfissional: null, percentualClinica: null }));
                            const valorNum = Number(valor.replace(/\./g, '').replace(',', '.'));
                            if (isNaN(valorNum)) return;
                            const pct = Number(((valorNum / precoNum) * 100).toFixed(2));
                            setForm(f => ({ ...f, percentualProfissional: pct, percentualClinica: 100 - pct }));
                          }}
                          onBlur={e => {
                            setForm(f => {
                              const precoNum = Number(f.preco.replace(/\./g, '').replace(',', '.'));
                              if (!precoNum || f.percentualProfissional == null) return f;
                              const valor = ((f.percentualProfissional / 100) * precoNum).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                              return { ...f, percentualProfissional: f.percentualProfissional, percentualClinica: f.percentualClinica };
                            });
                          }}
                          disabled={formLoading || !form.preco || isNaN(Number(form.preco.replace(/\./g, '').replace(',', '.'))) || Number(form.preco.replace(/\./g, '').replace(',', '.')) <= 0}
                          className="hover:border-green-300 focus:border-green-500 focus:ring-green-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="w-full mt-6 mb-2">
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[form.percentualClinica ?? 0]}
                  onValueChange={([value]) => {
                    setForm(f => ({
                      ...f,
                      percentualClinica: value,
                      percentualProfissional: 100 - value
                    }));
                  }}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">🩺</span>
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent font-semibold">Procedimento 1º Atendimento</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={form.procedimentoPrimeiroAtendimento || ''}
                      onChange={e => setForm(f => ({ ...f, procedimentoPrimeiroAtendimento: e.target.value }))}
                      disabled={formLoading}
                      className="hover:border-purple-300 focus:border-purple-500 focus:ring-purple-100"
                      placeholder="Ex: 10101012"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-800 mb-1 flex items-center gap-2">
                    <span className="text-lg">🩺</span>
                    <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-semibold">Procedimento Demais Atendimentos</span>
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={form.procedimentoDemaisAtendimentos || ''}
                      onChange={e => setForm(f => ({ ...f, procedimentoDemaisAtendimentos: e.target.value }))}
                      disabled={formLoading}
                      className="hover:border-indigo-300 focus:border-indigo-500 focus:ring-indigo-100"
                      placeholder="Ex: 10101013"
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="flex items-center justify-between">
              <div className="flex-1">
                {formError && <FormErrorMessage>{formError}</FormErrorMessage>}
              </div>
              <div className="flex gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="cancel" disabled={formLoading}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={formLoading} className="bg-blue-600 hover:bg-blue-700">
                  {formLoading ? 'Salvando...' : (editando ? 'Salvar Alterações' : 'Cadastrar')}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Modal de confirmação de exclusão */}
      <ConfirmDeleteModal
        open={!!excluindo}
        onClose={() => setExcluindo(null)}
        onConfirm={handleDelete}
        title="Confirmar Exclusão de Serviço"
        entityName={excluindo?.nome || ''}
        entityType="serviço"
        isLoading={deleteLoading}
        loadingText="Excluindo serviço..."
        confirmText="Excluir Serviço"
      />
    </div>
  );
};
