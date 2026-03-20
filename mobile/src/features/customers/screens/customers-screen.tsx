import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ListItem } from '@/components/ui/list-item';
import { SearchBar } from '@/components/ui/search-bar';
import { useAuth } from '@/features/auth/context/auth-context';
import { hasRoutePermission } from '@/features/auth/permissions';
import { CreatePatientSheet } from '@/features/customers/components/create-patient-sheet';
import { createPatient, getConvenios, getPatients } from '@/features/customers/services/patients-api';
import type { Convenio, CreatePatientPayload, Patient } from '@/features/customers/types';
import { routes } from '@/navigation/routes';
import { useToast } from '@/providers/toast-provider';
import type { StatusTone } from '@/types/status';
import { dateBrToIso, isValidDateBr } from '@/utils/date';
import { formatWhatsAppDisplay, isValidWhatsApp, whatsAppToStorage } from '@/utils/whatsapp';

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'response' in error) {
    const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (message) {
      return message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Não foi possível carregar os pacientes.';
}

function getStatusInfo(patient: Patient): { label: string; tone: StatusTone } {
  if (patient.ativo === false) {
    return { label: 'Inativo', tone: 'warning' };
  }

  return { label: 'Ativo', tone: 'success' };
}

type PatientFormValues = {
  nomeCompleto: string;
  nomeResponsavel: string;
  whatsapp: string;
  cpf: string;
  email: string;
  dataNascimento: string;
  tipoServico: '' | 'Particular' | 'Convênio';
  convenioId: string;
  numeroCarteirinha: string;
};

const EMPTY_FORM: PatientFormValues = {
  nomeCompleto: '',
  nomeResponsavel: '',
  whatsapp: '',
  cpf: '',
  email: '',
  dataNascimento: '',
  tipoServico: '',
  convenioId: '',
  numeroCarteirinha: '',
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function CustomersScreen() {
  const router = useRouter();
  const { permissions } = useAuth();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingConvenios, setLoadingConvenios] = useState(false);
  const [newPatientVisible, setNewPatientVisible] = useState(false);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [formValues, setFormValues] = useState<PatientFormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pulse = useRef(new Animated.Value(0.45)).current;

  const canCreatePatient = useMemo(() => {
    return hasRoutePermission(permissions, {
      path: '/pacientes',
      method: 'POST',
    });
  }, [permissions]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const loadPatients = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const data = await getPatients();
      setPatients(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  const loadConvenios = useCallback(async () => {
    if (!canCreatePatient) {
      return;
    }

    setLoadingConvenios(true);

    try {
      const data = await getConvenios();
      setConvenios(data);
    } catch {
      setConvenios([]);
    } finally {
      setLoadingConvenios(false);
    }
  }, [canCreatePatient]);

  useEffect(() => {
    void loadPatients();
  }, [loadPatients]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return patients;
    }

    return patients.filter((patient) => {
      const text = `${patient.nomeCompleto} ${patient.tipoServico} ${patient.whatsapp || ''} ${patient.nomeResponsavel || ''} ${
        patient.convenio?.nome || ''
      }`;
      return text.toLowerCase().includes(normalizedQuery);
    });
  }, [patients, query]);

  const openNewPatientModal = useCallback(async () => {
    setFormValues(EMPTY_FORM);
    setFormError(null);
    setNewPatientVisible(true);

    if (!convenios.length) {
      await loadConvenios();
    }
  }, [convenios.length, loadConvenios]);

  const closeNewPatientModal = useCallback(() => {
    if (creatingPatient) {
      return;
    }

    setNewPatientVisible(false);
    setFormError(null);
  }, [creatingPatient]);

  const updateFormValues = useCallback((updates: Partial<PatientFormValues>) => {
    setFormValues((current) => ({ ...current, ...updates }));
  }, []);

  const validateForm = useCallback(() => {
    if (!formValues.nomeCompleto.trim() || formValues.nomeCompleto.trim().length < 2) {
      return 'Informe o nome completo do paciente.';
    }

    if (!isValidWhatsApp(formValues.whatsapp)) {
      return 'Informe um WhatsApp válido.';
    }

    if (!formValues.tipoServico) {
      return 'Selecione o tipo de serviço.';
    }

    if (formValues.tipoServico === 'Particular' && !formValues.convenioId) {
      return 'Não foi encontrado convênio Particular cadastrado.';
    }

    if (formValues.tipoServico === 'Convênio' && !formValues.convenioId) {
      return 'Selecione o convênio.';
    }

    if (formValues.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email.trim())) {
      return 'Informe um e-mail válido.';
    }

    if (formValues.cpf.trim() && onlyDigits(formValues.cpf).length !== 11) {
      return 'Informe um CPF válido.';
    }

    if (formValues.dataNascimento.trim() && !isValidDateBr(formValues.dataNascimento)) {
      return 'Informe uma data de nascimento válida no formato DD-MM-AAAA.';
    }

    return null;
  }, [formValues]);

  const handleCreatePatient = useCallback(async () => {
    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload: CreatePatientPayload = {
      nomeCompleto: formValues.nomeCompleto.trim(),
      whatsapp: whatsAppToStorage(formValues.whatsapp),
      tipoServico: formValues.tipoServico,
      nomeResponsavel: formValues.nomeResponsavel.trim() || null,
      email: formValues.email.trim() || null,
      cpf: formValues.cpf.trim() ? onlyDigits(formValues.cpf) : null,
      dataNascimento: dateBrToIso(formValues.dataNascimento),
      convenioId: formValues.convenioId || null,
      numeroCarteirinha: formValues.numeroCarteirinha.trim() || null,
    };

    setCreatingPatient(true);
    setFormError(null);

    try {
      await createPatient(payload);
      showToast({ message: 'Paciente cadastrado com sucesso.' });
      setNewPatientVisible(false);
      setFormValues(EMPTY_FORM);
      await loadPatients(true);
    } catch (err) {
      const message = getErrorMessage(err);
      setFormError(message);
      showToast({ message });
    } finally {
      setCreatingPatient(false);
    }
  }, [formValues, loadPatients, showToast, validateForm]);

  return (
    <AppScreen>
      <PageHeader
        title="Pacientes"
        subtitle="Lista de pacientes da Clínica."
        rightSlot={
          canCreatePatient ? (
            <Button label="Novo paciente" size="sm" onPress={() => void openNewPatientModal()} />
          ) : undefined
        }
      />
      <SearchBar placeholder="Buscar por nome, serviço, convênio ou responsável" value={query} onChangeText={setQuery} />

      {loading ? (
        <View className="mt-4 gap-3">
          <View className="rounded-2xl border border-surface-border bg-surface-card p-4">
            <AppText className="mb-3 text-sm font-semibold text-content-secondary">Carregando pacientes...</AppText>
            {Array.from({ length: 6 }).map((_, index) => (
              <Animated.View
                key={index}
                style={{ opacity: pulse }}
                className="mb-3 rounded-xl border border-surface-border bg-surface-background p-3 last:mb-0"
              >
                <View className="mb-2 h-4 w-2/3 rounded-full bg-slate-200" />
                <View className="mb-2 h-3 w-1/2 rounded-full bg-slate-200" />
                <View className="h-3 w-3/4 rounded-full bg-slate-200" />
              </Animated.View>
            ))}
          </View>
        </View>
      ) : error ? (
        <View className="mt-4">
          <ErrorState description={error} onRetry={() => void loadPatients()} />
        </View>
      ) : filtered.length === 0 ? (
        <View className="mt-4">
          <EmptyState
            title={query ? 'Nenhum paciente encontrado' : 'Sem pacientes cadastrados'}
            description={
              query
                ? 'Ajuste os filtros para encontrar o paciente desejado.'
                : 'Não há pacientes disponíveis para o seu perfil no momento.'
            }
            ctaLabel={canCreatePatient ? 'Novo paciente' : 'Recarregar'}
            onPressCta={() => {
              if (canCreatePatient) {
                void openNewPatientModal();
                return;
              }

              void loadPatients(true);
            }}
          />
        </View>
      ) : (
        <FlatList
          className="mt-4"
          data={filtered}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews
          onRefresh={() => void loadPatients(true)}
          refreshing={refreshing}
          renderItem={({ item: patient }) => {
            const status = getStatusInfo(patient);
            const convenioName = patient.convenio?.nome || 'Sem convênio';
            const responsible = patient.nomeResponsavel || 'Não informado';
            const whatsapp = patient.whatsapp ? formatWhatsAppDisplay(patient.whatsapp) : 'Não informado';

            return (
              <ListItem
                key={patient.id}
                title={patient.nomeCompleto}
                subtitle={`${patient.tipoServico} • Convênio: ${convenioName}`}
                meta={`WhatsApp: ${whatsapp} • Responsável: ${responsible}`}
                badgeLabel={status.label}
                badgeTone={status.tone}
                onPress={() => router.push(routes.customerDetails(patient.id))}
              />
            );
          }}
        />
      )}

      <CreatePatientSheet
        visible={newPatientVisible}
        loading={creatingPatient}
        loadingConvenios={loadingConvenios}
        convenios={convenios}
        values={formValues}
        error={formError}
        onClose={closeNewPatientModal}
        onSubmit={() => void handleCreatePatient()}
        onChange={updateFormValues}
      />
    </AppScreen>
  );
}
