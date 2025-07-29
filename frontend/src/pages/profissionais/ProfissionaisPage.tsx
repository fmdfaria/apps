import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search, Trash2, MapPin, User, CreditCard, Building, List } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { FormErrorMessage } from '@/components/form-error-message';
import { getProfissionais, createProfissional, deleteProfissional, updateProfissionalServicos } from '@/services/profissionais';
import type { Profissional } from '@/types/Profissional';
import type { Servico } from '@/types/Servico';
import type { Convenio } from '@/types/Convenio';
import { useInputMask } from '@/hooks/useInputMask';
import { getConvenios } from '@/services/convenios';
import { getServicos } from '@/services/servicos';
import AtribuirServicosModal from './AtribuirServicosModal';
import EditarEnderecoModal from './EditarEnderecoModal';
import EditarInfoProfissionalModal from './EditarInfoProfissionalModal';
import EditarDadosBancariosModal from './EditarDadosBancariosModal';
import EditarEmpresaContratoModal from './EditarEmpresaContratoModal';

export default function ProfissionaisPage() {
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [busca, setBusca] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    email: '',
    whatsapp: '',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [excluindo, setExcluindo] = useState<Profissional | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [itensPorPagina, setItensPorPagina] = useState(10);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);

  // Modais específicos
  const [modalAtribuir, setModalAtribuir] = useState<{ open: boolean, profissional: Profissional | null }>({ open: false, profissional: null });
  const [modalEndereco, setModalEndereco] = useState<{ open: boolean, profissional: Profissional | null }>({ open: false, profissional: null });
  const [modalInfoProfissional, setModalInfoProfissional] = useState<{ open: boolean, profissional: Profissional | null }>({ open: false, profissional: null });
  const [modalDadosBancarios, setModalDadosBancarios] = useState<{ open: boolean, profissional: Profissional | null }>({ open: false, profissional: null });
  const [modalEmpresaContrato, setModalEmpresaContrato] = useState<{ open: boolean, profissional: Profissional | null }>({ open: false, profissional: null });

  const maskTelefone = useInputMask('(99) 99 99999-9999');
  const maskCPF = useInputMask('999.999.999-99');

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
  
  const profissionaisFiltrados = busca.trim() === ''
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
      });

  const totalPaginas = Math.ceil(profissionaisFiltrados.length / itensPorPagina);
  const profissionaisPaginados = profissionaisFiltrados.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, itensPorPagina]);

  // Funções do modal de criação
  const abrirModalNovo = () => {
    setForm({
      nome: '',
      cpf: '',
      email: '',
      whatsapp: '',
    });
    setFormError('');
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setForm({
      nome: '',
      cpf: '',
      email: '',
      whatsapp: '',
    });
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim() || form.nome.trim().length < 2) {
      setFormError('O nome deve ter pelo menos 2 caracteres.');
      return;
    }
    const cpfLimpo = form.cpf.replace(/\D/g, '');
    if (!cpfLimpo || cpfLimpo.length !== 11) {
      setFormError('CPF inválido. Exemplo: xxx.xxx.xxx-xx.');
      return;
    }
    if (!form.email.trim() || !form.email.includes('@')) {
      setFormError('E-mail inválido. Exemplo: nome@email.com');
      return;
    }
    const telefoneValido = /^\(\d{2}\) \d{2} \d{5}-\d{4}$/.test(form.whatsapp.trim());
    if (form.whatsapp && !telefoneValido) {
      setFormError('Telefone inválido. Exemplo: (55) 12 98144-0779');
      return;
    }
    
    setFormLoading(true);
    setFormError('');
    
    try {
      const profissionalPayload = {
        nome: form.nome.trim(),
        cpf: form.cpf,
        email: form.email.trim(),
        whatsapp: form.whatsapp ? form.whatsapp.replace(/\D/g, '') : null,
      };
      await createProfissional(profissionalPayload);
      await carregarProfissionais();
      fecharModal();
    } catch (err: any) {
      let msg = 'Erro ao salvar profissional.';
      if (err?.response?.data) {
        if (typeof err.response.data === 'string') {
          msg = err.response.data;
        } else if (err.response.data.message) {
          msg = err.response.data.message;
        } else if (err.response.data.error) {
          msg = err.response.data.error;
        } else if (Array.isArray(err.response.data.errors)) {
          msg = err.response.data.errors.map((e: any) => e.message || e).join(' \n ');
        }
      } else if (err?.message) {
        msg = err.message;
      }
      setFormError(msg);
    } finally {
      setFormLoading(false);
    }
  };

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
          <Button onClick={abrirModalNovo} className="bg-blue-600 hover:bg-blue-700 ml-2">
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
                      <span className="text-sm">{maskTelefone(p.whatsapp || '')}</span>
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex gap-1 flex-wrap">
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

      {/* Modal de criação */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <DialogHeader>
              <DialogTitle>Novo Profissional - Dados Básicos</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo <span className="text-red-500">*</span></label>
                <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" minLength={2} disabled={formLoading} autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPF <span className="text-red-500">*</span></label>
                <input type="text" value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: maskCPF(e.target.value) }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" minLength={14} disabled={formLoading} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail <span className="text-red-500">*</span></label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={formLoading} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                <input type="text" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: maskTelefone(e.target.value) }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={formLoading} />
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>📝 Informação:</strong> Após criar o profissional, você poderá editar para adicionar informações complementares como endereço, especialidades, dados bancários e anexos.
                </p>
              </div>
            </div>
            <DialogFooter className="flex items-center justify-between">
              <div className="flex-1">
                {formError && <FormErrorMessage>{formError}</FormErrorMessage>}
              </div>
              <div className="flex gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="cancel" disabled={formLoading}>Cancelar</Button>
                </DialogClose>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={formLoading}>
                  {formLoading ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
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
            Tem certeza que deseja excluir o profissional <b>{excluindo?.nome}</b>?
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading} onClick={cancelarExclusao} className="hover:bg-red-50 hover:text-red-600">Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={deleteLoading} onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {deleteLoading ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modais de edição específicos */}
      <AtribuirServicosModal
        open={modalAtribuir.open}
        onClose={() => setModalAtribuir({ open: false, profissional: null })}
        profissional={modalAtribuir.profissional}
        convenios={convenios}
        servicos={servicos.map(s => {
          // Normalizar conveniosIds - suporta diferentes formatos do backend
          let conveniosIds: string[] = [];
          
          if (Array.isArray(s.conveniosIds)) {
            // Formato direto: conveniosIds: ["id1", "id2"]
            conveniosIds = s.conveniosIds;
          } else if (Array.isArray(s.convenios)) {
            // Formato com objetos: convenios: [{id: "id1"}, {id: "id2"}]
            conveniosIds = s.convenios.map((c: any) => typeof c === 'string' ? c : c.id).filter(Boolean);
          } else if (s.convenios && typeof s.convenios === 'object') {
            // Formato single object
            conveniosIds = [typeof s.convenios === 'string' ? s.convenios : (s.convenios as any).id].filter(Boolean);
          }
          
          return {
          id: s.id,
          nome: s.nome,
          duracao: s.duracaoMinutos || 0,
            conveniosIds: conveniosIds,
          };
        })}
        servicosAtribuidos={modalAtribuir.profissional && Array.isArray(modalAtribuir.profissional.servicos)
          ? modalAtribuir.profissional.servicos.map((s: any) => s.id)
          : []}
        onSalvar={async (servicosIds: string[]) => {
          if (modalAtribuir.profissional) {
            await updateProfissionalServicos(modalAtribuir.profissional.id, servicosIds);
          await carregarProfissionais();
          }
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