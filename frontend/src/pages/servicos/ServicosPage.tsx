import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
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

// Adiciona um tipo local para refletir o retorno real da API
interface ServicoComConvenios extends Servico {
  convenios?: { id: string; nome: string }[];
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
  conveniosIds: string[];
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

export const ServicosPage = () => {
  const [servicos, setServicos] = useState<ServicoComConvenios[]>([]);
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
    conveniosIds: [],
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
      conveniosIds: [],
    });
    setFormError('');
    setShowModal(true);
  };

  const abrirModalEditar = (s: ServicoComConvenios) => {
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
      conveniosIds: s.convenios && s.convenios.length > 0 ? [s.convenios[0].id] : [],
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
      conveniosIds: [],
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
    if (!form.conveniosIds || form.conveniosIds.length === 0) {
      setFormError('Selecione um convênio.');
      return;
    }
    const nomeDuplicado = servicos.some(s =>
      s.nome.trim().toLowerCase() === form.nome.trim().toLowerCase() &&
      s.convenios &&
      s.convenios[0]?.id === form.conveniosIds[0] &&
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
      const payload = { ...form, duracaoMinutos: duracaoNumber, preco: precoNumber, conveniosIds: [form.conveniosIds[0]] };
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
          <h1 className="text-3xl font-bold text-gray-900">Serviços</h1>
          <p className="text-gray-600">Gerenciar serviços e procedimentos</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar serviços..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full sm:w-64 md:w-80 lg:w-96 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
          </div>
          <Button onClick={abrirModalNovo} className="bg-blue-600 hover:bg-blue-700 ml-2">
            <Plus className="w-4 h-4 mr-2" />
            Novo Serviço
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead className="py-2 text-sm">Convênios</TableHead>
              <TableHead className="py-2 text-sm">Nome</TableHead>
              <TableHead className="py-2 text-sm">Descrição</TableHead>
              <TableHead className="text-center py-2 text-sm">Duração (min)</TableHead>
              <TableHead className="text-center py-2 text-sm">Preço (R$)</TableHead>
              <TableHead className="text-center py-2 text-sm">Clínica (%)</TableHead>
              <TableHead className="text-center py-2 text-sm">Profissional (%)</TableHead>
              <TableHead className="py-2 text-sm">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {servicosPaginados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-6 text-center text-gray-500 text-sm">Nenhum serviço encontrado.</TableCell>
              </TableRow>
            ) : (
              servicosPaginados.map((s) => (
                <TableRow key={s.id} className="hover:bg-gray-50 h-12">
                  <TableCell className="py-2">
                    {s.convenios && s.convenios.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {s.convenios.map((c) => (
                          <span key={c.id} className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
                            {c.nome}
                      </span>
                        ))}
                      </div>
                    ) : (
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
                      <div className="flex gap-1">
                      <Button variant="default" size="sm" className="bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 h-7 w-7 p-0" onClick={() => abrirModalEditar(s as ServicoComConvenios)}>
                        <Edit className="w-3 h-3" />
                      </Button>
                        <Button
                          variant="outline"
                          size="sm"
                        className="group border-red-200 text-red-600 hover:bg-red-600 hover:text-white focus:ring-2 focus:ring-red-400 h-7 w-7 p-0"
                        onClick={() => confirmarExclusao(s)}
                        >
                        <Trash2 className="w-3 h-3 group-hover:text-white transition-colors" />
                        </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 py-3 px-6 z-10">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Exibir</span>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={itensPorPagina}
            onChange={e => setItensPorPagina(Number(e.target.value))}
          >
            {[10, 25, 50, 100].map(qtd => (
              <option key={qtd} value={qtd}>{qtd}</option>
            ))}
          </select>
          <span className="text-sm text-gray-600">itens por página</span>
        </div>
        
        <div className="text-sm text-gray-600">
          Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, servicosFiltrados.length)} de {servicosFiltrados.length} resultados
        </div>

        {totalPaginas > 1 && (
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
              disabled={paginaAtual === 1}
            >
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
                  className={page === paginaAtual ? "bg-blue-600 text-white" : ""}
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
            >
              Próximo
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
            <div className="mt-4 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Convênio <span className="text-red-500">*</span></label>
                <Select
                  value={form.conveniosIds[0] || ''}
                  onValueChange={value => setForm(f => ({ ...f, conveniosIds: [value] }))}
                  disabled={formLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o convênio" />
                  </SelectTrigger>
                  <SelectContent>
                    {convenios.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  minLength={2}
                  disabled={formLoading}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input
                  type="text"
                  value={form.descricao || ''}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={formLoading}
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duração (min) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={form.duracaoMinutos}
                    onChange={e => setForm(f => ({ ...f, duracaoMinutos: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min={1}
                    disabled={formLoading}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$) <span className="text-red-500">*</span></label>
                  <input
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                  />
                </div>
              </div>
              <div className="flex gap-8">
                {/* Clínica */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Clínica</label>
                  <div className="flex gap-2 items-center">
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-sm">%</span>
                        <input
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
                          className="w-full border border-gray-300 rounded-lg px-2 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                          min={0}
                          max={100}
                          step={0.01}
                          disabled={formLoading || !form.preco || isNaN(Number(form.preco.replace(/\./g, '').replace(',', '.'))) || Number(form.preco.replace(/\./g, '').replace(',', '.')) <= 0}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-sm">R$</span>
                        <input
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
                          className="w-full border border-gray-300 rounded-lg px-2 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                          disabled={formLoading || !form.preco || isNaN(Number(form.preco.replace(/\./g, '').replace(',', '.'))) || Number(form.preco.replace(/\./g, '').replace(',', '.')) <= 0}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Profissional */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Profissional</label>
                  <div className="flex gap-2 items-center">
                    <div className="grid grid-cols-2 gap-2 w-full">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-sm">%</span>
                        <input
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
                          className="w-full border border-gray-300 rounded-lg px-2 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                          min={0}
                          max={100}
                          step={0.01}
                          disabled={formLoading || !form.preco || isNaN(Number(form.preco.replace(/\./g, '').replace(',', '.'))) || Number(form.preco.replace(/\./g, '').replace(',', '.')) <= 0}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-sm">R$</span>
                        <input
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
                          className="w-full border border-gray-300 rounded-lg px-2 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                          disabled={formLoading || !form.preco || isNaN(Number(form.preco.replace(/\./g, '').replace(',', '.'))) || Number(form.preco.replace(/\./g, '').replace(',', '.')) <= 0}
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
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Procedimento 1º Atendimento</label>
                  <input
                    type="text"
                    value={form.procedimentoPrimeiroAtendimento || ''}
                    onChange={e => setForm(f => ({ ...f, procedimentoPrimeiroAtendimento: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={formLoading}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Procedimento Demais Atendimentos</label>
                  <input
                    type="text"
                    value={form.procedimentoDemaisAtendimentos || ''}
                    onChange={e => setForm(f => ({ ...f, procedimentoDemaisAtendimentos: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={formLoading}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              {formError && <FormErrorMessage className="mb-2">{formError}</FormErrorMessage>}
              <DialogClose asChild>
                <Button type="button" variant="cancel" disabled={formLoading}>Cancelar</Button>
              </DialogClose>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={formLoading}>
                {formLoading ? 'Salvando...' : (editando ? 'Salvar Alterações' : 'Cadastrar')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Modal de confirmação de exclusão */}
      <AlertDialog open={!!excluindo} onOpenChange={open => !open && cancelarExclusao()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="py-2">
            Tem certeza que deseja excluir o serviço 
            <b
              className="inline-block max-w-xs truncate align-bottom"
              title={excluindo?.nome}
            >
              {excluindo?.nome}
            </b>?
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading} onClick={cancelarExclusao}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={deleteLoading} onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {deleteLoading ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
