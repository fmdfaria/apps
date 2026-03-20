import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonBlock } from '@/components/feedback/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { AppScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/features/auth/context/auth-context';
import { hasRoutePermission } from '@/features/auth/permissions';
import { getConvenios, getPatientById, updatePatient } from '@/features/customers/services/patients-api';
import type { Convenio, Patient, UpdatePatientPayload } from '@/features/customers/types';
import { useToast } from '@/providers/toast-provider';
import { applyDateMask, dateBrToIso, isValidDateBr, isoToDateBr } from '@/utils/date';
import { applyWhatsAppMask, isValidWhatsApp, whatsAppToStorage } from '@/utils/whatsapp';

type EditForm = {
  nomeCompleto: string;
  nomeResponsavel: string;
  whatsapp: string;
  tipoServico: string;
  email: string;
  cpf: string;
  dataNascimento: string;
  convenioId: string;
  numeroCarteirinha: string;
};

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

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function mapPatientToForm(patient: Patient): EditForm {
  return {
    nomeCompleto: patient.nomeCompleto || '',
    nomeResponsavel: patient.nomeResponsavel || '',
    whatsapp: applyWhatsAppMask(patient.whatsapp || ''),
    tipoServico: patient.tipoServico || '',
    email: patient.email || '',
    cpf: patient.cpf || '',
    dataNascimento: isoToDateBr(patient.dataNascimento),
    convenioId: patient.convenioId || '',
    numeroCarteirinha: patient.numeroCarteirinha || '',
  };
}

