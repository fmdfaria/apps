import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { getEspecialidades, createEspecialidade, updateEspecialidade, deleteEspecialidade } from '@/services/especialidades';
import type { Especialidade } from '@/types/Especialidade';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { useToast, toast } from '@/components/ui/use-toast';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { FormErrorMessage } from '@/components/form-error-message';

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

  const especialidadesFiltradas = especialidades.filter(e =>
    e.nome.toLowerCase().includes(busca.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold text-gray-900">Especialidades</h1>
          <p className="text-gray-600">Gerenciar especialidades da clínica</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar especialidades..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full sm:w-64 md:w-80 lg:w-96 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <Button onClick={abrirModalNova} className="bg-blue-600 hover:bg-blue-700 ml-2">
            <Plus className="w-4 h-4 mr-2" />
            Nova Especialidade
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="py-8 text-center text-gray-500">Carregando...</div>
      ) : (
        <div className="flex-1 overflow-y-auto rounded-lg bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead className="py-2 text-sm">Nome</TableHead>
                <TableHead className="py-2 text-sm">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {especialidadesPaginadas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="py-6 text-center text-gray-500 text-sm">Nenhuma especialidade encontrada.</TableCell>
                </TableRow>
              ) : (
                especialidadesPaginadas.map((esp) => (
                  <TableRow key={esp.id} className="hover:bg-gray-50 h-12">
                    <TableCell className="py-2">
                      <span className="text-sm font-medium">{esp.nome}</span>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex gap-1">
                        <Button variant="default" size="sm" className="bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 h-7 w-7 p-0" onClick={() => abrirModalEditar(esp)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-red-200 text-red-600 hover:bg-red-600 hover:text-white focus:ring-2 focus:ring-red-400 h-7 w-7 p-0"
                          onClick={() => confirmarExclusao(esp)}
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
      )}

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
          Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, especialidadesFiltradas.length)} de {especialidadesFiltradas.length} resultados
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
                <Button type="button" variant="cancel" disabled={formLoading}>Cancelar</Button>
              </DialogClose>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={formLoading}>
                {formLoading ? 'Salvando...' : (editando ? 'Salvar Alterações' : 'Cadastrar')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!excluindo} onOpenChange={open => !open && cancelarExclusao()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="py-2">
            Tem certeza que deseja excluir a especialidade 
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