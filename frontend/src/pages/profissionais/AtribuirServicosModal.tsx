import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type { Servico } from '@/types/Servico';
import type { Convenio } from '@/types/Convenio';
import type { Profissional } from '@/types/Profissional';
import { getProfissional } from '@/services/profissionais';

interface Props {
  open: boolean;
  onClose: () => void;
  profissional: Profissional;
  convenios: Convenio[];
  servicos: Servico[];
  onSalvar: (servicosIds: string[]) => Promise<void>;
}

export default function AtribuirServicosModal({ open, onClose, profissional, convenios, servicos, onSalvar }: Props) {
  if (!profissional) return null;
  const [categoria, setCategoria] = useState<string>('todos');
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [profissionalCompleto, setProfissionalCompleto] = useState<Profissional | null>(null);
  const [carregandoProfissional, setCarregandoProfissional] = useState(false);

  // Se não há dados carregados ainda, não mostrar o modal
  if (!convenios.length || !servicos.length) {
    return null;
  }

  // Carregar dados completos do profissional quando o modal abrir
  useEffect(() => {
    async function carregarProfissionalCompleto() {
      if (open && profissional) {
        setCarregandoProfissional(true);
        try {
          const profCompleto = await getProfissional(profissional.id);
          setProfissionalCompleto(profCompleto);
          
          // A API pode retornar servicosIds (array de strings) ou servicos (array de objetos)
          let servicosIdsArray: string[] = [];
          
          if (profCompleto.servicosIds && Array.isArray(profCompleto.servicosIds)) {
            // Se tem servicosIds, usar diretamente
            servicosIdsArray = profCompleto.servicosIds;
          } else if (profCompleto.servicos && Array.isArray(profCompleto.servicos)) {
            // Se tem servicos (objetos), extrair os IDs
            servicosIdsArray = profCompleto.servicos.map(s => s.id);
          }
          
          
          setSelecionados(servicosIdsArray);
        } catch (error) {
          console.error('Erro ao carregar profissional completo:', error);
          // Fallback para os dados básicos
          setProfissionalCompleto(profissional);
          
          // Mesmo fallback logic
          let servicosIdsArray: string[] = [];
          if (profissional.servicosIds && Array.isArray(profissional.servicosIds)) {
            servicosIdsArray = profissional.servicosIds;
          } else if (profissional.servicos && Array.isArray(profissional.servicos)) {
            servicosIdsArray = profissional.servicos.map(s => s.id);
          }
          
          setSelecionados(servicosIdsArray);
        } finally {
          setCarregandoProfissional(false);
        }
      }
    }

    carregarProfissionalCompleto();
  }, [open, profissional]);

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
          {carregandoProfissional && (
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              Carregando dados do profissional...
            </div>
          )}
        </DialogHeader>
        <div className="flex h-[60vh] divide-x">
          {/* Sidebar categorias */}
          <div className="w-56 p-4 overflow-y-auto bg-gradient-to-b from-gray-50 to-white border-r">
            <div className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
              <span className="text-lg">📋</span>
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Categorias</span>
            </div>
            <ul>
              <li className="mb-2">
                <button 
                  className={`w-full text-left py-3 px-3 rounded-xl flex justify-between items-center transition-all duration-200 shadow-sm hover:shadow-md ${
                    categoria === 'todos' 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold transform scale-105' 
                      : 'bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300'
                  }`} 
                  onClick={() => setCategoria('todos')}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">🏥</span>
                    <span>Todos os serviços</span>
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    categoria === 'todos' 
                      ? 'bg-white/20 text-white' 
                      : 'bg-blue-100 text-blue-600'
                  }`}>{servicos.length}</span>
                </button>
              </li>
              {convenios.map(c => {
                const servicosDoConvenio = servicos.filter(s => 
                  s.convenioId === c.id
                );
                return (
                <li key={c.id} className="mb-2">
                    <button 
                      className={`w-full text-left py-3 px-3 rounded-xl flex justify-between items-center transition-all duration-200 shadow-sm hover:shadow-md ${
                        categoria === c.id 
                          ? 'bg-gradient-to-r from-green-500 to-teal-600 text-white font-semibold transform scale-105' 
                          : 'bg-white hover:bg-green-50 border border-gray-200 hover:border-green-300'
                      }`} 
                      onClick={() => setCategoria(c.id)}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-sm">🏢</span>
                        <span className="truncate">{c.nome}</span>
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        categoria === c.id 
                          ? 'bg-white/20 text-white' 
                          : 'bg-green-100 text-green-600'
                      }`}>{servicosDoConvenio.length}</span>
                    </button>
                </li>
                );
              })}
            </ul>
          </div>
          {/* Coluna serviços */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Pesquisar serviços..."
                  className="pl-12 pr-4 py-3 hover:border-blue-300 focus:border-blue-500 focus:ring-blue-100"
                />
              </div>
            </div>
            {/* Contador de selecionados */}
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">✅</span>
                <span className="text-sm font-medium text-gray-700">Selecionados:</span>
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold px-3 py-1 rounded-full shadow-sm">{selecionados.length}</span>
              </div>
              {categoria !== 'todos' && (
                <button
                  onClick={() => setCategoria('todos')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline transition-colors"
                >
                  Ver todos
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="flex items-center gap-3 px-4 py-3 border-b bg-gradient-to-r from-gray-50 to-white hover:from-blue-50 hover:to-purple-50 transition-all duration-200">
                <input 
                  type="checkbox" 
                  checked={todosSelecionados} 
                  onChange={toggleTodos}
                  className="w-4 h-4 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500 focus:ring-2" 
                />
                <span className="font-semibold text-gray-700 flex items-center gap-2">
                  <span className="text-sm">🎯</span>
                  <span>Selecionar todos visíveis</span>
                </span>
                {servicosFiltrados.length > 0 && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">({servicosFiltrados.length})</span>
                )}
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
                      className={`flex items-center gap-3 px-4 py-3 border-b cursor-pointer transition-all duration-200 ${
                        selecionados.includes(s.id) 
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-l-green-500 hover:from-green-100 hover:to-emerald-100' 
                          : 'hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50'
                      }`}
                      onClick={() => toggleServico(s.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selecionados.includes(s.id)}
                        onChange={e => { e.stopPropagation(); toggleServico(s.id); }}
                        onClick={e => e.stopPropagation()}
                        className="w-4 h-4 text-green-600 border-2 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                      />
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-sm">🔧</span>
                        <span className="font-medium text-gray-800">{s.nome}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">{s.duracaoMinutos}min</span>
                        {selecionados.includes(s.id) && (
                          <span className="text-green-600 text-sm">✓</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="flex items-center justify-between p-4 border-t">
          <Button type="button" variant="outline" className="text-pink-600 border-pink-200 hover:bg-pink-50 hover:text-pink-700" onClick={limparTodos} disabled={loading}>LIMPAR TODOS OS SERVIÇOS</Button>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button type="button" variant="cancel" disabled={loading}>Cancelar</Button>
            </DialogClose>
            <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={handleSalvar} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </DialogFooter>
        {erro && (
          <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <span className="text-red-500 text-lg">⚠️</span>
            <span className="text-red-700 text-sm font-medium">{erro}</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 