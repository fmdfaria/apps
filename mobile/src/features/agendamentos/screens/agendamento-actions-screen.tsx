import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { showConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/features/auth/context/auth-context';
import { hasRoutePermission } from '@/features/auth/permissions';
import {
  alterarStatusAgendamento,
  deleteAgendamento,
  getAgendamentoSeriesInfo,
  setStatusAgendamento,
  updateCodLiberacao,
} from '@/features/agendamentos/services/agendamentos-api';
import type { StatusAgendamento } from '@/features/agendamentos/types';
import { routes } from '@/navigation/routes';
import { useToast } from '@/providers/toast-provider';

const STATUS_OPTIONS: Array<{ label: string; value: StatusAgendamento }> = [
  { label: 'Agendado', value: 'AGENDADO' },
  { label: 'Solicitado', value: 'SOLICITADO' },
  { label: 'Liberado', value: 'LIBERADO' },
  { label: 'Atendido', value: 'ATENDIDO' },
  { label: 'Finalizado', value: 'FINALIZADO' },
  { label: 'Cancelado', value: 'CANCELADO' },
  { label: 'Arquivado', value: 'ARQUIVADO' },
  { label: 'Pendente', value: 'PENDENTE' },
];

function parseApiError(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (message) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function parseBooleanParam(value?: string) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return false;
}

function formatDateTime(inicio?: string, fim?: string) {
  if (!inicio) return 'Data não informada';
  const date = new Date(inicio);
  if (Number.isNaN(date.getTime())) return inicio;
  const data = date.toLocaleDateString('pt-BR');
  const horaInicio = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (!fim) return `${data} às ${horaInicio}`;
  const end = new Date(fim);
  const horaFim = Number.isNaN(end.getTime())
    ? fim
    : end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${data} • ${horaInicio} - ${horaFim}`;
}

function getStatusTone(status?: string): 'info' | 'warning' | 'success' | 'danger' | 'neutral' {
  if (status === 'SOLICITADO' || status === 'ATENDIDO') return 'warning';
  if (status === 'LIBERADO' || status === 'FINALIZADO') return 'success';
  if (status === 'CANCELADO' || status === 'PENDENTE') return 'danger';
  if (status === 'ARQUIVADO') return 'neutral';
  return 'info';
}

export function AgendamentoActionsScreen() {
  const params = useLocalSearchParams<{
    agendamentoId: string;
    pacienteId: string;
    profissionalId: string;
    recursoId: string;
    convenioId: string;
    servicoId: string;
    pacienteNome?: string;
    profissionalNome?: string;
    servicoNome?: string;
    convenioNome?: string;
    recursoNome?: string;
    dataHoraInicio?: string;
    dataHoraFim?: string;
    tipoAtendimento?: string;
    status?: string;
    recebimento?: string;
  }>();
  const router = useRouter();
  const { permissions } = useAuth();
  const { showToast } = useToast();

  const [status, setStatus] = useState<StatusAgendamento>((params.status as StatusAgendamento) || 'AGENDADO');
  const [loadingAction, setLoadingAction] = useState(false);
  const [editFieldsVisible, setEditFieldsVisible] = useState(false);
  const [alterStatusVisible, setAlterStatusVisible] = useState(false);
  const [deleteSeriesVisible, setDeleteSeriesVisible] = useState(false);

  const [codLiberacao, setCodLiberacao] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<StatusAgendamento>((params.status as StatusAgendamento) || 'AGENDADO');
  const [seriesCount, setSeriesCount] = useState(1);
  const [futureCount, setFutureCount] = useState(0);

  const recebimento = parseBooleanParam(params.recebimento);

  const canEdit = useMemo(
    () => hasRoutePermission(permissions, { path: '/agendamentos/:id', method: 'PUT' }),
    [permissions],
  );
  const canCancel = useMemo(
    () => hasRoutePermission(permissions, { path: '/agendamentos/:id/status', method: 'PATCH' }),
    [permissions],
  );
  const canAlterStatus = useMemo(
    () => hasRoutePermission(permissions, { path: '/agendamentos-alterar-status/:id', method: 'PUT' }),
    [permissions],
  );
  const canDelete = useMemo(
    () => hasRoutePermission(permissions, { path: '/agendamentos/:id', method: 'DELETE' }),
    [permissions],
  );

  const handleOpenEditAppointment = useCallback(() => {
    if (!canEdit) {
      showToast({ message: 'Você não tem permissão para editar agendamento.' });
      return;
    }
    router.push(
      routes.agendaActions({
        agendamentoId: params.agendamentoId,
        pacienteId: params.pacienteId,
        profissionalId: params.profissionalId,
        recursoId: params.recursoId,
        convenioId: params.convenioId,
        servicoId: params.servicoId,
        pacienteNome: params.pacienteNome || '',
        profissionalNome: params.profissionalNome || '',
        servicoNome: params.servicoNome || '',
        dataHoraInicio: params.dataHoraInicio || '',
        dataHoraFim: params.dataHoraFim || '',
        tipoAtendimento: params.tipoAtendimento || 'presencial',
        status,
      }),
    );
  }, [
    canEdit,
    params.agendamentoId,
    params.convenioId,
    params.dataHoraFim,
    params.dataHoraInicio,
    params.pacienteId,
    params.pacienteNome,
    params.profissionalId,
    params.profissionalNome,
    params.recursoId,
    params.servicoId,
    params.servicoNome,
    params.tipoAtendimento,
    router,
    showToast,
    status,
  ]);

  const handleSaveEditFields = useCallback(async () => {
    if (!canEdit) {
      showToast({ message: 'Você não tem permissão para editar campos.' });
      return;
    }

    setLoadingAction(true);
    try {
      await updateCodLiberacao(params.agendamentoId, {
        codLiberacao: codLiberacao.trim() || null,
        pacienteId: params.pacienteId,
        profissionalId: params.profissionalId,
        servicoId: params.servicoId,
        convenioId: params.convenioId,
        recursoId: params.recursoId,
        tipoAtendimento: params.tipoAtendimento || 'presencial',
        status,
        dataHoraInicio: params.dataHoraInicio || '',
      });
      setEditFieldsVisible(false);
      showToast({ message: 'Código de liberação atualizado com sucesso.' });
    } catch (err) {
      showToast({ message: parseApiError(err, 'Não foi possível atualizar os campos do agendamento.') });
    } finally {
      setLoadingAction(false);
    }
  }, [
    canEdit,
    codLiberacao,
    params.agendamentoId,
    params.convenioId,
    params.dataHoraInicio,
    params.pacienteId,
    params.profissionalId,
    params.recursoId,
    params.servicoId,
    params.tipoAtendimento,
    showToast,
    status,
  ]);

  const handleSaveStatus = useCallback(async () => {
    if (!canAlterStatus) {
      showToast({ message: 'Você não tem permissão para alterar status.' });
      return;
    }

    setLoadingAction(true);
    try {
      await alterarStatusAgendamento(params.agendamentoId, selectedStatus);
      setStatus(selectedStatus);
      setAlterStatusVisible(false);
      showToast({ message: `Status alterado para ${selectedStatus}.` });
    } catch (err) {
      showToast({ message: parseApiError(err, 'Não foi possível alterar o status.') });
    } finally {
      setLoadingAction(false);
    }
  }, [canAlterStatus, params.agendamentoId, selectedStatus, showToast]);

  const handleCancelAppointment = useCallback(async () => {
    if (!canCancel) {
      showToast({ message: 'Você não tem permissão para cancelar agendamento.' });
      return;
    }

    if (recebimento) {
      showToast({
        message:
          'Não é possível cancelar: este agendamento já possui recebimento registrado. Entre em contato com o financeiro.',
      });
      return;
    }

    if (status === 'CANCELADO') {
      const confirmedReactivate = await showConfirmDialog({
        title: 'Alterar status',
        message: 'Este agendamento está cancelado. Deseja alterar para Agendado?',
        confirmText: 'Alterar',
        cancelText: 'Cancelar',
      });
      if (!confirmedReactivate) return;

      setLoadingAction(true);
      try {
        await setStatusAgendamento(params.agendamentoId, 'AGENDADO');
        setStatus('AGENDADO');
        showToast({ message: 'Status alterado para Agendado com sucesso.' });
      } catch (err) {
        showToast({ message: parseApiError(err, 'Não foi possível alterar o status.') });
      } finally {
        setLoadingAction(false);
      }
      return;
    }

    const confirmed = await showConfirmDialog({
      title: 'Cancelar agendamento',
      message: 'Deseja realmente cancelar este agendamento?',
      confirmText: 'Sim, cancelar',
      cancelText: 'Não',
    });
    if (!confirmed) return;

    setLoadingAction(true);
    try {
      await setStatusAgendamento(params.agendamentoId, 'CANCELADO');
      setStatus('CANCELADO');
      showToast({ message: 'Agendamento cancelado com sucesso.' });
    } catch (err) {
      showToast({ message: parseApiError(err, 'Não foi possível cancelar o agendamento.') });
    } finally {
      setLoadingAction(false);
    }
  }, [canCancel, params.agendamentoId, recebimento, showToast, status]);

  const handleOpenDelete = useCallback(async () => {
    if (!canDelete) {
      showToast({ message: 'Você não tem permissão para excluir agendamento.' });
      return;
    }

    try {
      const info = await getAgendamentoSeriesInfo(params.agendamentoId);
      if (info.isSeries) {
        const total = info.totalAgendamentos || 1;
        const posicao = info.posicaoNaSerie?.posicao || total;
        const futuros = Math.max(0, total - posicao);
        setSeriesCount(total);
        setFutureCount(futuros);
        setDeleteSeriesVisible(true);
        return;
      }
    } catch {
      // fallback modal simples abaixo
    }

    const confirmed = await showConfirmDialog({
      title: 'Excluir agendamento',
      message: 'Deseja realmente excluir este agendamento?',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;

    setLoadingAction(true);
    try {
      await deleteAgendamento(params.agendamentoId, 'apenas_esta');
      showToast({ message: 'Agendamento excluído com sucesso.' });
      router.replace(routes.tabsAgendamentos);
    } catch (err) {
      showToast({ message: parseApiError(err, 'Não foi possível excluir o agendamento.') });
    } finally {
      setLoadingAction(false);
    }
  }, [canDelete, params.agendamentoId, router, showToast]);

  const handleDeleteByType = useCallback(
    async (tipo: 'apenas_esta' | 'esta_e_futuras' | 'toda_serie') => {
      setLoadingAction(true);
      try {
        await deleteAgendamento(params.agendamentoId, tipo);
        setDeleteSeriesVisible(false);
        showToast({
          message:
            tipo === 'toda_serie'
              ? `Série de ${seriesCount} agendamentos excluída com sucesso.`
              : tipo === 'esta_e_futuras'
                ? `${futureCount + 1} agendamentos (esta e futuras) excluídos com sucesso.`
                : 'Agendamento excluído com sucesso.',
        });
        router.replace(routes.tabsAgendamentos);
      } catch (err) {
        showToast({ message: parseApiError(err, 'Não foi possível excluir o(s) agendamento(s).') });
      } finally {
        setLoadingAction(false);
      }
    },
    [futureCount, params.agendamentoId, router, seriesCount, showToast],
  );

  return (
    <AppScreen>
      <View className="mb-3 rounded-2xl border border-surface-border bg-surface-card p-4">
        <View className="flex-row items-start justify-between gap-3">
          <AppText className="flex-1 text-base font-semibold text-content-primary">
            {params.pacienteNome || 'Paciente não informado'}
          </AppText>
          <Chip label={status} tone={getStatusTone(status)} />
        </View>
        <AppText className="mt-1 text-xs text-content-secondary">
          {formatDateTime(params.dataHoraInicio, params.dataHoraFim)}
        </AppText>
        <AppText className="mt-1 text-xs text-content-secondary">
          Profissional: {params.profissionalNome || 'Não informado'}
        </AppText>
        <AppText className="mt-1 text-xs text-content-secondary">Serviço: {params.servicoNome || 'Não informado'}</AppText>
        <AppText className="mt-1 text-xs text-content-secondary">Convênio: {params.convenioNome || 'Não informado'}</AppText>
        <AppText className="mt-1 text-xs text-content-secondary">Recurso: {params.recursoNome || 'Não informado'}</AppText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 24 }}>
        <Button label="Editar agendamento" variant={canEdit ? 'primary' : 'secondary'} disabled={!canEdit} onPress={handleOpenEditAppointment} />

        <Button
          label="Editar campos (Cód. liberação)"
          variant={canEdit ? 'primary' : 'secondary'}
          disabled={!canEdit}
          onPress={() => setEditFieldsVisible(true)}
        />

        <Button
          label="Alterar status"
          variant={canAlterStatus ? 'primary' : 'secondary'}
          disabled={!canAlterStatus}
          onPress={() => setAlterStatusVisible(true)}
        />

        <Button
          label={status === 'CANCELADO' ? 'Alterar para agendado' : 'Cancelar agendamento'}
          variant={canCancel ? 'primary' : 'secondary'}
          disabled={!canCancel || loadingAction}
          onPress={() => void handleCancelAppointment()}
        />

        <Button
          label="Excluir agendamento"
          variant={canDelete ? 'primary' : 'secondary'}
          className={canDelete ? 'bg-red-600' : undefined}
          disabled={!canDelete || loadingAction}
          onPress={() => void handleOpenDelete()}
        />
      </ScrollView>

      <BottomSheet
        visible={editFieldsVisible}
        title="Editar campos do agendamento"
        onClose={() => setEditFieldsVisible(false)}
        footer={
          <View className="flex-row gap-3">
            <Button label="Cancelar" variant="secondary" className="flex-1" onPress={() => setEditFieldsVisible(false)} />
            <Button label="Salvar" className="flex-1" loading={loadingAction} onPress={() => void handleSaveEditFields()} />
          </View>
        }
      >
        <View className="pb-4">
          <Input label="Código de liberação" placeholder="Digite o novo código (ou deixe vazio)" value={codLiberacao} onChangeText={setCodLiberacao} />
        </View>
      </BottomSheet>

      <BottomSheet
        visible={alterStatusVisible}
        title="Alterar status do agendamento"
        onClose={() => setAlterStatusVisible(false)}
        footer={
          <View className="flex-row gap-3">
            <Button label="Cancelar" variant="secondary" className="flex-1" onPress={() => setAlterStatusVisible(false)} />
            <Button label="Confirmar" className="flex-1" loading={loadingAction} onPress={() => void handleSaveStatus()} />
          </View>
        }
      >
        <View className="pb-4">
          <Select
            label="Novo status"
            placeholder="Selecione"
            value={selectedStatus}
            onChange={(value) => setSelectedStatus(value as StatusAgendamento)}
            options={STATUS_OPTIONS}
          />
        </View>
      </BottomSheet>

      <BottomSheet
        visible={deleteSeriesVisible}
        title="Excluir agendamento em série"
        onClose={() => setDeleteSeriesVisible(false)}
      >
        <View className="pb-4">
          <AppText className="mb-3 text-sm text-content-secondary">
            Esta ocorrência faz parte de uma série com {seriesCount} agendamentos.
          </AppText>
          <View className="gap-2">
            <Button label="Excluir apenas este" variant="primary" className="bg-red-600" loading={loadingAction} onPress={() => void handleDeleteByType('apenas_esta')} />
            {futureCount > 0 ? (
              <Button
                label={`Excluir esta e futuras (${futureCount + 1})`}
                variant="primary"
                className="bg-red-600"
                loading={loadingAction}
                onPress={() => void handleDeleteByType('esta_e_futuras')}
              />
            ) : null}
            <Button label={`Excluir toda a série (${seriesCount})`} variant="primary" className="bg-red-600" loading={loadingAction} onPress={() => void handleDeleteByType('toda_serie')} />
            <Button label="Cancelar" variant="secondary" onPress={() => setDeleteSeriesVisible(false)} />
          </View>
        </View>
      </BottomSheet>
    </AppScreen>
  );
}
