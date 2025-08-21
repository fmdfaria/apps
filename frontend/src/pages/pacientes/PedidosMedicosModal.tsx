import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { SingleSelectDropdown } from '@/components/ui/single-select-dropdown';
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

  const handleDelete = async (pedido: PacientePedido) => {
    if (!paciente) return;
    
    if (!confirm(`Deseja excluir este pedido médico?`)) return;

    try {
      await deletePacientePedido(paciente.id, pedido.id);
      AppToast.success('Pedido médico excluído com sucesso!');
      await fetchPedidos();
    } catch (error: any) {
      console.error('Erro ao excluir pedido:', error);
      AppToast.error('Erro ao excluir pedido médico');
    }
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
    <Dialog open={showModal} onOpenChange={fecharModal}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-teal-50 to-emerald-50 -mx-6 -mt-6 px-6 pt-6 pb-4 border-b border-gray-200">
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-2xl">📋</span>
            Pedidos Médicos - {paciente.nomeCompleto}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {!showForm ? (
            // Lista de pedidos
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Pedidos Médicos</h3>
                <Button 
                  onClick={abrirFormNovo}
                  className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Pedido
                </Button>
              </div>

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
                <div className="space-y-4">
                  {pedidos.map((pedido) => (
                    <div key={pedido.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pedido.dataPedidoMedico && (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span className="text-sm">
                                  <strong>Data:</strong> {new Date(pedido.dataPedidoMedico).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            )}
                            {pedido.servico && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm">
                                  <strong>Serviço:</strong> {pedido.servico.nome}
                                </span>
                              </div>
                            )}
                            {pedido.crm && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm">
                                  <strong>CRM:</strong> {pedido.crm}
                                </span>
                              </div>
                            )}
                            {pedido.cbo && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm">
                                  <strong>CBO:</strong> {pedido.cbo}
                                </span>
                              </div>
                            )}
                            {pedido.cid && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm">
                                  <strong>CID:</strong> {pedido.cid}
                                </span>
                              </div>
                            )}
                          </div>
                          {pedido.descricao && (
                            <div className="mt-2">
                              <p className="text-sm text-gray-600">
                                <strong>Descrição:</strong> {pedido.descricao}
                              </p>
                            </div>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs">Auto Pedidos:</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${pedido.autoPedidos ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {pedido.autoPedidos ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => abrirFormEditar(pedido)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(pedido)}
                            className="text-red-600 hover:text-red-700 hover:border-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Formulário
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  {editando ? 'Editar' : 'Novo'} Pedido Médico
                </h3>
                <Button 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                >
                  Voltar
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Linha 1: Serviço + Data Pedido Médico */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="text-lg">🏥</span>
                      Serviço
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="text-lg">📅</span>
                      Data Pedido Médico
                    </label>
                    <input
                      type="date"
                      value={form.dataPedidoMedico}
                      onChange={e => handleFormChange({ dataPedidoMedico: e.target.value })}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300"
                      disabled={formLoading}
                    />
                  </div>
                </div>

                {/* Linha 2: CRM + CBO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="text-lg">👨‍⚕️</span>
                      CRM
                    </label>
                    <input
                      type="text"
                      value={form.crm}
                      onChange={e => handleFormChange({ crm: e.target.value })}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300"
                      disabled={formLoading}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="text-lg">🩺</span>
                      CBO
                    </label>
                    <input
                      type="text"
                      value={form.cbo}
                      onChange={e => handleFormChange({ cbo: e.target.value })}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300"
                      disabled={formLoading}
                    />
                  </div>
                </div>

                {/* Linha 3: CID */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <span className="text-lg">📋</span>
                      CID
                    </label>
                    <input
                      type="text"
                      value={form.cid}
                      onChange={e => handleFormChange({ cid: e.target.value })}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300"
                      disabled={formLoading}
                    />
                  </div>
                </div>

                {/* Linha 4: Auto Pedidos */}
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🔄</span>
                    <div>
                      <label className="text-sm font-semibold text-gray-700">
                        Auto Pedidos
                      </label>
                      <p className="text-xs text-gray-500">
                        Envia WhatsApp automaticamente quando a data do pedido estiver próxima do vencimento.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={form.autoPedidos}
                    onCheckedChange={(checked) => handleFormChange({ autoPedidos: checked })}
                    disabled={formLoading}
                  />
                </div>

                {/* Linha 5: Descrição */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <span className="text-lg">📝</span>
                    Descrição
                  </label>
                  <Textarea
                    value={form.descricao}
                    onChange={(e) => handleFormChange({ descricao: e.target.value })}
                    placeholder="Digite observações adicionais sobre o pedido médico..."
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all duration-200 hover:border-teal-300 min-h-[100px] resize-vertical"
                    disabled={formLoading}
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    disabled={formLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={formLoading}
                    className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700"
                  >
                    {formLoading ? 'Salvando...' : editando ? 'Atualizar' : 'Salvar'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6">
          <DialogClose asChild>
            <Button variant="outline" onClick={fecharModal}>
              Fechar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}