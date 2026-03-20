import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonBlock } from '@/components/feedback/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { getPatientById } from '@/features/customers/services/patients-api';
import type { Patient } from '@/features/customers/types';
import { routes } from '@/navigation/routes';
import { formatWhatsAppDisplay } from '@/utils/whatsapp';

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

function normalizeWhatsapp(rawValue?: string | null) {
  if (!rawValue) {
    return null;
  }

  const digits = rawValue.replace(/\D/g, '');
  if (!digits) {
    return null;
  }

  if (digits.startsWith('55')) {
    return digits;
  }

  return `55${digits}`;
}

export function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(getErrorMessage(err, 'Não foi possível carregar os dados do paciente.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadPatient();
  }, [loadPatient]);

  const handleOpenWhatsapp = useCallback(async () => {
    if (!patient?.whatsapp) {
      return;
    }

    const normalizedPhone = normalizeWhatsapp(patient.whatsapp);
    if (!normalizedPhone) {
      return;
    }

    const appUrl = `whatsapp://send?phone=${normalizedPhone}`;
    const webUrl = `https://wa.me/${normalizedPhone}`;

    const canOpenApp = await Linking.canOpenURL(appUrl);

    if (canOpenApp) {
      await Linking.openURL(appUrl);
      return;
    }

    await Linking.openURL(webUrl);
  }, [patient?.whatsapp]);

  return (
    <AppScreen>
      <PageHeader
        title={patient?.nomeCompleto || 'Paciente'}
        subtitle="Detalhes do cadastro do paciente"
        rightSlot={
          <Pressable
            onPress={() => {
              if (patient?.id) {
                router.push(routes.customerActions(patient.id, patient.nomeCompleto));
              }
            }}
            disabled={loading || Boolean(error) || !patient}
            className="h-10 w-10 items-center justify-center rounded-xl border border-surface-border bg-surface-card"
            style={({ pressed }) => [{ opacity: loading || error || !patient ? 0.45 : pressed ? 0.8 : 1 }]}
          >
            <Ionicons name="menu-outline" size={18} color="#0f172a" />
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
        {loading ? (
          <>
            <SkeletonBlock lines={4} />
            <SkeletonBlock lines={4} />
          </>
        ) : error || !patient ? (
          <ErrorState description={error || 'Paciente não encontrado.'} onRetry={() => void loadPatient()} />
        ) : (
          <>
            <View className="rounded-2xl border border-surface-border bg-surface-card p-4">
              <AppText className="text-base font-semibold text-content-primary">Informações principais</AppText>
              <AppText className="mt-3 text-sm text-content-secondary">Nome: {patient.nomeCompleto}</AppText>
              <AppText className="mt-1 text-sm text-content-secondary">Serviço: {patient.tipoServico}</AppText>
              <AppText className="mt-1 text-sm text-content-secondary">
                Status: {patient.ativo === false ? 'Inativo' : 'Ativo'}
              </AppText>
              <AppText className="mt-1 text-sm text-content-secondary">
                Convênio: {patient.convenio?.nome || 'Sem convênio'}
              </AppText>
            </View>

            <View className="rounded-2xl border border-surface-border bg-surface-card p-4">
              <AppText className="text-base font-semibold text-content-primary">Contato e cadastro</AppText>
              <AppText className="mt-3 text-sm text-content-secondary">
                WhatsApp: {patient.whatsapp ? formatWhatsAppDisplay(patient.whatsapp) : 'Não informado'}
              </AppText>
              <AppText className="mt-1 text-sm text-content-secondary">E-mail: {patient.email || 'Não informado'}</AppText>
              <AppText className="mt-1 text-sm text-content-secondary">CPF: {patient.cpf || 'Não informado'}</AppText>
              <AppText className="mt-1 text-sm text-content-secondary">
                Responsável: {patient.nomeResponsavel || 'Não informado'}
              </AppText>
              <AppText className="mt-1 text-sm text-content-secondary">
                Carteirinha: {patient.numeroCarteirinha || 'Não informado'}
              </AppText>

              <Pressable
                onPress={() => void handleOpenWhatsapp()}
                disabled={!patient.whatsapp}
                className="mt-4 flex-row items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
                style={({ pressed }) => [{ opacity: !patient.whatsapp ? 0.5 : pressed ? 0.85 : 1 }]}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#15803d" />
                <AppText className="ml-2 text-sm font-semibold text-emerald-700">Abrir conversa no WhatsApp</AppText>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </AppScreen>
  );
}