export function CustomerEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { permissions } = useAuth();
  const { showToast } = useToast();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [convenios, setConvenios] = useState<Convenio[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingConvenios, setLoadingConvenios] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUpdate = useMemo(() => hasRoutePermission(permissions, { path: '/pacientes/:id', method: 'PUT' }), [permissions]);

  const convenioParticular = useMemo(
    () => convenios.find((convenio) => convenio.nome.trim().toLowerCase() === 'particular'),
    [convenios],
  );

  const convenioOptions = useMemo(() => {
    if (!editForm?.tipoServico) {
      return [];
    }

    if (editForm.tipoServico === 'Particular') {
      return convenioParticular ? [{ label: convenioParticular.nome, value: convenioParticular.id }] : [];
    }

    if (editForm.tipoServico === 'Convênio') {
      return convenios
        .filter((convenio) => convenio.nome.trim().toLowerCase() !== 'particular')
        .map((convenio) => ({ label: convenio.nome, value: convenio.id }));
    }

    return convenios.map((convenio) => ({ label: convenio.nome, value: convenio.id }));
  }, [convenioParticular, convenios, editForm?.tipoServico]);

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
      setEditForm(mapPatientToForm(data));
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível carregar os dados do paciente.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadConvenios = useCallback(async () => {
    setLoadingConvenios(true);
    try {
      const data = await getConvenios();
      setConvenios(data);
    } catch {
      setConvenios([]);
    } finally {
      setLoadingConvenios(false);
    }
  }, []);

  useEffect(() => {
    void loadPatient();
    void loadConvenios();
  }, [loadConvenios, loadPatient]);

  useEffect(() => {
    if (!editForm) {
      return;
    }

    if (editForm.tipoServico === 'Particular' && convenioParticular && editForm.convenioId !== convenioParticular.id) {
      setEditForm((current) => (current ? { ...current, convenioId: convenioParticular.id } : current));
      return;
    }

    if (editForm.tipoServico === 'Convênio' && editForm.convenioId && convenioParticular && editForm.convenioId === convenioParticular.id) {
      setEditForm((current) => (current ? { ...current, convenioId: '' } : current));
      return;
    }

    if (!editForm.tipoServico && editForm.convenioId) {
      setEditForm((current) => (current ? { ...current, convenioId: '' } : current));
    }
  }, [convenioParticular, editForm]);

  const handleSave = useCallback(async () => {
    if (!patient || !editForm) {
      return;
    }

    if (!editForm.nomeCompleto.trim() || editForm.nomeCompleto.trim().length < 2) {
      showToast({ message: 'Informe o nome completo do paciente.' });
      return;
    }

    if (!isValidWhatsApp(editForm.whatsapp)) {
      showToast({ message: 'Informe um WhatsApp válido.' });
      return;
    }

    if (!editForm.tipoServico.trim()) {
      showToast({ message: 'Informe o tipo de serviço.' });
      return;
    }

    if (editForm.tipoServico === 'Particular' && !editForm.convenioId.trim()) {
      showToast({ message: 'Não foi encontrado convênio Particular cadastrado.' });
      return;
    }

    if (editForm.tipoServico === 'Convênio' && !editForm.convenioId.trim()) {
      showToast({ message: 'Selecione o convênio.' });
      return;
    }

    if (editForm.dataNascimento.trim() && !isValidDateBr(editForm.dataNascimento)) {
      showToast({ message: 'Informe uma data de nascimento válida no formato DD-MM-AAAA.' });
      return;
    }

    const payload: UpdatePatientPayload = {
      nomeCompleto: editForm.nomeCompleto.trim(),
      whatsapp: whatsAppToStorage(editForm.whatsapp),
      tipoServico: editForm.tipoServico.trim(),
      nomeResponsavel: editForm.nomeResponsavel.trim() || null,
      email: editForm.email.trim() || null,
      cpf: editForm.cpf.trim() ? onlyDigits(editForm.cpf) : null,
      dataNascimento: dateBrToIso(editForm.dataNascimento),
      convenioId: editForm.convenioId.trim() || null,
      numeroCarteirinha: editForm.numeroCarteirinha.trim() || null,
    };

    setSaving(true);
    try {
      const updated = await updatePatient(patient.id, payload);
      setPatient(updated);
      setEditForm(mapPatientToForm(updated));
      showToast({ message: 'Dados do paciente atualizados com sucesso.' });
      router.back();
    } catch (err) {
      showToast({ message: getErrorMessage(err, 'Não foi possível atualizar o paciente.') });
    } finally {
      setSaving(false);
    }
  }, [editForm, patient, router, showToast]);

  return (
    <AppScreen>
      <PageHeader title="Editar dados do paciente" subtitle={patient?.nomeCompleto || 'Cadastro do paciente'} />

      {loading ? (
        <View className="mt-3">
          <SkeletonBlock lines={8} />
        </View>
      ) : error ? (
        <View className="mt-3">
          <ErrorState description={error} onRetry={() => void loadPatient()} />
        </View>
      ) : !canUpdate ? (
        <View className="mt-3">
          <ErrorState description="Você não tem permissão para editar dados do paciente." onRetry={() => router.back()} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 8, paddingBottom: 24 }}>
          <Input
            label="Nome completo *"
            value={editForm?.nomeCompleto || ''}
            onChangeText={(value) => setEditForm((current) => (current ? { ...current, nomeCompleto: value } : current))}
          />
          <Input
            label="Nome do responsável"
            value={editForm?.nomeResponsavel || ''}
            onChangeText={(value) => setEditForm((current) => (current ? { ...current, nomeResponsavel: value } : current))}
          />
          <Input
            label="WhatsApp *"
            value={editForm?.whatsapp || ''}
            onChangeText={(value) => setEditForm((current) => (current ? { ...current, whatsapp: applyWhatsAppMask(value) } : current))}
            keyboardType="phone-pad"
          />
          <Select
            label="Tipo de serviço *"
            placeholder="Selecione"
            value={editForm?.tipoServico || ''}
            onChange={(tipoServico) => setEditForm((current) => (current ? { ...current, tipoServico } : current))}
            options={[
              { label: 'Particular', value: 'Particular' },
              { label: 'Convênio', value: 'Convênio' },
            ]}
          />
          <Select
            label={editForm?.tipoServico === 'Convênio' ? 'Convênio *' : 'Convênio'}
            placeholder={
              !editForm?.tipoServico
                ? 'Selecione o tipo de serviço'
                : editForm.tipoServico === 'Particular'
                  ? 'Particular selecionado automaticamente'
                  : loadingConvenios
                    ? 'Carregando convênios...'
                    : 'Selecione'
            }
            value={editForm?.convenioId || ''}
            onChange={(convenioId) => setEditForm((current) => (current ? { ...current, convenioId } : current))}
            options={convenioOptions}
          />
          <Input
            label="Nº carteirinha"
            value={editForm?.numeroCarteirinha || ''}
            onChangeText={(value) => setEditForm((current) => (current ? { ...current, numeroCarteirinha: value } : current))}
          />
          <Input
            label="Data de nascimento"
            value={editForm?.dataNascimento || ''}
            onChangeText={(value) =>
              setEditForm((current) => (current ? { ...current, dataNascimento: applyDateMask(value) } : current))
            }
            placeholder="DD-MM-AAAA"
            keyboardType="number-pad"
          />
          <Input
            label="E-mail"
            value={editForm?.email || ''}
            onChangeText={(value) => setEditForm((current) => (current ? { ...current, email: value } : current))}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="CPF"
            value={editForm?.cpf || ''}
            onChangeText={(value) => setEditForm((current) => (current ? { ...current, cpf: value } : current))}
          />

          <View className="mt-2 flex-row gap-2">
            <Button label="Cancelar" variant="secondary" className="flex-1" onPress={() => router.back()} disabled={saving} />
            <Button label="Salvar" className="flex-1" onPress={() => void handleSave()} loading={saving} />
          </View>
        </ScrollView>
      )}
    </AppScreen>
  );
}
