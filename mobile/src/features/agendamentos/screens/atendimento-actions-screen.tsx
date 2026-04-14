import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { showConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/context/auth-context';
import { hasRoutePermission } from '@/features/auth/permissions';
import {
  concluirAgendamento,
  getAgendamentoById,
  getConfiguracoesByEntity,
  getStatusEvolucoesPorAgendamentos,
  updateAssinaturaPaciente,
  updateAssinaturaProfissional,
  updateCompareceu,
  updateMotivoReprovacao,
} from '@/features/agendamentos/services/agendamentos-api';
import { routes } from '@/navigation/routes';
import { useToast } from '@/providers/toast-provider';

type AtendimentoConfig = {
  evolucao: boolean;
  compareceu: boolean;
  assinatura_paciente: boolean;
  assinatura_profissional: boolean;
};

type StatusEditable = 'compareceu' | 'assinaturaPaciente' | 'assinaturaProfissional';

const DEFAULT_CONFIG: AtendimentoConfig = {
  evolucao: true,
  compareceu: true,
  assinatura_paciente: true,
  assinatura_profissional: true,
};

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
  return null;
}

function getContexto(tipoAtendimento?: string) {
  return tipoAtendimento === 'online' ? 'atender_page_online' : 'atender_page_presencial';
}

function parseConfigValue(value: unknown) {
  return value === true || value === 'true';
}

