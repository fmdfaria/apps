import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { getEspecialidades, createEspecialidade, updateEspecialidade, deleteEspecialidade } from '@/services/especialidades';
import type { Especialidade } from '@/types/Especialidade';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useToast, toast } from '@/components/ui/use-toast';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { FormErrorMessage } from '@/components/form-error-message';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

export const EspecialidadesPage = () => {
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Especialidade | null>(null);
  const [nome, setNome] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [excluindo, setExcluindo] = useState<Especialidade | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [paginaAtual, setPaginaAtual] = useState(1);

  useEffect(() => {
    fetchEspecialidades();
  }, []);

  const fetchEspecialidades = async () => {
    setLoading(true);
    try {
      const data = await getEspecialidades();
      setEspecialidades(data);
    } catch (e) {
      toast({ title: 'Erro ao carregar especialidades', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const especialidadesFiltradas = especialidades
    .filter(e =>
      e.nome.toLowerCase().includes(busca.toLowerCase())
    )
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const totalPaginas = Math.ceil(especialidadesFiltradas.length / itensPorPagina);
  const especialidadesPaginadas = especialidadesFiltradas.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  useEffect(() => {
    setPaginaAtual(1); // Sempre volta para página 1 ao buscar
  }, [busca, itensPorPagina]);

  const abrirModalNova = () => {
    setEditando(null);
    setNome('');
    setFormError('');
    setShowModal(true);
  };

  const abrirModalEditar = (esp: Especialidade) => {
    setEditando(esp);
    setNome(esp.nome);
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
    if (!nome.trim() || nome.trim().length < 1) {
      setFormError('O nome é obrigatório.');
      return;
    }
    setFormLoading(true);
    try {
      if (editando) {
        await updateEspecialidade(editando.id, { nome: nome.trim() });
        toast({ title: 'Especialidade atualizada com sucesso', variant: 'success' });
      } else {
        await createEspecialidade({ nome: nome.trim() });
        toast({ title: 'Especialidade criada com sucesso', variant: 'success' });
      }
      fecharModal();
      fetchEspecialidades();
    } catch (e: any) {
        let msg = 'Erro ao salvar especialidade';
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

  const confirmarExclusao = (esp: Especialidade) => {
    setExcluindo(esp);
  };

  const cancelarExclusao = () => {
    setExcluindo(null);
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    setDeleteLoading(true);
    try {
      await deleteEspecialidade(excluindo.id);
      toast({ title: 'Especialidade excluída com sucesso', variant: 'success' });
      setExcluindo(null);
      fetchEspecialidades();
    } catch (e) {
      toast({ title: 'Erro ao excluir especialidade', variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="pt-2 pl-6 pr-6 h-full flex flex-col">
      <div className="sticky top-0 z-10 bg-white backdrop-blur border-b border-gray-200 flex justify-between items-center mb-6 px-6 py-4 rounded-lg gap-4 transition-shadow">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-4xl">🎯</span>
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Especialidades
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar especialidades..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full sm:w-64 md:w-80 lg:w-96 pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200 hover:border-purple-300"
            />
          </div>
          <Button 
            onClick={abrirModalNova} 
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Especialidade
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="py-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">⏳</span>
            </div>
            <p className="text-gray-500 font-medium">Carregando especialidades...</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto rounded-lg bg-white shadow-sm border border-gray-100">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
                <TableHead className="py-3 text-sm font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎯</span>
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
              {especialidadesPaginadas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-3xl">🎯</span>
                      </div>
                      <p className="text-gray-500 font-medium">Nenhuma especialidade encontrada</p>
                      <p className="text-gray-400 text-sm">Tente ajustar os filtros de busca</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                especialidadesPaginadas.map((esp) => (
                  <TableRow key={esp.id} className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-200 h-12">
                    <TableCell className="py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {esp.nome.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{esp.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex gap-1.5 flex-wrap">
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 focus:ring-4 focus:ring-purple-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform" 
                          onClick={() => abrirModalEditar(esp)}
                          title="Editar Especialidade"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-2 border-red-300 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 focus:ring-4 focus:ring-red-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                          onClick={() => confirmarExclusao(esp)}
                          title="Excluir Especialidade"
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
      )}

      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 py-4 px-6 z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 flex items-center gap-2">
            <span className="text-lg">📊</span>
            Exibir
          </span>
          <select
            className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-100 focus:border-purple-500 transition-all duration-200 hover:border-purple-300"
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
          Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, especialidadesFiltradas.length)} de {especialidadesFiltradas.length} resultados
        </div>

        {totalPaginas > 1 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
              disabled={paginaAtual === 1}
              className="border-2 border-gray-200 text-gray-700 hover:border-purple-500 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:text-purple-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
            >
              <span className="mr-1 text-gray-600 group-hover:text-purple-600 transition-colors">⬅️</span>
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
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg font-semibold" 
                    : "border-2 border-gray-200 text-gray-700 hover:border-purple-500 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:text-purple-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
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
              className="border-2 border-gray-200 text-gray-700 hover:border-purple-500 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:text-purple-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
            >
              Próximo
              <span className="ml-1 text-gray-600 group-hover:text-purple-600 transition-colors">➡️</span>
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar Especialidade' : 'Nova Especialidade'}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                minLength={1}
                disabled={formLoading}
                autoFocus
              />
              {formError && <FormErrorMessage>{formError}</FormErrorMessage>}
            </div>
            <DialogFooter className="mt-6">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={formLoading}
                  className="border-2 border-gray-300 text-gray-700 hover:border-red-400 hover:bg-red-50 hover:text-red-700 font-semibold px-6 transition-all duration-200"
                >
                  <span className="mr-2">🔴</span>
                  Cancelar
                </Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={formLoading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl font-semibold px-8 transition-all duration-200 "
              >
                {formLoading ? (
                  <>
                    <span className="mr-2">⏳</span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🟢</span>
                    Salvar
                  </>
                )}
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
        title="Confirmar Exclusão de Especialidade"
        entityName={excluindo?.nome || ''}
        entityType="especialidade"
        isLoading={deleteLoading}
        loadingText="Excluindo especialidade..."
        confirmText="Excluir Especialidade"
      />
    </div>
  );
}; 