import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

interface Convenio { id: string; nome: string; }
interface Servico { id: string; nome: string; duracao: number; convenioId?: string; }
interface Profissional { id: string; nome: string; }

interface Props {
  open: boolean;
  onClose: () => void;
  profissional: Profissional;
  convenios: Convenio[];
  servicos: Servico[];
  servicosAtribuidos: string[];
  onSalvar: (servicosIds: string[]) => Promise<void>;
}

export default function AtribuirServicosModal({ open, onClose, profissional, convenios, servicos, servicosAtribuidos, onSalvar }: Props) {
  if (!profissional) return null;
  const [categoria, setCategoria] = useState<string>('todos');
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState<string[]>(servicosAtribuidos);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');





  // Se não há dados carregados ainda, não mostrar o modal
  if (!convenios.length || !servicos.length) {
    return null;
  }

  // Sincronizar selecionados ao abrir o modal ou mudar servicosAtribuidos
  useEffect(() => {
    if (open) {
      setSelecionados(servicosAtribuidos);
    }
  }, [open, servicosAtribuidos]);

  // Filtra serviços por categoria e busca
  const servicosFiltrados = useMemo(() => {
    let lista = servicos;
    
    // Filtrar por categoria/convênio
    if (categoria !== 'todos') {
      lista = lista.filter(s => s.convenioId === categoria);
    }
    
    // Filtrar por busca
    if (busca.trim()) {
      const termoBusca = busca.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
      lista = lista.filter(s => 
        s.nome.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').includes(termoBusca)
      );
    }
    
    return lista;
  }, [servicos, categoria, busca]);

  const todosSelecionados = servicosFiltrados.length > 0 && servicosFiltrados.every(s => selecionados.includes(s.id));

  function toggleServico(id: string) {
    setSelecionados(sel => sel.includes(id) ? sel.filter(sid => sid !== id) : [...sel, id]);
  }
  function toggleTodos() {
    if (todosSelecionados) {
      setSelecionados(sel => sel.filter(id => !servicosFiltrados.some(s => s.id === id)));
    } else {
      setSelecionados(sel => Array.from(new Set([...sel, ...servicosFiltrados.map(s => s.id)])));
    }
  }
  function limparTodos() {
    setSelecionados([]);
  }
  async function handleSalvar() {
    setLoading(true);
    setErro('');
    try {
      await onSalvar(selecionados);
      onClose();
    } catch (e: any) {
      let msg = 'Erro ao salvar serviços.';
      if (e?.response?.data) {
        if (typeof e.response.data === 'string') {
          msg = e.response.data;
        } else if (e.response.data.message) {
          msg = e.response.data.message;
        } else if (e.response.data.error) {
          msg = e.response.data.error;
        }
      } else if (e?.message) {
        msg = e.message;
      }
      setErro(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="p-6 border-b">
          <DialogTitle>Serviços para {profissional.nome}</DialogTitle>
        </DialogHeader>
        <div className="flex h-[60vh] divide-x">
          {/* Sidebar categorias */}
          <div className="w-56 p-4 overflow-y-auto">
            <div className="font-semibold mb-2">Categorias</div>
            <ul>
              <li>
                <button 
                  className={`w-full text-left py-1 px-2 rounded flex justify-between items-center ${categoria === 'todos' ? 'bg-blue-100 font-bold' : ''}`} 
                  onClick={() => setCategoria('todos')}
                >
                  <span>Todos os serviços</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-1 rounded">{servicos.length}</span>
                </button>
              </li>
              {convenios.map(c => {
                const servicosDoConvenio = servicos.filter(s => 
                  Array.isArray(s.conveniosIds) && s.conveniosIds.includes(c.id)
                );
                return (
                <li key={c.id}>
                    <button 
                      className={`w-full text-left py-1 px-2 rounded flex justify-between items-center ${categoria === c.id ? 'bg-blue-100 font-bold' : ''}`} 
                      onClick={() => setCategoria(c.id)}
                    >
                      <span>{c.nome}</span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-1 rounded">{servicosDoConvenio.length}</span>
                    </button>
                </li>
                );
              })}
            </ul>
          </div>
          {/* Coluna serviços */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-2 p-4 border-b">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Pesquisar serviços..."
                className="w-full border-none outline-none bg-transparent text-gray-900 placeholder:text-gray-400"
              />
            </div>
            {/* Contador de selecionados */}
            <div className="px-4 py-2 text-sm text-gray-600 flex items-center gap-2">
              <span className="font-medium">Selecionados:</span>
              <span className="font-bold text-blue-600">{selecionados.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="flex items-center gap-2 px-4 py-2 border-b">
                <input type="checkbox" checked={todosSelecionados} onChange={toggleTodos} />
                <span className="font-medium">Selecionar tudo</span>
              </div>
              {servicosFiltrados.length === 0 ? (
                <div className="px-4 py-8 text-gray-400 text-center">
                  <div className="text-lg mb-2">🔍 Nenhum serviço encontrado</div>
                  {categoria !== 'todos' ? (
                    <div className="text-sm">
                      Não há serviços vinculados ao convênio selecionado.
                      <br />
                      <button 
                        className="text-blue-500 underline mt-2"
                        onClick={() => setCategoria('todos')}
                      >
                        Ver todos os serviços
                      </button>
                    </div>
                  ) : busca.trim() ? (
                    <div className="text-sm">
                      Tente ajustar o termo de busca.
                    </div>
                  ) : (
                    <div className="text-sm">
                      Nenhum serviço cadastrado no sistema.
                    </div>
                  )}
                </div>
              ) : (
                <ul>
                  {servicosFiltrados.map(s => (
                    <li
                      key={s.id}
                      className={`flex items-center gap-3 px-4 py-2 border-b hover:bg-blue-50 cursor-pointer ${selecionados.includes(s.id) ? 'bg-blue-50' : ''}`}
                      onClick={() => toggleServico(s.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selecionados.includes(s.id)}
                        onChange={e => { e.stopPropagation(); toggleServico(s.id); }}
                        onClick={e => e.stopPropagation()}
                      />
                      <span className="flex-1">{s.nome}</span>
                      <span className="text-xs text-gray-500 w-12 text-right">{s.duracao}min</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="flex items-center justify-between p-4 border-t">
          <Button type="button" variant="outline" className="text-pink-600 border-pink-200 hover:bg-pink-50" onClick={limparTodos} disabled={loading}>LIMPAR TODOS OS SERVIÇOS</Button>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button type="button" variant="cancel" disabled={loading}>Cancelar</Button>
            </DialogClose>
            <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={handleSalvar} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogFooter>
        {erro && <div className="text-red-500 text-sm px-6 pb-2">{erro}</div>}
      </DialogContent>
    </Dialog>
  );
} 