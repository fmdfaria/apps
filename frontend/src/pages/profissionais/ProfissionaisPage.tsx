import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search, Trash2, MapPin, User, CreditCard, Building, List, Edit } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { getProfissionais, deleteProfissional, updateProfissionalServicos } from '@/services/profissionais';
import type { Profissional } from '@/types/Profissional';
import type { Servico } from '@/types/Servico';
import type { Convenio } from '@/types/Convenio';
import { getConvenios } from '@/services/convenios';
import { getServicos } from '@/services/servicos';
import CriarProfissionalModal from './CriarProfissionalModal';
import EditarProfissionalModal from './EditarProfissionalModal';
import AtribuirServicosModal from './AtribuirServicosModal';
import EditarEnderecoModal from './EditarEnderecoModal';
import EditarInfoProfissionalModal from './EditarInfoProfissionalModal';
import EditarDadosBancariosModal from './EditarDadosBancariosModal';
import EditarEmpresaContratoModal from './EditarEmpresaContratoModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

export default function ProfissionaisPage() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [busca, setBusca] = useState('');
  const [excluindo, setExcluindo] = useState<Profissional | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);

  // Modais específicos
  const [modalCriar, setModalCriar] = useState(false);
  const [modalEditar, setModalEditar] = useState<{ open: boolean, profissional: Profissional | null }>({ open: false, profissional: null });
  const [modalAtribuir, setModalAtribuir] = useState<{ open: boolean, profissional: Profissional | null }>({ open: false, profissional: null });
  const [modalEndereco, setModalEndereco] = useState<{ open: boolean, profissional: Profissional | null }>({ open: false, profissional: null });
  const [modalInfoProfissional, setModalInfoProfissional] = useState<{ open: boolean, profissional: Profissional | null }>({ open: false, profissional: null });
  const [modalDadosBancarios, setModalDadosBancarios] = useState<{ open: boolean, profissional: Profissional | null }>({ open: false, profissional: null });
  const [modalEmpresaContrato, setModalEmpresaContrato] = useState<{ open: boolean, profissional: Profissional | null }>({ open: false, profissional: null });

  // Função para formatar WhatsApp completo (13 dígitos) para exibição
  const formatWhatsApp = (whatsapp: string) => {
    if (!whatsapp) return '';
    const numbers = whatsapp.replace(/\D/g, '');
    if (numbers.length === 13) {
      // Formato: 5599999999999 -> +55 (99) 99999-9999
      return `+${numbers.slice(0, 2)} (${numbers.slice(2, 4)}) ${numbers.slice(4, 9)}-${numbers.slice(9)}`;
    }
    return whatsapp;
  };

  // Função para aplicar máscara durante a digitação  
  const applyWhatsAppMask = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    
    // Se está vazio, retorna vazio
    if (numbers.length === 0) {
      return '';
    }
    
    // Se começar digitando qualquer número, assume que será brasileiro (+55)
    let finalNumbers = numbers;
    if (numbers.length <= 11 && !numbers.startsWith('55')) {
      finalNumbers = '55' + numbers;
    }
    
    // Aplicar formatação baseada no comprimento
    if (finalNumbers.length <= 2) {
      return `+${finalNumbers}`;
    } else if (finalNumbers.length <= 4) {
      return `+${finalNumbers.slice(0, 2)} (${finalNumbers.slice(2)}`;
    } else if (finalNumbers.length <= 5) {
      return `+${finalNumbers.slice(0, 2)} (${finalNumbers.slice(2, 4)}) ${finalNumbers.slice(4)}`;
    } else if (finalNumbers.length <= 9) {
      return `+${finalNumbers.slice(0, 2)} (${finalNumbers.slice(2, 4)}) ${finalNumbers.slice(4)}`;
    } else if (finalNumbers.length <= 13) {
      return `+${finalNumbers.slice(0, 2)} (${finalNumbers.slice(2, 4)}) ${finalNumbers.slice(4, 9)}-${finalNumbers.slice(9, 13)}`;
    }
    
    // Máximo de 13 dígitos
    return `+${finalNumbers.slice(0, 2)} (${finalNumbers.slice(2, 4)}) ${finalNumbers.slice(4, 9)}-${finalNumbers.slice(9, 13)}`;
  };

  useEffect(() => {
    carregarProfissionais();
    getConvenios().then(setConvenios);
    getServicos().then(setServicos);
  }, []);

  const carregarProfissionais = async () => {
    setLoading(true);
    setApiError('');
    try {
      const data = await getProfissionais();
      setProfissionais(data);
    } catch (err) {
      setApiError('Erro ao carregar profissionais.');
    } finally {
      setLoading(false);
    }
  };

  // Filtros e paginação
  const normalizarTelefone = (tel: string) => tel.replace(/\D/g, '');
  const normalizarBusca = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  
  const profissionaisFiltrados = (busca.trim() === ''
    ? profissionais
    : profissionais.filter(p => {
        const buscaNormalizada = normalizarBusca(busca);
        const nome = normalizarBusca(p.nome);
        const email = normalizarBusca(p.email || '');
        const buscaNumeros = busca.replace(/\D/g, '');
        let match = false;
        if (buscaNormalizada.length > 0) {
          match = nome.includes(buscaNormalizada) || email.includes(buscaNormalizada);
        }
        if (buscaNumeros.length > 0) {
          const cpf = (p.cpf || '').replace(/\D/g, '');
          const whatsapp = normalizarTelefone(p.whatsapp || '');
          match = match || cpf.includes(buscaNumeros) || whatsapp.includes(buscaNumeros);
        }
        return match;
      })
  ).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

  const totalPaginas = Math.ceil(profissionaisFiltrados.length / itensPorPagina);
  const profissionaisPaginados = profissionaisFiltrados.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, itensPorPagina]);


  // Funções de exclusão
  const confirmarExclusao = (p: Profissional) => setExcluindo(p);
  const cancelarExclusao = () => setExcluindo(null);
  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      if (excluindo) {
        await deleteProfissional(excluindo.id);
        setExcluindo(null);
        carregarProfissionais();
      }
    } catch (err) {
      // Pode adicionar feedback de erro
    } finally {
      setDeleteLoading(false);
    }
  };


  return (
    <div className="pt-2 pl-6 pr-6 h-full flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white backdrop-blur border-b border-gray-200 flex justify-between items-center mb-6 px-6 py-4 rounded-lg gap-4 transition-shadow">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-4xl">👨‍⚕️</span>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Profissionais
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF, email ou WhatsApp..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full sm:w-64 md:w-80 lg:w-96 pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 hover:border-blue-300"
            />
          </div>
          <Button 
            onClick={() => setModalCriar(true)} 
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Profissional
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-y-auto rounded-lg bg-white shadow-sm border border-gray-100">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⏳</span>
            </div>
            <p className="text-gray-500 font-medium">Carregando profissionais...</p>
          </div>
        ) : apiError ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <p className="text-red-500 font-medium">{apiError}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
                <TableHead className="py-3 text-sm font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👤</span>
                    Nome
                  </div>
                </TableHead>
                <TableHead className="py-3 text-sm font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🆔</span>
                    CPF
                  </div>
                </TableHead>
                <TableHead className="py-3 text-sm font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📧</span>
                    Email
                  </div>
                </TableHead>
                <TableHead className="py-3 text-sm font-semibold text-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📱</span>
                    WhatsApp
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
              {profissionaisPaginados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-3xl">👥</span>
                      </div>
                      <p className="text-gray-500 font-medium">Nenhum profissional encontrado</p>
                      <p className="text-gray-400 text-sm">Tente ajustar os filtros de busca</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                profissionaisPaginados.map((p) => (
                  <TableRow key={p.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200 h-12">
                    <TableCell className="py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {p.nome.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-gray-800">{p.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">{p.cpf}</span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-sm text-blue-600 hover:text-blue-800 transition-colors">{p.email}</span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-sm font-mono bg-green-100 px-2 py-1 rounded text-green-700">{formatWhatsApp(p.whatsapp || '')}</span>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex gap-1.5 flex-wrap">
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                          onClick={() => setModalEditar({ open: true, profissional: p })}
                          title="Editar Dados Básicos"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-2 border-green-300 text-green-600 hover:bg-green-600 hover:text-white hover:border-green-600 focus:ring-4 focus:ring-green-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                          onClick={() => setModalEndereco({ open: true, profissional: p })}
                          title="Editar Endereço"
                        >
                          <MapPin className="w-4 h-4 text-green-600 group-hover:text-white transition-colors" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-2 border-purple-300 text-purple-600 hover:bg-purple-600 hover:text-white hover:border-purple-600 focus:ring-4 focus:ring-purple-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                          onClick={() => setModalInfoProfissional({ open: true, profissional: p })}
                          title="Editar Informações Profissionais"
                        >
                          <User className="w-4 h-4 text-purple-600 group-hover:text-white transition-colors" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-2 border-yellow-300 text-yellow-600 hover:bg-yellow-600 hover:text-white hover:border-yellow-600 focus:ring-4 focus:ring-yellow-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                          onClick={() => setModalDadosBancarios({ open: true, profissional: p })}
                          title="Editar Dados Bancários"
                        >
                          <CreditCard className="w-4 h-4 text-yellow-600 group-hover:text-white transition-colors" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-2 border-indigo-300 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 focus:ring-4 focus:ring-indigo-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                          onClick={() => setModalEmpresaContrato({ open: true, profissional: p })}
                          title="Editar Empresa/Contrato"
                        >
                          <Building className="w-4 h-4 text-indigo-600 group-hover:text-white transition-colors" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-2 border-blue-300 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 focus:ring-4 focus:ring-blue-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                          onClick={() => setModalAtribuir({ open: true, profissional: p })}
                          title="Atribuir Serviços"
                        >
                          <List className="w-4 h-4 text-blue-600 group-hover:text-white transition-colors" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-2 border-red-300 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 focus:ring-4 focus:ring-red-300 h-8 w-8 p-0 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform"
                          onClick={() => confirmarExclusao(p)}
                          title="Excluir Profissional"
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
        )}
      </div>

      {/* Paginação */}
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
          Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, profissionaisFiltrados.length)} de {profissionaisFiltrados.length} resultados
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

      {/* Modal de confirmação de exclusão */}
      <ConfirmDeleteModal
        open={excluindo !== null}
        onClose={cancelarExclusao}
        onConfirm={handleDelete}
        entityName={excluindo?.nome || ''}
        entityType="profissional"
        isLoading={deleteLoading}
        loadingText="Excluindo..."
        confirmText="Excluir Profissional"
      />

      {/* Modais de criação e edição */}
      <CriarProfissionalModal
        open={modalCriar}
        onClose={() => setModalCriar(false)}
        onSuccess={() => {
          carregarProfissionais();
          setModalCriar(false);
        }}
      />
      
      <EditarProfissionalModal
        open={modalEditar.open}
        onClose={() => setModalEditar({ open: false, profissional: null })}
        profissional={modalEditar.profissional}
        onSuccess={() => {
          carregarProfissionais();
          setModalEditar({ open: false, profissional: null });
        }}
      />
      {/* Modais de edição específicos */}
      <AtribuirServicosModal
        open={modalAtribuir.open}
        onClose={() => setModalAtribuir({ open: false, profissional: null })}
        profissional={modalAtribuir.profissional}
        convenios={convenios}
        servicos={servicos}
        onSalvar={async () => {
          await carregarProfissionais();
          setModalAtribuir({ open: false, profissional: null });
        }}
      />
      
      <EditarEnderecoModal
        open={modalEndereco.open}
        onClose={() => setModalEndereco({ open: false, profissional: null })}
        profissional={modalEndereco.profissional}
        onSalvar={async () => {
          await carregarProfissionais();
          setModalEndereco({ open: false, profissional: null });
        }}
      />
      
      <EditarInfoProfissionalModal
        open={modalInfoProfissional.open}
        onClose={() => setModalInfoProfissional({ open: false, profissional: null })}
        profissional={modalInfoProfissional.profissional}
        onSalvar={async () => {
          await carregarProfissionais();
          setModalInfoProfissional({ open: false, profissional: null });
        }}
      />
      
      <EditarDadosBancariosModal
        open={modalDadosBancarios.open}
        onClose={() => setModalDadosBancarios({ open: false, profissional: null })}
        profissional={modalDadosBancarios.profissional}
        onSalvar={async () => {
          await carregarProfissionais();
          setModalDadosBancarios({ open: false, profissional: null });
        }}
      />
      
      <EditarEmpresaContratoModal
        open={modalEmpresaContrato.open}
        onClose={() => setModalEmpresaContrato({ open: false, profissional: null })}
        profissional={modalEmpresaContrato.profissional}
        onSalvar={async () => {
          await carregarProfissionais();
          setModalEmpresaContrato({ open: false, profissional: null });
        }}
      />
    </div>
  );
}
