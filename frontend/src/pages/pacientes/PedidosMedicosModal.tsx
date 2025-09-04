import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
import ConfirmacaoModal from '@/components/ConfirmacaoModal';
import { AppToast } from '@/services/toast';
import { Plus, Edit, Trash2, FileText, Calendar } from 'lucide-react';
import type { Paciente } from '@/types/Paciente';
import type { PacientePedido } from '@/types/PacientePedido';
import type { Servico } from '@/types/Servico';
import { 
  createPacientePedido, 
  getPacientesPedidos, 
  updatePacientePedido, 
  deletePacientePedido,
  type CreatePacientePedidoData
} from '@/services/pacientes-pedidos';
import { useConfiguracoesConvenio } from '@/hooks/useConfiguracoesConvenio';

interface FormPedido {
  dataPedidoMedico: string;
  crm: string;
  cbo: string;
  cid: string;
  autoPedidos: boolean;
  descricao: string;
  servicoId: string;
}

interface PedidosMedicosModalProps {
  showModal: boolean;
  paciente: Paciente | null;
  servicos: Servico[];
  onClose: () => void;
}

export default function PedidosMedicosModal({
  showModal,
  paciente,
  servicos,
  onClose
}: PedidosMedicosModalProps) {
  const [pedidos, setPedidos] = useState<PacientePedido[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<PacientePedido | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pedidoParaExcluir, setPedidoParaExcluir] = useState<PacientePedido | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Hook para configurações do convênio do paciente
  const { camposObrigatorios, loading: loadingConfig, validarFormulario } = useConfiguracoesConvenio(paciente?.convenioId);
  const [form, setForm] = useState<FormPedido>({
    dataPedidoMedico: '',
    crm: '',
    cbo: '',
    cid: '',
    autoPedidos: true,
    descricao: '',
    servicoId: '',
  });

  // Carregar pedidos quando o modal abrir
  useEffect(() => {
    if (showModal && paciente) {
      fetchPedidos();
    }
  }, [showModal, paciente]);

  const fetchPedidos = async () => {
    if (!paciente) return;
    
    setLoading(true);
    try {
      const pedidosData = await getPacientesPedidos(paciente.id);
      console.log('Pedidos carregados:', pedidosData);
      setPedidos(pedidosData);
    } catch (error: any) {
      console.error('Erro ao carregar pedidos:', error);
      AppToast.error('Erro ao carregar pedidos médicos');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      dataPedidoMedico: '',
      crm: '',
      cbo: '',
      cid: '',
      autoPedidos: true,
      descricao: '',
      servicoId: '',
    });
    setEditando(null);
    setShowForm(false);
  };

  const abrirFormNovo = () => {
    resetForm();
    setShowForm(true);
  };

  const abrirFormEditar = (pedido: PacientePedido) => {
    setForm({
      dataPedidoMedico: pedido.dataPedidoMedico?.substring(0, 10) || '',
      crm: pedido.crm || '',
      cbo: pedido.cbo || '',
      cid: pedido.cid || '',
      autoPedidos: pedido.autoPedidos ?? true,
      descricao: pedido.descricao || '',
      servicoId: pedido.servicoId || '',
    });
    setEditando(pedido);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paciente) return;

    // Validar campos obrigatórios baseados no convênio
    const { isValid, errors } = validarFormulario(form);
    
    if (!isValid) {
      AppToast.error('Campos obrigatórios', {
        description: errors.join(' ')
      });
      return;
    }
    setFormLoading(true);
    try {
      const pedidoData: CreatePacientePedidoData = {
        dataPedidoMedico: form.dataPedidoMedico || null,
        crm: form.crm.trim() || null,
        cbo: form.cbo.trim() || null,
        cid: form.cid.trim() || null,
        autoPedidos: form.autoPedidos,
        descricao: form.descricao.trim() || null,
        servicoId: form.servicoId || null,
      };

      if (editando) {
        await updatePacientePedido(paciente.id, editando.id, pedidoData);
        AppToast.success('Pedido médico atualizado com sucesso!');
      } else {
        await createPacientePedido(paciente.id, pedidoData);
        AppToast.success('Pedido médico criado com sucesso!');
      }

      await fetchPedidos();
      resetForm();
    } catch (error: any) {
      console.error('Erro ao salvar pedido:', error);
      AppToast.error(editando ? 'Erro ao atualizar pedido médico' : 'Erro ao criar pedido médico');
    } finally {
      setFormLoading(false);
    }
  };

  const abrirModalExclusao = (pedido: PacientePedido) => {
    setPedidoParaExcluir(pedido);
    setShowDeleteModal(true);
  };

  const confirmarExclusao = async () => {
    if (!paciente || !pedidoParaExcluir) return;

    setDeleteLoading(true);
    try {
      await deletePacientePedido(paciente.id, pedidoParaExcluir.id);
      AppToast.success('Pedido médico excluído com sucesso!');
      await fetchPedidos();
      setShowDeleteModal(false);
      setPedidoParaExcluir(null);
    } catch (error: any) {
      console.error('Erro ao excluir pedido:', error);
      AppToast.error('Erro ao excluir pedido médico');
    } finally {
      setDeleteLoading(false);
    }
  };

  const cancelarExclusao = () => {
    setShowDeleteModal(false);
    setPedidoParaExcluir(null);
  };

  const handleFormChange = (updates: Partial<FormPedido>) => {
    setForm(f => ({ ...f, ...updates }));
  };

  const fecharModal = () => {
    resetForm();
    setPedidos([]);
    onClose();
  };

  if (!paciente) return null;

  return (
    <>
    <Dialog open={showModal} onOpenChange={fecharModal}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-teal-50 to-emerald-50 -mx-6 -mt-6 px-6 pt-6 pb-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <span className="text-2xl">📋</span>
              Pedidos Médicos - {paciente.nomeCompleto}
              {loadingConfig && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  Carregando regras...
                </span>
              )}
            </DialogTitle>
            {!showForm && (
              <Button 
                onClick={abrirFormNovo}
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 mr-6"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Pedido
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="mt-4">
          {!showForm ? (
            // Lista de pedidos
            <div>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
                  <p className="text-gray-500">Carregando pedidos...</p>
                </div>
              ) : pedidos.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">Nenhum pedido médico encontrado</p>
                  <p className="text-gray-400">Clique em "Novo Pedido" para adicionar o primeiro pedido</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-200 bg-gray-50">
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">Serviço</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">Data</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">CRM</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">CBO</th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-700">CID</th>
                        <th className="text-center py-3 px-3 font-semibold text-gray-700">Auto</th>
                        <th className="text-center py-3 px-3 font-semibold text-gray-700">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidos.map((pedido) => (
                        <tr key={pedido.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-3">
                            <div className="max-w-[150px]">
                              <span className="text-sm font-medium block truncate">
                                { pedido.servico?.nome || '-'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-sm">
                            {pedido.dataPedidoMedico ? new Date(pedido.dataPedidoMedico).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="py-3 px-3 text-sm">{pedido.crm || '-'}</td>
                          <td className="py-3 px-3 text-sm">{pedido.cbo || '-'}</td>
                          <td className="py-3 px-3 text-sm">{pedido.cid || '-'}</td>
                          <td className="py-3 px-3 text-center">
                            {pedido.autoPedidos ? (
                              <span className="inline-block text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                                Sim
                              </span>
                            ) : (
                              <span className="inline-block text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                                Não
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => abrirFormEditar(pedido)}
                                className="h-8 w-8 p-0 bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:from-teal-700 hover:to-emerald-700 focus:ring-4 focus:ring-teal-300 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform border-0"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => abrirModalExclusao(pedido)}
                                className="h-8 w-8 p-0 group border-2 border-red-300 text-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 focus:ring-4 focus:ring-red-300 shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200 transform mr-3"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            // Formulário
            <div>
              {/* Informação sobre campos obrigatórios */}
              {paciente?.convenioId && Object.values(camposObrigatorios).some(Boolean) && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <span className="font-semibold">ℹ️ Campos obrigatórios:</span> 
                    {' '}Os campos marcados com <span className="text-red-500 font-bold">*</span> são obrigatórios para o convênio deste paciente.
                  </p>
                </div>
              )}
              
              <form id="pedido-form" onSubmit={handleSubmit} className="space-y-4">
                {/* Linha 1: Serviço | Data Pedido Médico | CRM */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                      <span className="text-base">🏥</span>
                      Serviço
                      {camposObrigatorios.servico_obrigatorio && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <SingleSelectDropdown
                      options={servicos.filter(s => s.ativo).map(servico => ({
                        id: servico.id,
                        nome: servico.nome,
                        sigla: undefined
                      }))}
                      selected={form.servicoId ? {
                        id: form.servicoId,
                        nome: servicos.find(s => s.id === form.servicoId)?.nome || '',
                        sigla: undefined
                      } : null}
                      onChange={(selected) => {
                        handleFormChange({ servicoId: selected?.id || '' });
                      }}
                      placeholder="Selecione um serviço..."
                      headerText="Serviços disponíveis"
                      formatOption={(option) => option.nome}
                      disabled={formLoading}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                      <span className="text-base">📅</span>
                      Data Pedido Médico
                      {camposObrigatorios.data_pedido_obrigatorio && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      type="date"
                      value={form.dataPedidoMedico}
                      onChange={e => handleFormChange({ dataPedidoMedico: e.target.value })}
                      className="w-full h-[42px] border-2 border-gray-200 rounded-xl px-4 py-2 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300"
                      disabled={formLoading}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                      <span className="text-base">👨‍⚕️</span>
                      CRM
                      {camposObrigatorios.crm_obrigatorio && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      type="text"
                      value={form.crm}
                      onChange={e => handleFormChange({ crm: e.target.value })}
                      className="w-full h-[42px] border-2 border-gray-200 rounded-xl px-4 py-2 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300"
                      disabled={formLoading}
                    />
                  </div>
                </div>

                {/* Linha 2: CBO | CID | Auto Pedidos */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                      <span className="text-base">🩺</span>
                      CBO
                      {camposObrigatorios.cbo_obrigatorio && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      type="text"
                      value={form.cbo}
                      onChange={e => handleFormChange({ cbo: e.target.value })}
                      className="w-full h-[42px] border-2 border-gray-200 rounded-xl px-4 py-2 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300"
                      disabled={formLoading}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                      <span className="text-base">📋</span>
                      CID
                      {camposObrigatorios.cid_obrigatorio && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      type="text"
                      value={form.cid}
                      onChange={e => handleFormChange({ cid: e.target.value })}
                      className="w-full h-[42px] border-2 border-gray-200 rounded-xl px-4 py-2 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300"
                      disabled={formLoading}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                      <span className="text-base">🔄</span>
                      Auto Pedidos
                    </label>
                    <div className="flex items-center h-[42px] px-3 bg-blue-50 rounded-xl border-2 border-blue-200">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm text-gray-700">
                          WhatsApp automático
                        </span>
                        <Switch
                          checked={form.autoPedidos}
                          onCheckedChange={(checked) => handleFormChange({ autoPedidos: checked })}
                          disabled={formLoading}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Linha 3: Descrição */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
                    <span className="text-base">📝</span>
                    Descrição
                  </label>
                  <Textarea
                    value={form.descricao}
                    onChange={(e) => handleFormChange({ descricao: e.target.value })}
                    placeholder="Digite observações adicionais sobre o pedido médico..."
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300 min-h-[80px] resize-vertical"
                    disabled={formLoading}
                  />
                </div>

              </form>
            </div>
          )}
        </div>

        {showForm && (
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
              disabled={formLoading}
              className="border-2 border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 font-semibold px-6 transition-all duration-200"
            >
              <span className="mr-2">⬅️</span>
              Voltar
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={fecharModal}
              disabled={formLoading}
              className="border-2 border-gray-300 text-gray-700 hover:border-red-400 hover:bg-red-50 hover:text-red-700 font-semibold px-6 transition-all duration-200"
            >
              <span className="mr-2">🔴</span>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="pedido-form"
              disabled={formLoading}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg hover:shadow-xl font-semibold px-8 transition-all duration-200"
            >
              {formLoading ? (
                <>
                  <span className="mr-2">⏳</span>
                  Salvando...
                </>
              ) : (
                <>
                  <span className="mr-2">🟢</span>
                  {editando ? 'Atualizar' : 'Salvar'}
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>

    {/* Modal de Confirmação de Exclusão */}
    <ConfirmacaoModal
      open={showDeleteModal}
      onClose={cancelarExclusao}
      onConfirm={confirmarExclusao}
      onCancel={cancelarExclusao}
      title="Excluir Pedido Médico"
      description={
        <div className="space-y-3">
          <p>Você tem certeza que deseja excluir este pedido médico?</p>
          {pedidoParaExcluir && (
            <div className="bg-gray-50 p-3 rounded-lg border">
              <p className="font-medium text-gray-900">
                {pedidoParaExcluir.servico?.nome || 'Serviço não informado'}
              </p>
              {pedidoParaExcluir.dataPedidoMedico && (
                <p className="text-sm text-gray-600">
                  Data: {new Date(pedidoParaExcluir.dataPedidoMedico).toLocaleDateString('pt-BR')}
                </p>
              )}
              {pedidoParaExcluir.crm && (
                <p className="text-sm text-gray-600">CRM: {pedidoParaExcluir.crm}</p>
              )}
            </div>
          )}
          <p className="text-sm text-red-600 font-medium">
            ⚠️ Esta ação não pode ser desfeita.
          </p>
        </div>
      }
      confirmText="Sim, Excluir"
      cancelText="Cancelar"
      variant="danger"
      isLoading={deleteLoading}
      loadingText="Excluindo..."
      icon={<Trash2 className="w-6 h-6" />}
    />
    </>
  );
}