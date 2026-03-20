import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonBlock } from '@/components/feedback/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { AppScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { showConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/features/auth/context/auth-context';
import { hasRoutePermission } from '@/features/auth/permissions';
import { getPatientById, togglePatientStatus } from '@/features/customers/services/patients-api';
import type { Patient } from '@/features/customers/types';
import { routes } from '@/navigation/routes';
import { useToast } from '@/providers/toast-provider';

function getErrorMessage(error: unknown, fallback = 'Não foi possível concluir a operação.') {
  if (typeof error === 'object' && error && 'response' in error) {
    const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (message) {
      return message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function CustomerActionsScreen() {
  const { id, nome } = useLocalSearchParams<{ id: string; nome?: string }>();
  const router = useRouter();
  const { permissions } = useAuth();
  const { showToast } = useToast();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canUpdate = useMemo(() => hasRoutePermission(permissions, { path: '/pacientes/:id', method: 'PUT' }), [permissions]);
  const canViewAnexos = useMemo(() => hasRoutePermission(permissions, { path: '/anexos', method: 'GET' }), [permissions]);
  const canViewEvolucoes = useMemo(() => hasRoutePermission(permissions, { path: '/evolucoes', method: 'GET' }), [permissions]);
  const canToggleStatus = useMemo(
    () => hasRoutePermission(permissions, { path: '/pacientes/:id/status', method: 'PATCH' }),
    [permissions],
  );

  const loadPatient = useCallback(async () => {
    if (!id) {
      setError('Paciente inválido.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getPatientById(id);
      setPatient(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível carregar as ações do paciente.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadPatient();
  }, [loadPatient]);

  const handleTogglePatientStatus = useCallback(async () => {
    if (!patient || !canToggleStatus) {
      return;
    }

    const nextAtivo = patient.ativo === false;
    const confirmed = await showConfirmDialog({
      title: nextAtivo ? 'Ativar paciente' : 'Inativar paciente',
      message: nextAtivo ? 'Deseja realmente ativar este paciente?' : 'Deseja realmente inativar este paciente?',
      confirmText: nextAtivo ? 'Ativar' : 'Inativar',
      cancelText: 'Cancelar',
      destructive: !nextAtivo,
    });

    if (!confirmed) {
      return;
    }

    try {
      const updated = await togglePatientStatus(patient.id, nextAtivo);
      setPatient(updated);
      showToast({ message: nextAtivo ? 'Paciente ativado com sucesso.' : 'Paciente inativado com sucesso.' });
    } catch (err) {
      showToast({ message: getErrorMessage(err, 'Não foi possível alterar o status do paciente.') });
    }
  }, [canToggleStatus, patient, showToast]);

  const actionButtons = [
    {
      id: 'editar',
      label: 'Editar dados do paciente',
      icon: 'create-outline' as const,
      enabled: canUpdate,
      onPress: () => {
        if (patient?.id) {
          router.push(routes.customerEdit(patient.id));
        }
      },
    },
    {
      id: 'anexos',
      label: 'Gerenciar anexos',
      icon: 'attach-outline' as const,
      enabled: canViewAnexos,
      onPress: () => {
        if (patient?.id) {
          router.push(routes.customerAttachments(patient.id, patient.nomeCompleto));
        }
      },
    },
    {
      id: 'evolucao',
      label: 'Evolução do paciente',
      icon: 'time-outline' as const,
      enabled: canViewEvolucoes,
      onPress: () => {
        if (patient?.id) {
          router.push(routes.customerEvolutions(patient.id, patient.nomeCompleto));
        }
      },
    },
    {
      id: 'status',
      label: patient?.ativo === false ? 'Ativar paciente' : 'Inativar paciente',
      icon: patient?.ativo === false ? ('checkmark-circle-outline' as const) : ('ban-outline' as const),
      enabled: canToggleStatus,
      onPress: () => {
        void handleTogglePatientStatus();
      },
    },
  ];

  return (
    <AppScreen>
      <PageHeader title="Ações do paciente" subtitle={nome ? `Paciente: ${nome}` : 'Selecione uma ação'} />

      {loading ? (
        <View className="mt-3">
          <SkeletonBlock lines={5} />
        </View>
      ) : error ? (
        <View className="mt-3">
          <ErrorState description={error} onRetry={() => void loadPatient()} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 8, paddingBottom: 24 }}>
          {actionButtons.map((action) => {
            const enabled = action.enabled;
            const variant = enabled ? 'primary' : 'secondary';
            const iconColor = enabled ? '#f8fafc' : '#0f172a';

            return (
              <Button
                key={action.id}
                label={action.label}
                variant={variant}
                onPress={action.onPress}
                disabled={!enabled}
                leftSlot={<Ionicons name={action.icon} size={18} color={iconColor} />}
              />
            );
          })}
        </ScrollView>
      )}
    </AppScreen>
  );
}
