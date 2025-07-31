import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search, Edit, Trash2, User, Briefcase, DollarSign, Percent, Clock } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { FormErrorMessage } from '@/components/form-error-message';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

import { Badge } from '@/components/ui/badge';
import type { PrecoServicoProfissional } from '@/types/PrecoServicoProfissional';
import type { Profissional } from '@/types/Profissional';
import type { Servico } from '@/types/Servico';
import { 
  getPrecosServicoProfissional, 
  createPrecoServicoProfissional, 
  updatePrecoServicoProfissional, 
  deletePrecoServicoProfissional 
} from '@/services/precos-servicos-profissionais';
import { getProfissionais } from '@/services/profissionais';
import { getServicos } from '@/services/servicos';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

interface FormData {
  profissionalId: string;
  servicoId: string;
  valorProfissional: string;
}

// Função para determinar a cor de fundo baseada no percentual do profissional
// Padrão: 62% profissional (verde) - quanto maior que 62%, mais vermelho
// Usada também para clínica: se profissional está verde, clínica também está
function getPercentualProfissionalColor(percentual: number | null) {
  if (percentual === null) return { bg: 'bg-gray-100', text: 'text-gray-600' };
  
  const padrao = 62; // Percentual padrão para profissionais
  
  if (percentual <= padrao) {
    // Verde: percentual menor ou igual ao padrão
    return { bg: 'bg-green-100', text: 'text-green-800' };
  } else if (percentual <= padrao + 5) {
    // Amarelo: até 5% acima do padrão (62% a 67%)
    return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
  } else if (percentual <= padrao + 10) {
    // Laranja: até 10% acima do padrão (67% a 72%)
    return { bg: 'bg-orange-100', text: 'text-orange-800' };
  } else {
    // Vermelho: mais de 10% acima do padrão (>72%)
    return { bg: 'bg-red-100', text: 'text-red-800' };
  }
}

