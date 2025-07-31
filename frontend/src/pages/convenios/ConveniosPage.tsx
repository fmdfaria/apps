import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { useToast, toast } from '@/components/ui/use-toast';
import { getConvenios, createConvenio, updateConvenio, deleteConvenio } from '@/services/convenios';
import type { Convenio } from '@/types/Convenio';
import { FormErrorMessage } from '@/components/form-error-message';

export const ConveniosPage = () => {
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Convenio | null>(null);
  const [nome, setNome] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [excluindo, setExcluindo] = useState<Convenio | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [paginaAtual, setPaginaAtual] = useState(1);

  useEffect(() => {
    fetchConvenios();
  }, []);

  const fetchConvenios = async () => {
    setLoading(true);
    try {
      const data = await getConvenios();
      setConvenios(data);
    } catch (e) {
      toast({ title: 'Erro ao carregar convênios', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const conveniosFiltrados = convenios.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const totalPaginas = Math.ceil(conveniosFiltrados.length / itensPorPagina);
  const conveniosPaginados = conveniosFiltrados.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, itensPorPagina]);

  const abrirModalNovo = () => {
    setEditando(null);
    setNome('');
    setFormError('');
    setShowModal(true);
  };

  const abrirModalEditar = (c: Convenio) => {
    setEditando(c);
    setNome(c.nome);
    setFormError('');
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
    setNome('');
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || nome.trim().length < 2) {
      setFormError('O nome deve ter pelo menos 2 caracteres.');
      return;
    }
    setFormLoading(true);
    try {
      if (editando) {
        await updateConvenio(editando.id, { nome: nome.trim() });
        toast({ title: 'Convênio atualizado com sucesso', variant: 'success' });
      } else {
        await createConvenio({ nome: nome.trim() });
        toast({ title: 'Convênio criado com sucesso', variant: 'success' });
      }
      fecharModal();
      fetchConvenios();
    } catch (e: any) {
      let msg = 'Erro ao salvar convênio';
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

  const confirmarExclusao = (c: Convenio) => {
    setExcluindo(c);
  };

  const cancelarExclusao = () => {
    setExcluindo(null);
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    setDeleteLoading(true);
    try {
      await deleteConvenio(excluindo.id);
      toast({ title: 'Convênio excluído com sucesso', variant: 'success' });
      setExcluindo(null);
      fetchConvenios();
    } catch (e) {
      toast({ title: 'Erro ao excluir convênio', variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="pt-2 pl-6 pr-6 h-full flex flex-col">
      <div className="sticky top-0 z-10 bg-white backdrop-blur border-b border-gray-200 flex justify-between items-center mb-6 px-6 py-4 rounded-lg gap-4 transition-shadow">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-4xl">🏥</span>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Convênios
            </span>
          </h1>
          <p className="text-gray-600 flex items-center gap-2">
            <span className="text-lg">📋</span>
            Gerenciar convênios médicos
          </p>
        </div>
        <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar convênios..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full sm:w-64 md:w-80 lg:w-96 pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-blue-300"
              />
          </div>
          <Button 
            onClick={abrirModalNovo} 
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Convênio
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto rounded-lg bg-white shadow-sm border border-gray-100">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
              <TableHead className="py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏥</span>
                  Nome
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
            {conveniosPaginados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-3xl">🏥</span>
                    </div>
                    <p className="text-gray-500 font-medium">Nenhum convênio encontrado</p>
                    <p className="text-gray-400 text-sm">Tente ajustar os filtros de busca</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              conveniosPaginados.map((c) => (
                <TableRow key={c.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 h-12">
                  <TableCell className="py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {c.nome.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{c.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                      <div className="flex gap-1.5 flex-wrap">
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform" 
                        onClick={() => abrirModalEditar(c)}
                        title="Editar Convênio"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                        <Button
                          variant="outline"
                          size="sm"
                        className="group border-2 border-red-300 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 focus:ring-4 focus:ring-red-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                        onClick={() => confirmarExclusao(c)}
                        title="Excluir Convênio"
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
          Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, conveniosFiltrados.length)} de {conveniosFiltrados.length} resultados
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
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg font-semibold" 
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
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar Convênio' : 'Novo Convênio'}</DialogTitle>
            </DialogHeader>
            <div className="mt-4 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  minLength={2}
                  disabled={formLoading}
                  autoFocus
                />
              </div>
              {formError && <FormErrorMessage>{formError}</FormErrorMessage>}
            </div>
            <DialogFooter className="mt-6">
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
            Tem certeza que deseja excluir o convênio 
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
