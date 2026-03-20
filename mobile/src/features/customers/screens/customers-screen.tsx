import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { BackToTopButton } from '@/components/ui/back-to-top-button';
import { Button } from '@/components/ui/button';
import { ListItem } from '@/components/ui/list-item';
import { SearchBar } from '@/components/ui/search-bar';
import { useAuth } from '@/features/auth/context/auth-context';
import { hasRoutePermission } from '@/features/auth/permissions';
import { CreatePatientSheet } from '@/features/customers/components/create-patient-sheet';
import { createPatient, getConvenios, getPatientsPaginated } from '@/features/customers/services/patients-api';
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
  const [queryDebounced, setQueryDebounced] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingConvenios, setLoadingConvenios] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [newPatientVisible, setNewPatientVisible] = useState(false);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [formValues, setFormValues] = useState<PatientFormValues>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pulse = useRef(new Animated.Value(0.45)).current;
  const listRef = useRef<FlatList<Patient> | null>(null);

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

  useEffect(() => {
    const timer = setTimeout(() => setQueryDebounced(query.trim()), 450);
    return () => clearTimeout(timer);
  }, [query]);

  const loadPatients = useCallback(async (pageToLoad: number, mode: 'replace' | 'append', isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (pageToLoad > 1 && mode === 'append') {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    if (pageToLoad === 1 || isRefresh) {
      setError(null);
    }

    try {
      const response = await getPatientsPaginated({
        page: pageToLoad,
        limit,
        search: queryDebounced || undefined,
      });

      setPatients((current) => {
        if (mode === 'replace' || pageToLoad === 1) {
          return response.data;
        }

        const merged = [...current];
        const existingIds = new Set(current.map((item) => item.id));
        for (const item of response.data) {
          if (!existingIds.has(item.id)) {
            merged.push(item);
          }
        }
        return merged;
      });

      setPage(pageToLoad);
      setTotal(response.pagination.total);
      setTotalPages(response.pagination.totalPages || 1);
    } catch (err) {
      if (pageToLoad === 1 || isRefresh) {
        setError(getErrorMessage(err));
      } else {
        showToast({ message: getErrorMessage(err) });
      }
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else if (pageToLoad > 1 && mode === 'append') {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [limit, queryDebounced, showToast]);

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
    void loadPatients(1, 'replace');
  }, [loadPatients]);

  const handleEndReached = useCallback(() => {
    if (loading || refreshing || loadingMore) return;
    if (page >= totalPages) return;
    void loadPatients(page + 1, 'append');
  }, [loadPatients, loading, loadingMore, page, refreshing, totalPages]);

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
      await loadPatients(1, 'replace', true);
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
      <AppText className="mt-2 text-xs font-semibold text-content-muted">Exibindo {patients.length} de {total} pacientes</AppText>

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
          <ErrorState description={error} onRetry={() => void loadPatients(1, 'replace')} />
        </View>
      ) : patients.length === 0 ? (
        <View className="mt-4">
          <EmptyState
            title={queryDebounced ? 'Nenhum paciente encontrado' : 'Sem pacientes cadastrados'}
            description={
              queryDebounced
                ? 'Ajuste os filtros para encontrar o paciente desejado.'
                : 'Não há pacientes disponíveis para o seu perfil no momento.'
            }
            ctaLabel={canCreatePatient ? 'Novo paciente' : 'Recarregar'}
            onPressCta={() => {
              if (canCreatePatient) {
                void openNewPatientModal();
                return;
              }

              void loadPatients(1, 'replace', true);
            }}
          />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          className="mt-4"
          data={patients}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews
          onRefresh={() => void loadPatients(1, 'replace', true)}
          refreshing={refreshing}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.35}
          ListFooterComponent={
            <View className="mb-6 mt-2 items-center">
              {loadingMore ? (
                <ActivityIndicator />
              ) : page < totalPages ? (
                <AppText className="text-xs text-content-muted">Role para carregar mais...</AppText>
              ) : (
                <View className="h-2" />
              )}
            </View>
          }
          onScroll={(event) => setShowBackToTop(event.nativeEvent.contentOffset.y > 280)}
          scrollEventThrottle={16}
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

      <BackToTopButton visible={showBackToTop} onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })} />

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