function formatDateTime(value?: string) {
  if (!value) return 'Data não informada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const data = date.toLocaleDateString('pt-BR');
  const hora = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${data} às ${hora}`;
}

function renderTriStateIcon(value: boolean | null) {
  if (value === true) {
    return (
      <View className="rounded-full bg-emerald-100 px-1 py-1">
        <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
      </View>
    );
  }

  if (value === false) {
    return (
      <View className="rounded-full bg-red-100 px-1 py-1">
        <Ionicons name="close-circle" size={16} color="#dc2626" />
      </View>
    );
  }

  return undefined;
}

export function AtendimentoActionsScreen() {
  const params = useLocalSearchParams<{
    agendamentoId: string;
    pacienteId: string;
    pacienteNome?: string;
    profissionalId?: string;
    profissionalNome?: string;
    convenioId?: string;
    tipoAtendimento?: string;
    urlMeet?: string;
    dataCodLiberacao?: string;
    dataHoraInicio?: string;
    servicoNome?: string;
    status?: string;
    hasEvolucao?: string;
    compareceu?: string;
    assinaturaPaciente?: string;
    assinaturaProfissional?: string;
    motivoReprovacao?: string;
  }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { permissions } = useAuth();

  const [config, setConfig] = useState<AtendimentoConfig>(DEFAULT_CONFIG);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState(params.status || 'LIBERADO');

  const [hasEvolucao, setHasEvolucao] = useState(params.hasEvolucao === 'true');
  const [compareceu, setCompareceu] = useState<boolean | null>(parseBooleanParam(params.compareceu));
  const [assinaturaPaciente, setAssinaturaPaciente] = useState<boolean | null>(parseBooleanParam(params.assinaturaPaciente));
  const [assinaturaProfissional, setAssinaturaProfissional] = useState<boolean | null>(parseBooleanParam(params.assinaturaProfissional));
  const [motivoReprovacao, setMotivoReprovacao] = useState(params.motivoReprovacao || '');

  const [statusSheet, setStatusSheet] = useState<StatusEditable | null>(null);
  const [motivoSheet, setMotivoSheet] = useState(false);
  const autoRefreshOnceRef = useRef(false);

  const canFinalize = useMemo(
    () => hasRoutePermission(permissions, { path: '/agendamentos-atender/:id', method: 'PUT' }),
    [permissions],
  );
  const canEvolucaoPageAction = useMemo(
    () => hasRoutePermission(permissions, { path: '/agendamentos-atender-page-evolucao', method: 'GET' }),
    [permissions],
  );
  const canComparecimentoAction = useMemo(
    () => hasRoutePermission(permissions, { path: '/agendamentos-atender-page-comparecimento', method: 'GET' }),
    [permissions],
  );
  const canAssinaturaPacienteAction = useMemo(
    () => hasRoutePermission(permissions, { path: '/agendamentos-atender-page-paciente', method: 'GET' }),
    [permissions],
  );
  const canAssinaturaProfissionalAction = useMemo(
    () => hasRoutePermission(permissions, { path: '/agendamentos-atender-page-profissional', method: 'GET' }),
    [permissions],
  );
  const canMotivoReprovacaoAction = useMemo(
    () => hasRoutePermission(permissions, { path: '/agendamentos-atender-page-reprovacao', method: 'GET' }),
    [permissions],
  );
  const canViewEvolucoes = useMemo(() => hasRoutePermission(permissions, { path: '/evolucoes', method: 'GET' }), [permissions]);

  const loadConfig = useCallback(async () => {
    if (!params.convenioId) {
      setConfig(DEFAULT_CONFIG);
      setLoadingConfig(false);
      return;
    }

    setLoadingConfig(true);
    try {
      const response = await getConfiguracoesByEntity({
        entidadeTipo: 'convenio',
        entidadeId: params.convenioId,
        contexto: getContexto(params.tipoAtendimento),
      });
      const hasAnyConfig = Object.keys(response || {}).length > 0;
      if (!hasAnyConfig) {
        setConfig(DEFAULT_CONFIG);
        return;
      }

      setConfig({
        evolucao: parseConfigValue(response.evolucao),
        compareceu: parseConfigValue(response.compareceu),
        assinatura_paciente: parseConfigValue(response.assinatura_paciente),
        assinatura_profissional: parseConfigValue(response.assinatura_profissional),
      });
    } catch {
      setConfig(DEFAULT_CONFIG);
    } finally {
      setLoadingConfig(false);
    }
  }, [params.convenioId, params.tipoAtendimento]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const pendingBadges = useMemo(() => {
    const badges: Array<{ label: string; tone: 'warning' | 'danger' }> = [];

    if (config.evolucao && !hasEvolucao) {
      badges.push({ label: 'Evolução', tone: 'warning' });
    }

    if (config.compareceu && (compareceu === null || compareceu === undefined)) {
      badges.push({ label: 'Comparecimento', tone: 'warning' });
    }

    if (config.assinatura_paciente && assinaturaPaciente !== true) {
      badges.push({ label: 'Ass. Paciente', tone: assinaturaPaciente === false ? 'danger' : 'warning' });
    }

    if (config.assinatura_profissional && assinaturaProfissional !== true) {
      badges.push({ label: 'Ass. Profissional', tone: assinaturaProfissional === false ? 'danger' : 'warning' });
    }

    if (motivoReprovacao.trim()) {
      badges.push({ label: 'Pendências', tone: 'danger' });
    }

    return badges;
  }, [assinaturaPaciente, assinaturaProfissional, compareceu, config, hasEvolucao, motivoReprovacao]);

  const comparecimentoEnabled = config.compareceu && canComparecimentoAction;
  const assinaturaPacienteEnabled = config.assinatura_paciente && canAssinaturaPacienteAction;
  const assinaturaProfissionalEnabled = config.assinatura_profissional && canAssinaturaProfissionalAction;
  const evolucaoEnabled = canEvolucaoPageAction && canViewEvolucoes;
  const motivoReprovacaoEnabled = canMotivoReprovacaoAction;

  const validateAtendimento = useCallback(() => {
    const problems: string[] = [];

    if (config.evolucao && !hasEvolucao) {
      problems.push('• Evolução não foi registrada.');
    }

    if (config.compareceu && (compareceu === null || compareceu === undefined)) {
      problems.push('• Comparecimento não foi definido.');
    }

    if (config.assinatura_paciente && assinaturaPaciente !== true) {
      problems.push('• Assinatura do paciente está pendente.');
    }

    if (config.assinatura_profissional && assinaturaProfissional !== true) {
      problems.push('• Assinatura do profissional está pendente.');
    }

    return problems;
  }, [assinaturaPaciente, assinaturaProfissional, compareceu, config, hasEvolucao]);

  const prontoParaFinalizar = useMemo(() => validateAtendimento().length === 0, [validateAtendimento]);

  const handleOpenMeet = useCallback(async () => {
    if (!params.urlMeet) return;
    try {
      await Linking.openURL(params.urlMeet);
    } catch {
      showToast({ message: 'Não foi possível abrir o link da chamada.' });
    }
  }, [params.urlMeet, showToast]);

  const handleRefresh = useCallback(async (showSuccessToast = true) => {
    if (refreshing || actionLoading) return;

    setRefreshing(true);
    try {
      const [agendamentoAtualizado, evolucoes] = await Promise.all([
        getAgendamentoById(params.agendamentoId),
        getStatusEvolucoesPorAgendamentos([params.agendamentoId]),
      ]);

      setCompareceu(agendamentoAtualizado.compareceu ?? null);
      setAssinaturaPaciente(agendamentoAtualizado.assinaturaPaciente ?? null);
      setAssinaturaProfissional(agendamentoAtualizado.assinaturaProfissional ?? null);
      setMotivoReprovacao(agendamentoAtualizado.motivoReprovacao ?? '');
      setStatus(agendamentoAtualizado.status || params.status || 'LIBERADO');

      const hasEvolucaoAtualizada = evolucoes.find((item) => item.agendamentoId === params.agendamentoId)?.temEvolucao ?? false;
      setHasEvolucao(hasEvolucaoAtualizada);

      await loadConfig();
      if (showSuccessToast) {
        showToast({ message: 'Dados atualizados.' });
      }
    } catch (err) {
      showToast({ message: parseApiError(err, 'Não foi possível atualizar os dados do atendimento.') });
    } finally {
      setRefreshing(false);
    }
  }, [actionLoading, loadConfig, params.agendamentoId, params.status, refreshing, showToast]);

  useEffect(() => {
    if (autoRefreshOnceRef.current) return;
    autoRefreshOnceRef.current = true;
    void handleRefresh(false);
  }, [handleRefresh]);

  const handleOpenEvolucao = useCallback(() => {
    if (!canEvolucaoPageAction || !canViewEvolucoes) {
      showToast({ message: 'Você não tem permissão para acessar a evolução.' });
      return;
    }

    router.push(
      routes.customerEvolutions(params.pacienteId, params.pacienteNome || '', {
        agendamentoId: params.agendamentoId,
        profissionalId: params.profissionalId,
        dataCodLiberacao: params.dataCodLiberacao,
      }),
    );
  }, [canEvolucaoPageAction, canViewEvolucoes, params.agendamentoId, params.dataCodLiberacao, params.pacienteId, params.pacienteNome, params.profissionalId, router, showToast]);

  const handleOpenStatusSheet = useCallback(
    (field: StatusEditable) => {
      if (field === 'compareceu') {
        if (!config.compareceu) {
          showToast({ message: 'Comparecimento desabilitado para este convênio.' });
          return;
        }
        if (!canComparecimentoAction) {
          showToast({ message: 'Você não tem permissão para registrar comparecimento.' });
          return;
        }
      }

      if (field === 'assinaturaPaciente') {
        if (!config.assinatura_paciente) {
          showToast({ message: 'Assinatura do paciente desabilitada para este convênio.' });
          return;
        }
        if (!canAssinaturaPacienteAction) {
          showToast({ message: 'Você não tem permissão para registrar a assinatura do paciente.' });
          return;
        }
      }

      if (field === 'assinaturaProfissional') {
        if (!config.assinatura_profissional) {
          showToast({ message: 'Assinatura do profissional desabilitada para este convênio.' });
          return;
        }
        if (!canAssinaturaProfissionalAction) {
          showToast({ message: 'Você não tem permissão para registrar a assinatura do profissional.' });
          return;
        }
      }

      setStatusSheet(field);
    },
    [
      canAssinaturaPacienteAction,
      canAssinaturaProfissionalAction,
      canComparecimentoAction,
      config.assinatura_paciente,
      config.assinatura_profissional,
      config.compareceu,
      showToast,
    ],
  );

  const applyTriStateUpdate = useCallback(
    async (field: StatusEditable, value: boolean | null) => {
      setActionLoading(true);
      try {
        if (field === 'compareceu') {
          await updateCompareceu(params.agendamentoId, value);
          setCompareceu(value);
        } else if (field === 'assinaturaPaciente') {
          await updateAssinaturaPaciente(params.agendamentoId, value);
          setAssinaturaPaciente(value);
        } else {
          await updateAssinaturaProfissional(params.agendamentoId, value);
          setAssinaturaProfissional(value);
        }

        showToast({ message: 'Status atualizado com sucesso.' });
        setStatusSheet(null);
      } catch (err) {
        showToast({ message: parseApiError(err, 'Não foi possível salvar a alteração.') });
      } finally {
        setActionLoading(false);
      }
    },
    [params.agendamentoId, showToast],
  );

  const handleSaveMotivo = useCallback(async () => {
    setActionLoading(true);
    try {
      const value = motivoReprovacao.trim();
      const finalValue = value ? value : null;
      await updateMotivoReprovacao(params.agendamentoId, finalValue);
      setMotivoReprovacao(finalValue || '');
      showToast({ message: finalValue ? 'Motivo salvo com sucesso.' : 'Motivo removido com sucesso.' });
      setMotivoSheet(false);
    } catch (err) {
      showToast({ message: parseApiError(err, 'Não foi possível salvar o motivo da reprovação.') });
    } finally {
      setActionLoading(false);
    }
  }, [motivoReprovacao, params.agendamentoId, showToast]);

  const handleClearMotivo = useCallback(async () => {
    setActionLoading(true);
    try {
      await updateMotivoReprovacao(params.agendamentoId, null);
      setMotivoReprovacao('');
      showToast({ message: 'Motivo removido com sucesso.' });
      setMotivoSheet(false);
    } catch (err) {
      showToast({ message: parseApiError(err, 'Não foi possível remover o motivo da reprovação.') });
    } finally {
      setActionLoading(false);
    }
  }, [params.agendamentoId, showToast]);

  const handleConcluir = useCallback(async () => {
    if (!canFinalize) {
      showToast({ message: 'Você não tem permissão para finalizar atendimento.' });
      return;
    }

    const problems = validateAtendimento();
    if (problems.length) {
      showToast({ message: `Não é possível finalizar:\n${problems.join('\n')}` });
      return;
    }

    const confirmed = await showConfirmDialog({
      title: 'Concluir atendimento',
      message: `Deseja finalizar o atendimento de ${params.pacienteNome || 'paciente'}?`,
      confirmText: 'Finalizar',
      cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    setActionLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await concluirAgendamento(params.agendamentoId, { dataAtendimento: today });
      showToast({ message: 'Atendimento finalizado com sucesso.' });
      router.back();
    } catch (err) {
      showToast({ message: parseApiError(err, 'Não foi possível finalizar o atendimento.') });
    } finally {
      setActionLoading(false);
    }
  }, [canFinalize, params.agendamentoId, params.pacienteNome, router, showToast, validateAtendimento]);

  return (
    <AppScreen>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 24, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} />}
      >
        <Button
          label={refreshing ? 'Atualizando...' : 'Atualizar'}
          variant="secondary"
          size="sm"
          className="w-full"
          onPress={() => void handleRefresh()}
          disabled={actionLoading || refreshing}
        />

        <View className="mb-3 w-full rounded-xl border border-surface-border bg-slate-200 px-4 py-3 min-h-11 justify-center">
          <AppText className="text-base font-semibold text-content-primary">{params.pacienteNome || 'Paciente não informado'}</AppText>
          <AppText className="mt-1 text-xs text-content-secondary">{formatDateTime(params.dataHoraInicio)}</AppText>
          <AppText className="mt-1 text-xs text-content-secondary">Profissional: {params.profissionalNome || 'Não informado'}</AppText>
          <AppText className="mt-1 text-xs text-content-secondary">Serviço: {params.servicoNome || 'Não informado'}</AppText>
          <View className="mt-2 flex-row items-center gap-2">
            <Chip label={status} tone={status === 'LIBERADO' ? 'success' : 'neutral'} />
            {loadingConfig ? <AppText className="text-xs text-content-muted">Carregando regras...</AppText> : null}
          </View>
        </View>

        {pendingBadges.length > 0 ? (
          <View className="mb-3 flex-row flex-wrap gap-2">
            {pendingBadges.map((badge) => (
              <Chip key={`${badge.label}-${badge.tone}`} label={badge.label} tone={badge.tone} />
            ))}
          </View>
        ) : null}

        {params.tipoAtendimento === 'online' && params.urlMeet ? (
          <Button label="Entrar no Meet" variant="secondary" onPress={() => void handleOpenMeet()} disabled={actionLoading} />
        ) : null}

        <Button
          label="Evolução"
          variant={evolucaoEnabled ? 'primary' : 'secondary'}
          className="justify-between"
          onPress={handleOpenEvolucao}
          disabled={!evolucaoEnabled || actionLoading}
          rightSlot={
            hasEvolucao ? (
              <View className="rounded-full bg-emerald-100 px-1 py-1">
                <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
              </View>
            ) : undefined
          }
        />

        <Button
          label="Comparecimento"
          variant={comparecimentoEnabled ? 'primary' : 'secondary'}
          className="justify-between"
          onPress={() => handleOpenStatusSheet('compareceu')}
          disabled={!comparecimentoEnabled || actionLoading}
          rightSlot={renderTriStateIcon(compareceu)}
        />

        <Button
          label="Assinatura do paciente"
          variant={assinaturaPacienteEnabled ? 'primary' : 'secondary'}
          className="justify-between"
          onPress={() => handleOpenStatusSheet('assinaturaPaciente')}
          disabled={!assinaturaPacienteEnabled || actionLoading}
          rightSlot={renderTriStateIcon(assinaturaPaciente)}
        />

        <Button
          label="Assinatura do profissional"
          variant={assinaturaProfissionalEnabled ? 'primary' : 'secondary'}
          className="justify-between"
          onPress={() => handleOpenStatusSheet('assinaturaProfissional')}
          disabled={!assinaturaProfissionalEnabled || actionLoading}
          rightSlot={renderTriStateIcon(assinaturaProfissional)}
        />

        <Button
          label="Motivo da reprovação"
          variant={motivoReprovacaoEnabled ? 'primary' : 'secondary'}
          className="justify-between"
          onPress={() => setMotivoSheet(true)}
          disabled={!motivoReprovacaoEnabled || actionLoading}
          rightSlot={motivoReprovacao.trim() ? <Ionicons name="alert-circle" size={18} color="#f97316" /> : undefined}
        />

        <Button
          label="Finalizar atendimento"
          variant={canFinalize && prontoParaFinalizar ? 'primary' : 'secondary'}
          className={canFinalize && prontoParaFinalizar ? 'bg-emerald-600' : undefined}
          onPress={() => void handleConcluir()}
          disabled={!canFinalize || !prontoParaFinalizar || actionLoading}
          loading={actionLoading}
        />
      </ScrollView>

      <BottomSheet
        visible={Boolean(statusSheet)}
        title="Atualizar status"
        onClose={() => setStatusSheet(null)}
      >
        <View className="gap-3 pb-4">
          <AppText className="text-sm text-content-secondary">Escolha a opção para atualizar.</AppText>
          <Button
            label="Sim"
            onPress={() => {
              if (!statusSheet) return;
              void applyTriStateUpdate(statusSheet, true);
            }}
          />
          <Button
            label="Não"
            variant="secondary"
            onPress={() => {
              if (!statusSheet) return;
              void applyTriStateUpdate(statusSheet, false);
            }}
          />
          <Pressable
            onPress={() => {
              if (!statusSheet) return;
              void applyTriStateUpdate(statusSheet, null);
            }}
            className="items-center rounded-xl border border-surface-border bg-surface-background px-4 py-3"
          >
            <AppText className="text-sm font-semibold text-content-primary">Limpar status</AppText>
          </Pressable>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={motivoSheet}
        title="Motivo da reprovação"
        onClose={() => setMotivoSheet(false)}
        footer={
          <View className="gap-3">
            <View className="flex-row gap-3">
              <Button label="Cancelar" variant="secondary" className="flex-1" onPress={() => setMotivoSheet(false)} />
              <Button label="Salvar" className="flex-1" onPress={() => void handleSaveMotivo()} loading={actionLoading} />
            </View>
            <Pressable
              onPress={() => {
                if (actionLoading) return;
                void handleClearMotivo();
              }}
              className="items-center rounded-xl border border-surface-border bg-surface-background px-4 py-3"
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <AppText className="text-sm font-semibold text-content-primary">Limpar status</AppText>
            </Pressable>
          </View>
        }
      >
        <View className="pb-4">
          <Input
            label="Descreva o motivo"
            value={motivoReprovacao}
            onChangeText={setMotivoReprovacao}
            placeholder="Digite o motivo da reprovação"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>
      </BottomSheet>
    </AppScreen>
  );
}