export default function PrecosServicoProfissionalPage() {
  const [precos, setPrecos] = useState<PrecoServicoProfissional[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<PrecoServicoProfissional | null>(null);
  const [form, setForm] = useState<FormData>({
    profissionalId: '',
    servicoId: '',
    valorProfissional: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [excluindo, setExcluindo] = useState<PrecoServicoProfissional | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [paginaAtual, setPaginaAtual] = useState(1);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [precosData, profissionaisData, servicosData] = await Promise.all([
        getPrecosServicoProfissional(),
        getProfissionais(),
        getServicos(),
      ]);
      
      setPrecos(precosData);
      setProfissionais(profissionaisData);
      setServicos(servicosData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setFormError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const normalizar = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  
  const precosFiltrados = precos.filter(p => {
    const profissional = profissionais.find(prof => prof.id === p.profissionalId);
    const servico = servicos.find(s => s.id === p.servicoId);
    const buscaNorm = normalizar(busca);
    
    return (
      (profissional && normalizar(profissional.nome).includes(buscaNorm)) ||
      (servico && normalizar(servico.nome).includes(buscaNorm))
    );
  });

  // Ordenar os dados: primeiro por nome, segundo por serviço, terceiro por duração
  const precosOrdenados = precosFiltrados.sort((a, b) => {
    const profissionalA = profissionais.find(p => p.id === a.profissionalId);
    const profissionalB = profissionais.find(p => p.id === b.profissionalId);
    const servicoA = servicos.find(s => s.id === a.servicoId);
    const servicoB = servicos.find(s => s.id === b.servicoId);

    // 1º critério: Nome do profissional (alfabética)
    const nomeA = normalizar(profissionalA?.nome || '');
    const nomeB = normalizar(profissionalB?.nome || '');
    if (nomeA !== nomeB) {
      return nomeA.localeCompare(nomeB);
    }

    // 2º critério: Nome do serviço (alfabética)
    const servicoNomeA = normalizar(servicoA?.nome || '');
    const servicoNomeB = normalizar(servicoB?.nome || '');
    if (servicoNomeA !== servicoNomeB) {
      return servicoNomeA.localeCompare(servicoNomeB);
    }

    // 3º critério: Duração (numérica)
    const duracaoA = servicoA?.duracaoMinutos || 0;
    const duracaoB = servicoB?.duracaoMinutos || 0;
    return duracaoA - duracaoB;
  });

  const totalPaginas = Math.ceil(precosOrdenados.length / itensPorPagina);
  const precosPaginados = precosOrdenados.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, itensPorPagina]);

  const abrirModalNovo = () => {
    setEditando(null);
    setForm({
      profissionalId: '',
      servicoId: '',
      valorProfissional: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const abrirModalEditar = (preco: PrecoServicoProfissional) => {
    setEditando(preco);
    
    // Calcular valor em R$ a partir do percentual salvo no banco
    const valorEmReais = calcularValorEmReais(preco, 'profissional');
    
    setForm({
      profissionalId: preco.profissionalId,
      servicoId: preco.servicoId,
      valorProfissional: valorEmReais.toLocaleString('pt-BR', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      }),
    });
    setFormError('');
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setEditando(null);
    setForm({
      profissionalId: '',
      servicoId: '',
      valorProfissional: '',
    });
    setFormError('');
  };

  const calcularPercentuais = (servicoId: string, valorProfissional: number) => {
    const servico = servicos.find(s => s.id === servicoId);
    if (!servico || !servico.preco || valorProfissional <= 0) {
      return { 
        percentualProfissional: 0, 
        percentualClinica: 0
      };
    }
    
    const percentualProfissional = Math.min(100, (valorProfissional / servico.preco) * 100);
    const percentualClinica = 100 - percentualProfissional;
    
    return { 
      percentualProfissional: Number(percentualProfissional.toFixed(2)), 
      percentualClinica: Number(percentualClinica.toFixed(2))
    };
  };

  const formatarMoedaInput = (valor: string) => {
    // Remove tudo que não for dígito
    const numero = valor.replace(/\D/g, '');
    
    // Converte para centavos
    const valorEmCentavos = parseInt(numero) || 0;
    
    // Converte para reais
    const valorEmReais = valorEmCentavos / 100;
    
    // Formata com vírgula e pontos
    return valorEmReais.toLocaleString('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  const valorProfissionalNumerico = Number(form.valorProfissional.replace(/\./g, '').replace(',', '.')) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.profissionalId) {
      setFormError('Selecione um profissional.');
      return;
    }
    
    if (!form.servicoId) {
      setFormError('Selecione um serviço.');
      return;
    }
    
    const valorProf = valorProfissionalNumerico;
    
    if (valorProf <= 0) {
      setFormError('Digite um valor válido para o profissional.');
      return;
    }

    const servico = servicos.find(s => s.id === form.servicoId);
    
    if (!servico) {
      setFormError('Serviço não encontrado.');
      return;
    }

    if (valorProf > servico.preco) {
      setFormError('O valor do profissional não pode ser maior que o preço base do serviço.');
      return;
    }

    // Verificar se já existe um preço para esta combinação profissional/serviço
    const jaExiste = precos.some(p => 
      p.profissionalId === form.profissionalId && 
      p.servicoId === form.servicoId && 
      (!editando || p.id !== editando.id)
    );
    
    if (jaExiste) {
      const profissional = profissionais.find(p => p.id === form.profissionalId);
      const servico = servicos.find(s => s.id === form.servicoId);
      setFormError(`Já existe um preço personalizado para ${profissional?.nome} no serviço "${servico?.nome}". Use a opção "Editar" na tabela.`);
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      const { percentualProfissional, percentualClinica } = calcularPercentuais(form.servicoId, valorProf);
      
      // Salvar percentuais no banco (precoProfissional e precoClinica são para %)
      const dadosPreco: Omit<PrecoServicoProfissional, 'id'> = {
        profissionalId: form.profissionalId,
        servicoId: form.servicoId,
        precoProfissional: percentualProfissional,  // % do profissional
        precoClinica: percentualClinica,            // % da clínica
      };
      
      if (editando) {
        const precoAtualizado = await updatePrecoServicoProfissional(editando.id, dadosPreco);
        setPrecos(prev => prev.map(p => p.id === editando.id ? precoAtualizado : p));
      } else {
        const novoPreco = await createPrecoServicoProfissional(dadosPreco);
        setPrecos(prev => [...prev, novoPreco]);
      }
      
      fecharModal();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setFormError('Erro ao salvar preço personalizado. Tente novamente.');
    } finally {
      setFormLoading(false);
    }
  };

  const confirmarExclusao = (preco: PrecoServicoProfissional) => {
    setExcluindo(preco);
  };

  const cancelarExclusao = () => {
    setExcluindo(null);
  };

  const handleDelete = async () => {
    if (!excluindo) return;
    
    setDeleteLoading(true);
    try {
      await deletePrecoServicoProfissional(excluindo.id);
      setPrecos(prev => prev.filter(p => p.id !== excluindo.id));
      setExcluindo(null);
    } catch (error) {
      console.error('Erro ao excluir:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    });
  };

  const obterPercentualAtual = (precoItem: PrecoServicoProfissional) => {
    // precoProfissional já é o percentual salvo no banco
    return precoItem.precoProfissional || 0;
  };

  const calcularValorEmReais = (precoItem: PrecoServicoProfissional, tipo: 'profissional' | 'clinica') => {
    const servico = servicos.find(s => s.id === precoItem.servicoId);
    if (!servico?.preco) return 0;
    
    if (tipo === 'profissional') {
      const percentual = precoItem.precoProfissional || 0;
      return (servico.preco * percentual) / 100;
    } else {
      const percentual = precoItem.precoClinica || 0;
      return (servico.preco * percentual) / 100;
    }
  };

  if (loading) {
    return (
      <div className="pt-2 pl-6 pr-6 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando preços...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-2 pl-6 pr-6 h-full flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white backdrop-blur border-b border-gray-200 flex justify-between items-center mb-6 px-6 py-4 rounded-lg gap-4 transition-shadow">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-4xl">💼</span>
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Preços Serviços Profissionais
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por profissional ou serviço..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full sm:w-64 md:w-80 lg:w-96 pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200 hover:border-indigo-300"
            />
          </div>
          <Button 
            onClick={abrirModalNovo} 
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Preço
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-y-auto rounded-lg bg-white shadow-sm border border-gray-100">
        <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
                <TableHead className="py-3 text-sm font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👨‍⚕️</span>
                    Profissional
                  </div>
                </TableHead>
                <TableHead className="py-3 text-sm font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🩺</span>
                    Serviço
                  </div>
                </TableHead>
                <TableHead className="text-center py-3 text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">⏱️</span>
                    Duração
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
                    <span className="text-lg">💰</span>
                    Valor Clínica
                  </div>
                </TableHead>
                <TableHead className="text-center py-3 text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">💵</span>
                    Valor Profissional
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
                <TableHead className="text-right py-3 text-sm font-semibold text-gray-700">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-lg">⚙️</span>
                    Ações
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {precosPaginados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-3xl">💼</span>
                      </div>
                      <p className="text-gray-500 font-medium">
                        {busca ? 'Nenhum resultado encontrado' : 'Nenhum preço personalizado cadastrado'}
                      </p>
                      <p className="text-gray-400 text-sm">Tente ajustar os filtros de busca</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                precosPaginados.map((preco) => {
                  const profissional = profissionais.find(p => p.id === preco.profissionalId);
                  const servico = servicos.find(s => s.id === preco.servicoId);
                  const percentualAtual = obterPercentualAtual(preco);

                  return (
                    <TableRow key={preco.id} className="hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 h-12">
                      <TableCell className="py-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {profissional?.nome?.charAt(0).toUpperCase() || 'P'}
                          </div>
                          <span className="font-medium text-sm">{profissional?.nome || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center">
                          <span className="text-sm">{servico?.nome || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <div className="flex items-center justify-center">
                          <Clock className="w-3 h-3 text-gray-400 mr-1" />
                          <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {servico?.duracaoMinutos ? `${servico.duracaoMinutos} min` : 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <span className="text-sm font-medium text-green-600">{formatarMoeda(servico?.preco || 0)}</span>
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <span className="text-sm font-medium text-blue-600">
                          {formatarMoeda(calcularValorEmReais(preco, 'clinica'))}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <span className="text-sm font-medium text-emerald-600">
                          {formatarMoeda(calcularValorEmReais(preco, 'profissional'))}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-2">
                        {(() => {
                          const colors = getPercentualProfissionalColor(percentualAtual);
                          return (
                            <span className={`text-sm px-2 py-1 rounded-md font-medium ${colors.bg} ${colors.text}`}>
                              {(preco.precoClinica || 0).toFixed(2).replace('.', ',')}%
                            </span>
                          );
                        })()} 
                      </TableCell>
                      <TableCell className="text-center py-2">
                        {(() => {
                          const colors = getPercentualProfissionalColor(percentualAtual);
                          return (
                            <span className={`text-sm px-2 py-1 rounded-md font-medium ${colors.bg} ${colors.text}`}>
                              {percentualAtual.toFixed(2).replace('.', ',')}%
                            </span>
                          );
                        })()} 
                      </TableCell>
                      <TableCell className="text-right py-2">
                        <div className="flex justify-end gap-1.5 flex-wrap">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => abrirModalEditar(preco)}
                            className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 focus:ring-4 focus:ring-indigo-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                            title="Editar Preço"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => confirmarExclusao(preco)}
                            className="group border-2 border-red-300 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 focus:ring-4 focus:ring-red-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                            title="Excluir Preço"
                          >
                            <Trash2 className="w-4 h-4 text-red-600 group-hover:text-white transition-colors" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
      </div>
      
      {/* Paginação */}
      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4 py-4 px-6 z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 flex items-center gap-2">
            <span className="text-lg">📊</span>
            Exibir
          </span>
          <select
            className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all duration-200 hover:border-indigo-300"
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
          Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, precosOrdenados.length)} de {precosOrdenados.length} resultados
        </div>

        {totalPaginas > 1 && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
              disabled={paginaAtual === 1}
              className="border-2 border-gray-200 text-gray-700 hover:border-indigo-500 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
            >
              <span className="mr-1 text-gray-600 group-hover:text-indigo-600 transition-colors">⬅️</span>
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
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg font-semibold" 
                    : "border-2 border-gray-200 text-gray-700 hover:border-indigo-500 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
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
              className="border-2 border-gray-200 text-gray-700 hover:border-indigo-500 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-700 hover:shadow-lg hover:scale-110 transition-all duration-300 transform font-medium"
            >
              Próximo
              <span className="ml-1 text-gray-600 group-hover:text-indigo-600 transition-colors">➡️</span>
            </Button>
          </div>
        )}
      </div>

      {/* Modal de Criação/Edição */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editando ? 'Editar Preço Personalizado' : 'Novo Preço Personalizado'}
              </DialogTitle>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Profissional <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={form.profissionalId}
                    onValueChange={(value) => setForm(f => ({ ...f, profissionalId: value, servicoId: '' }))}
                    disabled={formLoading || !!editando}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {profissionais.map(profissional => (
                        <SelectItem key={profissional.id} value={profissional.id}>
                          {profissional.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Serviço <span className="text-red-500">*</span>
                    {form.profissionalId && (() => {
                      const profissionalSelecionado = profissionais.find(p => p.id === form.profissionalId);
                      
                      // Buscar pelos serviços vinculados
                      const servicosVinculados = servicos.filter(servico => {
                        if (profissionalSelecionado?.servicosIds?.includes(servico.id)) return true;
                        if (profissionalSelecionado?.servicos?.some(s => s.id === servico.id)) return true;
                        return false;
                      });

                      // Verificar quantos já têm preço personalizado
                      const servicosComPrecoPersonalizado = servicosVinculados.filter(servico => {
                        return precos.some(p => 
                          p.profissionalId === form.profissionalId && 
                          p.servicoId === servico.id &&
                          (!editando || p.id !== editando.id)
                        );
                      }).length;

                      const servicosDisponiveis = servicosVinculados.length - servicosComPrecoPersonalizado;

                      if (servicosVinculados.length > 0) {
                        return (
                          <span className="text-xs text-gray-500 font-normal ml-2">
                            ({servicosDisponiveis} disponíveis de {servicosVinculados.length})
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </label>
                  <Select
                    value={form.servicoId}
                    onValueChange={(value) => setForm(f => ({ ...f, servicoId: value }))}
                    disabled={formLoading || !!editando || !form.profissionalId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !form.profissionalId 
                          ? "Selecione primeiro o profissional" 
                          : "Selecione o serviço"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {(() => {
                        if (!form.profissionalId) return null;
                        
                        const profissionalSelecionado = profissionais.find(p => p.id === form.profissionalId);
                        
                        // Buscar pelos serviços vinculados - usar campo 'servicos' que vem da API
                        const servicosVinculados = servicos.filter(servico => {
                          // Verificar se existe no array servicosIds (se vier como string[])
                          if (profissionalSelecionado?.servicosIds?.includes(servico.id)) {
                            return true;
                          }
                          
                          // Verificar se existe no array servicos (se vier como objeto[])
                          if (profissionalSelecionado?.servicos?.some(s => s.id === servico.id)) {
                            return true;
                          }
                          
                          return false;
                        });

                        if (servicosVinculados.length === 0) {
                          return (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              Nenhum serviço vinculado a este profissional
                            </div>
                          );
                        }

                        // Verificar quantos serviços ainda não têm preço personalizado
                        const servicosDisponiveis = servicosVinculados.filter(servico => {
                          return !precos.some(p => 
                            p.profissionalId === form.profissionalId && 
                            p.servicoId === servico.id &&
                            (!editando || p.id !== editando.id)
                          );
                        });

                        // Se todos os serviços já têm preço personalizado
                        if (servicosDisponiveis.length === 0 && !editando) {
                          return (
                            <div className="px-3 py-2 text-sm text-amber-600 bg-amber-50">
                              Todos os serviços já possuem preços personalizados. Use a opção "Editar" na tabela.
                            </div>
                          );
                        }

                        return servicosVinculados.map(servico => {
                          // Verificar se já existe preço personalizado para este profissional + serviço
                          const jaTemPrecoPersonalizado = precos.some(p => 
                            p.profissionalId === form.profissionalId && 
                            p.servicoId === servico.id &&
                            (!editando || p.id !== editando.id) // Permitir editar o próprio registro
                          );

                          if (jaTemPrecoPersonalizado) {
                            return (
                              <div key={servico.id} className="px-3 py-2 text-sm text-gray-400 bg-gray-50 cursor-not-allowed">
                                <div className="flex items-center justify-between">
                                  <span>{servico.nome} - {servico.duracaoMinutos}min - {formatarMoeda(servico.preco)}</span>
                                  <span className="text-xs text-orange-600 font-medium ml-2">
                                    Já cadastrado - Use "Editar"
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <SelectItem key={servico.id} value={servico.id}>
                              {servico.nome} - {servico.duracaoMinutos}min - {formatarMoeda(servico.preco)}
                            </SelectItem>
                          );
                        });
                      })()}
                    </SelectContent>
                  </Select>
                  {form.profissionalId && (() => {
                    const profissionalSelecionado = profissionais.find(p => p.id === form.profissionalId);
                    
                    // Buscar pelos serviços vinculados - usar campo 'servicos' que vem da API
                    const servicosVinculados = servicos.filter(servico => {
                      // Verificar se existe no array servicosIds (se vier como string[])
                      if (profissionalSelecionado?.servicosIds?.includes(servico.id)) {
                        return true;
                      }
                      
                      // Verificar se existe no array servicos (se vier como objeto[])
                      if (profissionalSelecionado?.servicos?.some(s => s.id === servico.id)) {
                        return true;
                      }
                      
                      return false;
                    });
                    
                    if (servicosVinculados.length === 0) {
                      return (
                        <p className="text-sm text-orange-600 mt-1">
                          ⚠️ Este profissional não possui serviços vinculados. Configure os serviços no cadastro do profissional primeiro.
                        </p>
                      );
                    }
                    
                    return (
                      <p className="text-sm text-gray-500 mt-1">
                        {servicosVinculados.length} serviço(s) disponível(is) para este profissional
                      </p>
                    );
                  })()}
                </div>
              </div>

              {form.servicoId && (
                <>
                  {/* Informações do Serviço Selecionado */}
                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-gray-900 mb-3">📋 Dados Atuais do Serviço</h4>
                    {(() => {
                      const servicoSelecionado = servicos.find(s => s.id === form.servicoId);
                      if (!servicoSelecionado) return null;

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Preço Tabelado</label>
                            <input
                              type="text"
                              value={formatarMoeda(servicoSelecionado.preco)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-100 text-gray-700"
                              disabled
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">% Profissional Padrão</label>
                            <input
                              type="text"
                              value={`${(servicoSelecionado.percentualProfissional || 0).toFixed(1)}%`}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-100 text-gray-700"
                              disabled
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">% Clínica Padrão</label>
                            <input
                              type="text"
                              value={`${(servicoSelecionado.percentualClinica || 0).toFixed(1)}%`}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-100 text-gray-700"
                              disabled
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Valor Profissional Padrão</label>
                            <input
                              type="text"
                              value={formatarMoeda((servicoSelecionado.preco * (servicoSelecionado.percentualProfissional || 0)) / 100)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-100 text-blue-700 font-medium"
                              disabled
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Valor Clínica Padrão</label>
                            <input
                              type="text"
                              value={formatarMoeda((servicoSelecionado.preco * (servicoSelecionado.percentualClinica || 0)) / 100)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-100 text-purple-700 font-medium"
                              disabled
                              readOnly
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Duração</label>
                            <input
                              type="text"
                              value={`${servicoSelecionado.duracaoMinutos} minutos`}
                              className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-100 text-gray-700"
                              disabled
                              readOnly
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Configurar Percentuais Personalizados */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">⚙️ Configurar Valor Personalizado</h4>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor Profissional (R$) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">R$</span>
                        <input
                          type="text"
                          value={form.valorProfissional}
                          onChange={(e) => {
                            const valorFormatado = formatarMoedaInput(e.target.value);
                            setForm(f => ({ ...f, valorProfissional: valorFormatado }));
                          }}
                          className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0,00"
                          disabled={formLoading}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Digite o valor em reais que o profissional deve receber
                      </p>
                    </div>
                  </div>

                  {form.servicoId && form.valorProfissional && valorProfissionalNumerico > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h5 className="font-medium text-gray-900 mb-2">📊 Valores Calculados:</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        {(() => {
                          const { percentualProfissional, percentualClinica } = calcularPercentuais(form.servicoId, valorProfissionalNumerico);
                          
                          return (
                            <>
                              <div className="text-center p-3 bg-blue-50 rounded border border-blue-200">
                                <p className="text-xs text-gray-600 mb-1">% Profissional</p>
                                <p className="text-lg font-bold text-blue-700">
                                  {percentualProfissional.toFixed(2)}%
                                </p>
                              </div>
                              <div className="text-center p-3 bg-purple-50 rounded border border-purple-200">
                                <p className="text-xs text-gray-600 mb-1">% Clínica</p>
                                <p className="text-lg font-bold text-purple-700">
                                  {percentualClinica.toFixed(2)}%
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {(() => {
                          const servico = servicos.find(s => s.id === form.servicoId);
                          const valorClinica = servico ? servico.preco - valorProfissionalNumerico : 0;
                          
                          return (
                            <>
                              <div className="text-center p-2 bg-white rounded border">
                                <p className="text-xs text-gray-500">Preço Base</p>
                                <p className="font-semibold text-green-600">
                                  {formatarMoeda(servico?.preco || 0)}
                                </p>
                              </div>
                              <div className="text-center p-2 bg-white rounded border">
                                <p className="text-xs text-gray-500">Valor Profissional</p>
                                <p className="font-semibold text-blue-600">
                                  {formatarMoeda(valorProfissionalNumerico)}
                                </p>
                              </div>
                              <div className="text-center p-2 bg-white rounded border">
                                <p className="text-xs text-gray-500">Valor Clínica</p>
                                <p className="font-semibold text-purple-600">
                                  {formatarMoeda(Math.max(0, valorClinica))}
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between">
              <div className="flex-1">
                {formError && <FormErrorMessage>{formError}</FormErrorMessage>}
              </div>
              <div className="flex gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={formLoading}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={formLoading} className="bg-blue-600 hover:bg-blue-700">
                  {formLoading ? 'Salvando...' : editando ? 'Atualizar' : 'Salvar'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmDeleteModal
        open={!!excluindo}
        onClose={() => setExcluindo(null)}
        onConfirm={handleDelete}
        title="Confirmar Exclusão de Preço Personalizado"
        entityName={
          excluindo 
            ? `${profissionais.find(p => p.id === excluindo.profissionalId)?.nome} - ${servicos.find(s => s.id === excluindo.servicoId)?.nome}`
            : ''
        }
        entityType="preço personalizado"
        isLoading={deleteLoading}
        loadingText="Excluindo preço personalizado..."
        confirmText="Excluir Preço"
      />
    </div>
  );
}
