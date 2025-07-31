import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast, toast } from '@/components/ui/use-toast';
import { getRecursos, createRecurso, updateRecurso, deleteRecurso } from '@/services/recursos';
import type { Recurso } from '@/types/Recurso';
import { FormErrorMessage } from '@/components/form-error-message';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

export const RecursosPage = () => {
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Recurso | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [excluindo, setExcluindo] = useState<Recurso | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [paginaAtual, setPaginaAtual] = useState(1);

  useEffect(() => {
    fetchRecursos();
  }, []);

  const fetchRecursos = async () => {
    setLoading(true);
    try {
      const data = await getRecursos();
      setRecursos(data);
    } catch (e) {
      toast({ title: 'Erro ao carregar recursos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const recursosFiltrados = recursos.filter(r =>
    r.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (r.descricao || '').toLowerCase().includes(busca.toLowerCase())
  );

  const totalPaginas = Math.ceil(recursosFiltrados.length / itensPorPagina);
  const recursosPaginados = recursosFiltrados.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, itensPorPagina]);

  const abrirModalNovo = () => {
    setEditando(null);
    setNome('');
    setDescricao('');
    setFormError('');
    setShowModal(true);
  };

  const abrirModalEditar = (r: Recurso) => {
    setEditando(r);
    setNome(r.nome);
    setDescricao(r.descricao || '');
    setFormError('');
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
    setNome('');
    setDescricao('');
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
        await updateRecurso(editando.id, { nome: nome.trim(), descricao: descricao.trim() });
        toast({ title: 'Recurso atualizado com sucesso', variant: 'success' });
      } else {
        await createRecurso({ nome: nome.trim(), descricao: descricao.trim() });
        toast({ title: 'Recurso criado com sucesso', variant: 'success' });
      }
      fecharModal();
      fetchRecursos();
    } catch (e: any) {
      let msg = 'Erro ao salvar recurso';
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

  const confirmarExclusao = (r: Recurso) => {
    setExcluindo(r);
  };

  const cancelarExclusao = () => {
    setExcluindo(null);
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    setDeleteLoading(true);
    try {
      await deleteRecurso(excluindo.id);
      toast({ title: 'Recurso excluído com sucesso', variant: 'success' });
      setExcluindo(null);
      fetchRecursos();
    } catch (e) {
      toast({ title: 'Erro ao excluir recurso', variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="pt-2 pl-6 pr-6 h-full flex flex-col">
      <div className="sticky top-0 z-10 bg-white backdrop-blur border-b border-gray-200 flex justify-between items-center mb-6 px-6 py-4 rounded-lg gap-4 transition-shadow">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-4xl">🛠️</span>
            <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Recursos
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar recursos..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full sm:w-64 md:w-80 lg:w-96 pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all duration-200 hover:border-orange-300"
            />
          </div>
          <Button 
            onClick={abrirModalNovo} 
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Recurso
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto rounded-lg bg-white shadow-sm border border-gray-100">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-orange-50 to-red-50 border-b border-gray-200">
              <TableHead className="py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🛠️</span>
                  Nome
                </div>
              </TableHead>
              <TableHead className="py-3 text-sm font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📝</span>
                  Descrição
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
            {recursosPaginados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                      <span className="text-3xl">🛠️</span>
                    </div>
                    <p className="text-gray-500 font-medium">Nenhum recurso encontrado</p>
                    <p className="text-gray-400 text-sm">Tente ajustar os filtros de busca</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              recursosPaginados.map((r) => (
                <TableRow key={r.id} className="hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 transition-all duration-200 h-12">
                  <TableCell className="py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {r.nome.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{r.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-sm text-gray-600">{r.descricao || '-'}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex gap-1.5 flex-wrap">
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="bg-gradient-to-r from-orange-600 to-orange-700 text-white hover:from-orange-700 hover:to-orange-800 focus:ring-4 focus:ring-orange-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform" 
                        onClick={() => abrirModalEditar(r)}
                        title="Editar Recurso"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="group border-2 border-red-300 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 focus:ring-4 focus:ring-red-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                        onClick={() => confirmarExclusao(r)}
                        title="Excluir Recurso"
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
            className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-100 focus:border-orange-500 transition-all duration-200 hover:border-orange-300"
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
          Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, recursosFiltrados.length)} de {recursosFiltrados.length} resultados
        </div>

        {totalPaginas > 1 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
              disabled={paginaAtual === 1}
              className="border-2 border-gray-200 text-gray-700 hover:border-orange-500 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 hover:text-orange-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
            >
              <span className="mr-1 text-gray-600 group-hover:text-orange-600 transition-colors">⬅️</span>
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
                    ? "bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg font-semibold" 
                    : "border-2 border-gray-200 text-gray-700 hover:border-orange-500 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 hover:text-orange-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
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
              className="border-2 border-gray-200 text-gray-700 hover:border-orange-500 hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 hover:text-orange-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
            >
              Próximo
              <span className="ml-1 text-gray-600 group-hover:text-orange-600 transition-colors">➡️</span>
            </Button>
          </div>
        )}
      </div>
      {/* Modal de cadastro/edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar Recurso' : 'Novo Recurso'}</DialogTitle>
            </DialogHeader>
            <div className="mt-4 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input
                  type="text"
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={formLoading}
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
      <ConfirmDeleteModal
        open={!!excluindo}
        onClose={() => setExcluindo(null)}
        onConfirm={handleDelete}
        title="Confirmar Exclusão de Recurso"
        entityName={excluindo?.nome || ''}
        entityType="recurso"
        isLoading={deleteLoading}
        loadingText="Excluindo recurso..."
        confirmText="Excluir Recurso"
      />
    </div>
  );
}; 