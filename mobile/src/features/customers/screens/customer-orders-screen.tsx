import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonBlock } from '@/components/feedback/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { showConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/features/auth/context/auth-context';
import { hasRoutePermission } from '@/features/auth/permissions';
import {
  createPatientPedido,
  deletePatientPedido,
  getPatientPedidos,
  getServicosOptions,
  updatePatientPedido,
} from '@/features/customers/services/patients-api';
import type { CreatePacientePedidoPayload, PacientePedido } from '@/features/customers/types';
import { useToast } from '@/providers/toast-provider';

type ServicoOption = {
  id: string;
  nome: string;
};

type PedidoForm = {
  servicoId: string;
  dataPedidoMedico: string;
  crm: string;
  cbo: string;
  cid: string;
  autoPedidos: 'SIM' | 'NAO';
  descricao: string;
};

const EMPTY_FORM: PedidoForm = {
  servicoId: '',
  dataPedidoMedico: '',
  crm: '',
  cbo: '',
  cid: '',
  autoPedidos: 'SIM',
  descricao: '',
};

function getErrorMessage(error: unknown, fallback = 'Não foi possível concluir a operação.') {
  if (typeof error === 'object' && error && 'response' in error) {
    const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (message) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function formatDateBr(value?: string | null) {
  if (!value) return 'Não informada';
  const onlyDate = value.substring(0, 10);
  const [yyyy, mm, dd] = onlyDate.split('-');
  if (!yyyy || !mm || !dd) return value;
  return `${dd}/${mm}/${yyyy}`;
}

export function CustomerOrdersScreen() {
  const { id, nome } = useLocalSearchParams<{ id: string; nome?: string }>();
  const { permissions } = useAuth();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<PacientePedido[]>([]);
  const [servicos, setServicos] = useState<ServicoOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [form, setForm] = useState<PedidoForm>(EMPTY_FORM);
  const [formVisible, setFormVisible] = useState(false);

  const canRead = useMemo(
    () => hasRoutePermission(permissions, { path: '/pacientes/:pacienteId/pedidos', method: 'GET' }),
    [permissions],
  );
  const canCreate = useMemo(
    () => hasRoutePermission(permissions, { path: '/pacientes/:pacienteId/pedidos', method: 'POST' }),
    [permissions],
  );
  const canUpdate = useMemo(
    () => hasRoutePermission(permissions, { path: '/pacientes/:pacienteId/pedidos/:id', method: 'PUT' }),
    [permissions],
  );
  const canDelete = useMemo(
    () => hasRoutePermission(permissions, { path: '/pacientes/:pacienteId/pedidos/:id', method: 'DELETE' }),
    [permissions],
  );

  const loadData = useCallback(async () => {
    if (!id) {
      setError('Paciente inválido.');
      setLoading(false);
      return;
    }

    if (!canRead) {
      setError('Você não tem permissão para visualizar pedidos médicos.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [ordersData, servicosData] = await Promise.all([getPatientPedidos(id), getServicosOptions()]);
      setOrders(ordersData);
      setServicos(servicosData.map((item) => ({ id: item.id, nome: item.nome })));
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível carregar os pedidos médicos.'));
    } finally {
      setLoading(false);
    }
  }, [canRead, id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingOrderId(null);
    setFormVisible(false);
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditingOrderId(null);
    setForm(EMPTY_FORM);
    setFormVisible(true);
  }, []);

  const handleEdit = useCallback((order: PacientePedido) => {
    setEditingOrderId(order.id);
    setForm({
      servicoId: order.servicoId || order.servico?.id || '',
      dataPedidoMedico: order.dataPedidoMedico?.substring(0, 10) || '',
      crm: order.crm || '',
      cbo: order.cbo || '',
      cid: order.cid || '',
      autoPedidos: order.autoPedidos === false ? 'NAO' : 'SIM',
      descricao: order.descricao || '',
    });
    setFormVisible(true);
  }, []);

  const validateForm = useCallback(() => {
    if (!form.servicoId) return 'Selecione um serviço.';
    return null;
  }, [form.servicoId]);

  const handleSubmit = useCallback(async () => {
    if (!id) return;

    const validation = validateForm();
    if (validation) {
      showToast({ message: validation });
      return;
    }

    const payload: CreatePacientePedidoPayload = {
      servicoId: form.servicoId || null,
      dataPedidoMedico: form.dataPedidoMedico || null,
      crm: form.crm.trim() || null,
      cbo: form.cbo.trim() || null,
      cid: form.cid.trim() || null,
      autoPedidos: form.autoPedidos === 'SIM',
      descricao: form.descricao.trim() || null,
    };

    if (editingOrderId && !canUpdate) {
      showToast({ message: 'Você não tem permissão para editar pedidos médicos.' });
      return;
    }

    if (!editingOrderId && !canCreate) {
      showToast({ message: 'Você não tem permissão para criar pedidos médicos.' });
      return;
    }

    setSaving(true);
    try {
      if (editingOrderId) {
        await updatePatientPedido(id, editingOrderId, payload);
        showToast({ message: 'Pedido médico atualizado com sucesso.' });
      } else {
        await createPatientPedido(id, payload);
        showToast({ message: 'Pedido médico criado com sucesso.' });
      }
      await loadData();
      resetForm();
    } catch (err) {
      showToast({ message: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  }, [canCreate, canUpdate, editingOrderId, form, id, loadData, resetForm, showToast, validateForm]);

  const handleDelete = useCallback(
    async (order: PacientePedido) => {
      if (!id || !canDelete) {
        showToast({ message: 'Você não tem permissão para excluir pedidos médicos.' });
        return;
      }

      const confirmed = await showConfirmDialog({
        title: 'Excluir pedido médico',
        message: 'Deseja realmente excluir este pedido médico?',
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
        destructive: true,
      });

      if (!confirmed) return;

      setSaving(true);
      try {
        await deletePatientPedido(id, order.id);
        showToast({ message: 'Pedido médico excluído com sucesso.' });
        await loadData();
      } catch (err) {
        showToast({ message: getErrorMessage(err) });
      } finally {
        setSaving(false);
      }
    },
    [canDelete, id, loadData, showToast],
  );

  return (
    <AppScreen>
      <PageHeader
        title="Pedidos médicos"
        subtitle={nome ? `Paciente: ${nome}` : 'Gerencie os pedidos médicos do paciente'}
        rightSlot={
          canCreate ? <Button label="Novo pedido" size="sm" variant="primary" onPress={handleOpenCreate} /> : undefined
        }
      />

      {loading ? (
        <SkeletonBlock lines={8} />
      ) : error ? (
        <ErrorState description={error} onRetry={() => void loadData()} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 28 }}>
          {orders.length === 0 ? (
            <EmptyState
              title="Nenhum pedido médico cadastrado"
              description="Adicione um novo pedido para este paciente."
              ctaLabel={canCreate ? 'Novo pedido' : undefined}
              onPressCta={canCreate ? handleOpenCreate : undefined}
            />
          ) : (
            <View className="gap-2">
              {orders.map((order) => (
                <View key={order.id} className="rounded-2xl border border-surface-border bg-surface-card p-4">
                  <AppText className="text-base font-semibold text-content-primary">{order.servico?.nome || 'Serviço não informado'}</AppText>
                  <AppText className="mt-1 text-sm text-content-secondary">Data: {formatDateBr(order.dataPedidoMedico)}</AppText>
                  <AppText className="mt-1 text-sm text-content-secondary">CRM: {order.crm || 'Não informado'}</AppText>
                  <AppText className="mt-1 text-sm text-content-secondary">CBO: {order.cbo || 'Não informado'}</AppText>
                  <AppText className="mt-1 text-sm text-content-secondary">CID: {order.cid || 'Não informado'}</AppText>
                  <AppText className="mt-1 text-sm text-content-secondary">Auto pedidos: {order.autoPedidos === false ? 'Não' : 'Sim'}</AppText>
                  <AppText className="mt-1 text-sm text-content-secondary">Descrição: {order.descricao || 'Não informada'}</AppText>

                  <View className="mt-4 flex-row gap-3">
                    <Button
                      label="Editar"
                      variant={canUpdate ? 'primary' : 'secondary'}
                      className="flex-1"
                      disabled={!canUpdate || saving}
                      onPress={() => handleEdit(order)}
                    />
                    <Pressable
                      onPress={() => void handleDelete(order)}
                      disabled={!canDelete || saving}
                      className={`flex-1 items-center rounded-xl border px-4 py-3 ${
                        canDelete ? 'border-red-200 bg-red-50' : 'border-surface-border bg-surface-background'
                      }`}
                    >
                      <AppText className={`text-sm font-semibold ${canDelete ? 'text-red-700' : 'text-content-muted'}`}>Excluir</AppText>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <BottomSheet
        visible={formVisible}
        onClose={() => {
          if (saving) return;
          resetForm();
        }}
        title={editingOrderId ? 'Editar pedido médico' : 'Novo pedido médico'}
        footer={
          <View className="flex-row gap-2">
            <Button label="Cancelar" variant="secondary" className="flex-1" onPress={resetForm} disabled={saving} />
            <Button label={editingOrderId ? 'Atualizar' : 'Salvar'} className="flex-1" onPress={() => void handleSubmit()} loading={saving} />
          </View>
        }
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 8 }}>
          <Select
            label="Serviço *"
            value={form.servicoId}
            options={servicos.map((item) => ({ label: item.nome, value: item.id }))}
            onChange={(value) => setForm((prev) => ({ ...prev, servicoId: value }))}
            placeholder="Selecione o serviço"
          />
          <Input
            label="Data do pedido médico"
            value={form.dataPedidoMedico}
            onChangeText={(value) => setForm((prev) => ({ ...prev, dataPedidoMedico: value }))}
            placeholder="AAAA-MM-DD"
          />
          <Input label="CRM" value={form.crm} onChangeText={(value) => setForm((prev) => ({ ...prev, crm: value }))} />
          <Input label="CBO" value={form.cbo} onChangeText={(value) => setForm((prev) => ({ ...prev, cbo: value }))} />
          <Input label="CID" value={form.cid} onChangeText={(value) => setForm((prev) => ({ ...prev, cid: value }))} />
          <Select
            label="Auto pedidos"
            value={form.autoPedidos}
            options={[
              { label: 'Sim', value: 'SIM' },
              { label: 'Não', value: 'NAO' },
            ]}
            onChange={(value) => setForm((prev) => ({ ...prev, autoPedidos: value as 'SIM' | 'NAO' }))}
          />
          <Input
            label="Descrição"
            value={form.descricao}
            onChangeText={(value) => setForm((prev) => ({ ...prev, descricao: value }))}
            placeholder="Observações do pedido"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </ScrollView>
      </BottomSheet>
    </AppScreen>
  );
}
