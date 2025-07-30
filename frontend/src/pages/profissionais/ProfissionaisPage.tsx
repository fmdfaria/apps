import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search, Trash2, MapPin, User, CreditCard, Building, List, Edit } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
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
          <h1 className="text-3xl font-bold text-gray-900">Profissionais</h1>
          <p className="text-gray-600">Gerenciar profissionais cadastrados</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF, email ou WhatsApp..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full sm:w-64 md:w-80 lg:w-96 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <Button onClick={() => setModalCriar(true)} className="bg-blue-600 hover:bg-blue-700 ml-2">
            <Plus className="w-4 h-4 mr-2" />
            Novo Profissional
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-y-auto rounded-lg bg-white">
        {loading ? (
          <div className="py-12 text-center text-gray-400">Carregando...</div>
        ) : apiError ? (
          <div className="py-12 text-center text-red-500">{apiError}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted">
                <TableHead className="py-2 text-sm">Nome</TableHead>
                <TableHead className="py-2 text-sm">CPF</TableHead>
                <TableHead className="py-2 text-sm">Email</TableHead>
                <TableHead className="py-2 text-sm">WhatsApp</TableHead>
                <TableHead className="py-2 text-sm">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profissionaisPaginados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-gray-500 text-sm">Nenhum profissional encontrado.</TableCell>
                </TableRow>
              ) : (
                profissionaisPaginados.map((p) => (
                  <TableRow key={p.id} className="hover:bg-gray-50 h-12">
                    <TableCell className="py-2">
                      <span className="text-sm font-medium">{p.nome}</span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-sm">{p.cpf}</span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-sm">{p.email}</span>
                    </TableCell>
                    <TableCell className="py-2">
                      <span className="text-sm">{formatWhatsApp(p.whatsapp || '')}</span>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex gap-1 flex-wrap">
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 h-7 w-7 p-0"
                          onClick={() => setModalEditar({ open: true, profissional: p })}
                          title="Editar Dados Básicos"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-green-200 text-green-600 hover:bg-green-600 hover:text-white focus:ring-2 focus:ring-green-400 h-7 w-7 p-0"
                          onClick={() => setModalEndereco({ open: true, profissional: p })}
                          title="Editar Endereço"
                        >
                          <MapPin className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-purple-200 text-purple-600 hover:bg-purple-600 hover:text-white focus:ring-2 focus:ring-purple-400 h-7 w-7 p-0"
                          onClick={() => setModalInfoProfissional({ open: true, profissional: p })}
                          title="Editar Informações Profissionais"
                        >
                          <User className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-yellow-200 text-yellow-600 hover:bg-yellow-600 hover:text-white focus:ring-2 focus:ring-yellow-400 h-7 w-7 p-0"
                          onClick={() => setModalDadosBancarios({ open: true, profissional: p })}
                          title="Editar Dados Bancários"
                        >
                          <CreditCard className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white focus:ring-2 focus:ring-indigo-400 h-7 w-7 p-0"
                          onClick={() => setModalEmpresaContrato({ open: true, profissional: p })}
                          title="Editar Empresa/Contrato"
                        >
                          <Building className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white focus:ring-2 focus:ring-blue-400 h-7 w-7 p-0"
                          onClick={() => setModalAtribuir({ open: true, profissional: p })}
                          title="Atribuir Serviços"
                        >
                          <List className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="group border-red-200 text-red-600 hover:bg-red-600 hover:text-white focus:ring-2 focus:ring-red-400 h-7 w-7 p-0"
                          onClick={() => confirmarExclusao(p)}
                          title="Excluir Profissional"
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
        )}
      </div>

      {/* Paginação */}
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
          Mostrando {((paginaAtual - 1) * itensPorPagina) + 1} a {Math.min(paginaAtual * itensPorPagina, profissionaisFiltrados.length)} de {profissionaisFiltrados.length} resultados
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

      {/* Modal de confirmação de exclusão */}
      <AlertDialog open={excluindo !== null} onOpenChange={() => !deleteLoading && cancelarExclusao()}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <AlertDialogTitle className="text-xl font-bold text-gray-900">
              <span className="bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
                Confirmar Exclusão
              </span>
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="text-center py-4">
            <p className="text-gray-700 mb-3">
              Tem certeza que deseja excluir o profissional
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <span className="font-bold text-red-800 text-lg">{excluindo?.nome}</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
              <span className="text-lg">🚨</span>
              <span className="font-medium">Esta ação não pode ser desfeita</span>
            </div>
          </div>
          <AlertDialogFooter className="flex gap-3 pt-6">
            <AlertDialogCancel 
              disabled={deleteLoading} 
              onClick={cancelarExclusao} 
              className="flex-1 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 hover:text-gray-700 font-semibold transition-all duration-200"
            >
              <span className="mr-2">↩️</span>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              disabled={deleteLoading} 
              onClick={handleDelete}
              className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            >
              <span className="mr-2">{deleteLoading ? '⏳' : '🗑️'}</span>
              {deleteLoading ? 'Excluindo...' : 'Excluir Profissional'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
