import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonBlock } from '@/components/feedback/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { showConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/features/auth/context/auth-context';
import { hasRoutePermission } from '@/features/auth/permissions';
import { getMeuProfissional } from '@/features/agendamentos/services/agendamentos-api';
import {
  createPatientEvolucao,
  deleteAnexo,
  deletePatientEvolucao,
  getAnexoDownloadUrl,
  getEvolucaoAnexos,
  getPatientEvolucoes,
  getProfissionaisOptions,
  updatePatientEvolucao,
  uploadEvolucaoAnexo,
} from '@/features/customers/services/patients-api';
import type { Anexo, CreateEvolucaoPacientePayload, EvolucaoPaciente, ProfissionalOption } from '@/features/customers/types';
import { routes } from '@/navigation/routes';
import { useToast } from '@/providers/toast-provider';
import { applyDateMask, dateBrToIso, isValidDateBr, isoToDateBr } from '@/utils/date';

type PickedFile = {
  uri: string;
  name: string;
  mimeType?: string;
};

type NewEvolucaoForm = {
  profissionalId: string;
  dataEvolucao: string;
  objetivoSessao: string;
  descricaoEvolucao: string;
};

const EMPTY_EVOLUCAO_FORM: NewEvolucaoForm = {
  profissionalId: '',
  dataEvolucao: '',
  objetivoSessao: '',
  descricaoEvolucao: '',
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

function formatDate(value?: string | null) {
  if (!value) return '-';

  // Prioriza a parte ISO (YYYY-MM-DD) para evitar diferença de fuso (-1 dia).
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = String(date.getUTCFullYear());
  return `${day}/${month}/${year}`;
}

function formatBytes(bytes?: number | null) {
  if (!bytes || Number.isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getTodayDateBr() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear());
  return `${day}-${month}-${year}`;
}

export function CustomerEvolutionsScreen() {
  const router = useRouter();
  const { id, nome, agendamentoId, profissionalId: profissionalIdParam, dataCodLiberacao } = useLocalSearchParams<{
    id: string;
    nome?: string;
    agendamentoId?: string;
    profissionalId?: string;
    dataCodLiberacao?: string;
  }>();
  const { user, permissions } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evolucoes, setEvolucoes] = useState<EvolucaoPaciente[]>([]);

  const [profissionais, setProfissionais] = useState<ProfissionalOption[]>([]);
  const [loadingProfissionais, setLoadingProfissionais] = useState(false);
  const [selectedProfissionalFilter, setSelectedProfissionalFilter] = useState('todos');

  const [newEvolucaoForm, setNewEvolucaoForm] = useState<NewEvolucaoForm>(EMPTY_EVOLUCAO_FORM);
  const [creatingEvolucao, setCreatingEvolucao] = useState(false);
  const [editingEvolucaoId, setEditingEvolucaoId] = useState<string | null>(null);

  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [selectedFile, setSelectedFile] = useState<PickedFile | null>(null);
  const [descricaoAnexo, setDescricaoAnexo] = useState('');
  const [uploadingAnexo, setUploadingAnexo] = useState(false);
  const [deletingAnexoId, setDeletingAnexoId] = useState<string | null>(null);
  const [deletingEvolucaoId, setDeletingEvolucaoId] = useState<string | null>(null);
  const [currentProfissional, setCurrentProfissional] = useState<{ id: string; nome: string } | null>(null);

  const agendamentoIdFromRoute = typeof agendamentoId === 'string' ? agendamentoId : '';
  const profissionalIdFromRoute = typeof profissionalIdParam === 'string' ? profissionalIdParam : '';
  const dataCodLiberacaoFromRoute = typeof dataCodLiberacao === 'string' ? dataCodLiberacao : '';

  const profissionalIdFromUser = useMemo(() => {
    const userAny = user as unknown as {
      profissionalId?: string | null;
      profissional?: { id?: string | null; profissionalId?: string | null };
    } | null;

    return userAny?.profissionalId || userAny?.profissional?.id || userAny?.profissional?.profissionalId || '';
  }, [user]);

  const isProfissional = useMemo(() => {
    const normalizedRoles = (user?.roles || []).map((role) => {
      if (typeof role === 'string') {
        return role.toUpperCase();
      }
      if (role && typeof role === 'object') {
        const roleAny = role as { nome?: string; name?: string; role?: string; tipo?: string };
        return String(roleAny.nome || roleAny.name || roleAny.role || roleAny.tipo || '').toUpperCase();
      }
      return String(role).toUpperCase();
    });
    return normalizedRoles.some((role) => role === 'PROFISSIONAL' || role.includes('PROFISSIONAL')) || Boolean(profissionalIdFromUser);
  }, [profissionalIdFromUser, user?.roles]);

  const canViewEvolucoes = useMemo(() => hasRoutePermission(permissions, { path: '/evolucoes', method: 'GET' }), [permissions]);
  const canCreateEvolucao = useMemo(() => hasRoutePermission(permissions, { path: '/evolucoes', method: 'POST' }), [permissions]);
  const canUpdateEvolucao = useMemo(() => hasRoutePermission(permissions, { path: '/evolucoes/:id', method: 'PUT' }), [permissions]);
  const canDeleteEvolucao = useMemo(
    () => hasRoutePermission(permissions, { path: '/evolucoes/:id', method: 'DELETE' }),
    [permissions],
  );
  const canViewAnexos = useMemo(() => hasRoutePermission(permissions, { path: '/anexos', method: 'GET' }), [permissions]);
  const canCreateAnexo = useMemo(() => hasRoutePermission(permissions, { path: '/anexos', method: 'POST' }), [permissions]);
  const canDeleteAnexo = useMemo(
    () => hasRoutePermission(permissions, { path: '/anexos/:id', method: 'DELETE' }),
    [permissions],
  );

  const profissionalOptions = useMemo(() => profissionais.map((item) => ({ label: item.nome, value: item.id })), [profissionais]);

  const profissionalFilterOptions = useMemo(() => {
    const base = [{ label: 'Todos os profissionais', value: 'todos' }];
    const map = new Map<string, string>();
    evolucoes.forEach((item) => {
      const key = item.profissionalId || item.profissionalNome;
      if (!key) return;
      map.set(key, item.profissionalNome || 'Profissional não informado');
    });
    map.forEach((label, value) => base.push({ label, value }));
    return base;
  }, [evolucoes]);

  const filteredEvolucoes = useMemo(() => {
    if (agendamentoIdFromRoute) {
      return evolucoes.filter((item) => item.agendamentoId === agendamentoIdFromRoute);
    }

    if (selectedProfissionalFilter === 'todos') {
      return evolucoes;
    }

    return evolucoes.filter((item) => (item.profissionalId || item.profissionalNome) === selectedProfissionalFilter);
  }, [agendamentoIdFromRoute, evolucoes, selectedProfissionalFilter]);

  const loadProfissionais = useCallback(async () => {
    if ((!canCreateEvolucao && !canUpdateEvolucao) || isProfissional) {
      return;
    }

    setLoadingProfissionais(true);
    try {
      const data = await getProfissionaisOptions();
      setProfissionais(data);
    } catch {
      setProfissionais([]);
    } finally {
      setLoadingProfissionais(false);
    }
  }, [canCreateEvolucao, canUpdateEvolucao, isProfissional]);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!id) {
        setError('Paciente inválido.');
        setLoading(false);
        return;
      }

      if (!canViewEvolucoes) {
        setError('Você não tem permissão para visualizar evoluções.');
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const [evolucoesData, anexosData] = await Promise.all([
          getPatientEvolucoes(id),
          canViewAnexos ? getEvolucaoAnexos(id) : Promise.resolve([]),
        ]);
        setEvolucoes(Array.isArray(evolucoesData) ? evolucoesData : []);
        setAnexos(Array.isArray(anexosData) ? anexosData.filter((item) => item.bucket === 'evolucoes') : []);
      } catch (err) {
        setError(getErrorMessage(err, 'Não foi possível carregar evoluções.'));
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [canViewAnexos, canViewEvolucoes, id],
  );

  useEffect(() => {
    let mounted = true;

    const resolveCurrentProfissional = async () => {
      if (!isProfissional) {
        if (mounted) {
          setCurrentProfissional(null);
        }
        return;
      }

      if (profissionalIdFromUser) {
        if (mounted) {
          setCurrentProfissional({ id: profissionalIdFromUser, nome: user?.nome || 'Profissional logado' });
          setNewEvolucaoForm((current) => ({ ...current, profissionalId: profissionalIdFromUser || '' }));
          setSelectedProfissionalFilter('todos');
        }
        return;
      }

      try {
        const profissional = await getMeuProfissional();
        if (!mounted) return;
        setCurrentProfissional(profissional);
        setNewEvolucaoForm((current) => ({ ...current, profissionalId: profissional.id }));
        setSelectedProfissionalFilter('todos');
      } catch {
        if (!mounted) return;
        setCurrentProfissional(null);
        setNewEvolucaoForm((current) => ({ ...current, profissionalId: '' }));
      }
    };

    void resolveCurrentProfissional();
    return () => {
      mounted = false;
    };
  }, [isProfissional, profissionalIdFromUser, user?.nome]);

  useEffect(() => {
    if (!agendamentoIdFromRoute) return;

    const evolucaoVinculada = evolucoes.find((item) => item.agendamentoId === agendamentoIdFromRoute);
    const dataPadrao = isoToDateBr(dataCodLiberacaoFromRoute) || getTodayDateBr();
    if (evolucaoVinculada) {
      setEditingEvolucaoId(evolucaoVinculada.id);
      setNewEvolucaoForm({
        profissionalId: evolucaoVinculada.profissionalId || profissionalIdFromRoute || profissionalIdFromUser || '',
        dataEvolucao: isoToDateBr(evolucaoVinculada.dataEvolucao) || dataPadrao,
        objetivoSessao: evolucaoVinculada.objetivoSessao || '',
        descricaoEvolucao: evolucaoVinculada.descricaoEvolucao || '',
      });
      return;
    }

    setEditingEvolucaoId(null);
    setNewEvolucaoForm((current) => ({
      ...current,
      profissionalId: current.profissionalId || profissionalIdFromRoute || profissionalIdFromUser || '',
      dataEvolucao: current.dataEvolucao || dataPadrao,
      objetivoSessao: current.objetivoSessao || '',
      descricaoEvolucao: current.descricaoEvolucao || '',
    }));
  }, [agendamentoIdFromRoute, dataCodLiberacaoFromRoute, evolucoes, profissionalIdFromRoute, profissionalIdFromUser]);

  useEffect(() => {
    void loadData();
    void loadProfissionais();
  }, [loadData, loadProfissionais]);

  const validateEvolucaoForm = useCallback(() => {
    if (!id) return 'Paciente inválido.';
    if (!newEvolucaoForm.dataEvolucao.trim() || !isValidDateBr(newEvolucaoForm.dataEvolucao)) {
      return 'Informe a data da evolução no formato DD-MM-AAAA.';
    }

    const isoDate = dateBrToIso(newEvolucaoForm.dataEvolucao);
    if (!isoDate) {
      return 'Data da evolução inválida.';
    }

    const dataEvolucao = new Date(`${isoDate}T00:00:00`);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (dataEvolucao > hoje) {
      return 'A data da evolução não pode ser futura.';
    }

    if (!newEvolucaoForm.objetivoSessao.trim()) {
      return 'Informe o objetivo da sessão.';
    }

    if (!newEvolucaoForm.descricaoEvolucao.trim()) {
      return 'Informe a descrição da evolução.';
    }

    if (isProfissional && !newEvolucaoForm.profissionalId) {
      return 'Não foi possível identificar o profissional logado.';
    }

    if (!isProfissional && !newEvolucaoForm.profissionalId) {
      return 'Selecione o profissional.';
    }

    return null;
  }, [id, isProfissional, newEvolucaoForm]);

  const handleSaveEvolucao = useCallback(async () => {
    const validationError = validateEvolucaoForm();
    if (validationError) {
      showToast({ message: validationError });
      return;
    }

    if (!id) return;

    const payload: CreateEvolucaoPacientePayload = {
      pacienteId: id,
      agendamentoId: agendamentoIdFromRoute || null,
      profissionalId: newEvolucaoForm.profissionalId || null,
      dataEvolucao: dateBrToIso(newEvolucaoForm.dataEvolucao) || '',
      objetivoSessao: newEvolucaoForm.objetivoSessao.trim(),
      descricaoEvolucao: newEvolucaoForm.descricaoEvolucao.trim(),
    };

    setCreatingEvolucao(true);
    try {
      if (editingEvolucaoId) {
        if (!canUpdateEvolucao) {
          showToast({ message: 'Você não tem permissão para editar evolução.' });
          return;
        }
        await updatePatientEvolucao(editingEvolucaoId, payload);
        showToast({ message: 'Evolução atualizada com sucesso.' });
      } else {
        if (!canCreateEvolucao) {
          showToast({ message: 'Você não tem permissão para criar evolução.' });
          return;
        }
        await createPatientEvolucao(payload);
        showToast({ message: 'Evolução salva com sucesso.' });
        if (!agendamentoIdFromRoute) {
          setNewEvolucaoForm((current) => ({
            ...EMPTY_EVOLUCAO_FORM,
            profissionalId: isProfissional ? current.profissionalId : profissionalIdFromRoute || '',
            dataEvolucao: '',
          }));
        }
      }
      await loadData(true);
    } catch (err) {
      showToast({ message: getErrorMessage(err, 'Não foi possível salvar a evolução.') });
    } finally {
      setCreatingEvolucao(false);
    }
  }, [
    agendamentoIdFromRoute,
    canCreateEvolucao,
    canUpdateEvolucao,
    editingEvolucaoId,
    id,
    isProfissional,
    loadData,
    newEvolucaoForm,
    profissionalIdFromRoute,
    showToast,
    validateEvolucaoForm,
  ]);

  const handleDeleteEvolucao = useCallback(
    async (evolucaoId: string) => {
      if (!canDeleteEvolucao) return;

      const confirmed = await showConfirmDialog({
        title: 'Confirmar exclusão',
        message: 'Realmente deseja excluir esta evolução?',
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
        destructive: true,
      });

      if (!confirmed) return;

      setDeletingEvolucaoId(evolucaoId);
      try {
        await deletePatientEvolucao(evolucaoId);
        setEvolucoes((current) => current.filter((item) => item.id !== evolucaoId));
        if (editingEvolucaoId === evolucaoId) {
          setEditingEvolucaoId(null);
        }
        showToast({ message: 'Evolução excluída com sucesso.' });
      } catch (err) {
        showToast({ message: getErrorMessage(err, 'Não foi possível excluir a evolução.') });
      } finally {
        setDeletingEvolucaoId(null);
      }
    },
    [canDeleteEvolucao, editingEvolucaoId, showToast],
  );

  const handlePickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets.length) return;

      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType ?? undefined,
      });
    } catch {
      showToast({ message: 'Não foi possível selecionar o arquivo.' });
    }
  }, [showToast]);

  const handleUploadAnexo = useCallback(async () => {
    if (!id) return;
    if (!canCreateAnexo || !canCreateEvolucao) {
      showToast({ message: 'Você não tem permissão para anexar na evolução.' });
      return;
    }
    if (!selectedFile) {
      showToast({ message: 'Selecione um arquivo para enviar.' });
      return;
    }
    if (!descricaoAnexo.trim()) {
      showToast({ message: 'Informe uma descrição para o anexo.' });
      return;
    }

    setUploadingAnexo(true);
    try {
      await uploadEvolucaoAnexo({
        patientId: id,
        descricao: descricaoAnexo.trim(),
        file: {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType,
        },
      });

      setSelectedFile(null);
      setDescricaoAnexo('');
      showToast({ message: 'Anexo enviado com sucesso.' });
      await loadData(true);
    } catch (err) {
      showToast({ message: getErrorMessage(err, 'Não foi possível enviar o anexo.') });
    } finally {
      setUploadingAnexo(false);
    }
  }, [canCreateAnexo, canCreateEvolucao, descricaoAnexo, id, loadData, selectedFile, showToast]);

  const handleOpenAnexo = useCallback(
    async (anexoId: string) => {
      try {
        const url = await getAnexoDownloadUrl(anexoId);
        await Linking.openURL(url);
      } catch (err) {
        showToast({ message: getErrorMessage(err, 'Não foi possível abrir o anexo.') });
      }
    },
    [showToast],
  );

  const handleDeleteAnexo = useCallback(
    async (anexoId: string) => {
      if (!canDeleteAnexo) return;

      const confirmed = await showConfirmDialog({
        title: 'Confirmar exclusão',
        message: 'Realmente deseja excluir?',
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
        destructive: true,
      });

      if (!confirmed) return;

      setDeletingAnexoId(anexoId);
      try {
        await deleteAnexo(anexoId);
        setAnexos((current) => current.filter((item) => item.id !== anexoId));
        showToast({ message: 'Anexo excluído com sucesso.' });
      } catch (err) {
        showToast({ message: getErrorMessage(err, 'Não foi possível excluir o anexo.') });
      } finally {
        setDeletingAnexoId(null);
      }
    },
    [canDeleteAnexo, showToast],
  );

  return (
    <AppScreen>
      <PageHeader title="Evolução do paciente" subtitle={nome ? `Paciente: ${nome}` : 'Registro de evolução clínica'} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
        {loading ? (
          <SkeletonBlock lines={8} />
        ) : error ? (
          <ErrorState description={error} onRetry={() => void loadData()} />
        ) : (
          <>
            {!agendamentoIdFromRoute ? (
              <View className="rounded-2xl border border-surface-border bg-surface-card p-4">
                <View className="flex-row items-center justify-between">
                  <AppText className="text-sm font-semibold text-content-primary">Filtro por profissional</AppText>
                  <Pressable
                    onPress={() => void loadData(true)}
                    className="rounded-lg border border-surface-border bg-surface-background px-3 py-2"
                    style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                  >
                    <AppText className="text-xs font-semibold text-content-primary">{refreshing ? 'Atualizando...' : 'Atualizar'}</AppText>
                  </Pressable>
                </View>
                <View className="mt-3">
                  <Select
                    value={selectedProfissionalFilter}
                    onChange={setSelectedProfissionalFilter}
                    options={profissionalFilterOptions}
                    placeholder="Todos os profissionais"
                  />
                </View>
              </View>
            ) : null}

            {canCreateEvolucao || canUpdateEvolucao ? (
              <View className="rounded-2xl border border-surface-border bg-surface-card p-4">
                <AppText className="text-sm font-semibold text-content-primary">
                  {editingEvolucaoId ? 'Editar evolução' : 'Nova evolução'}
                </AppText>

                {isProfissional ? (
                  <View className="mt-3">
                    <Input label="Profissional *" value={currentProfissional?.nome || user?.nome || 'Profissional logado'} editable={false} />
                  </View>
                ) : (
                  <View className="mt-3">
                    <Select
                      label="Profissional *"
                      value={newEvolucaoForm.profissionalId}
                      onChange={(profissionalId) => setNewEvolucaoForm((current) => ({ ...current, profissionalId }))}
                      options={profissionalOptions}
                      placeholder={loadingProfissionais ? 'Carregando profissionais...' : 'Selecione'}
                    />
                  </View>
                )}

                <View className="mt-3">
                  <Input
                    label="Data da evolução *"
                    value={newEvolucaoForm.dataEvolucao}
                    onChangeText={(value) => setNewEvolucaoForm((current) => ({ ...current, dataEvolucao: applyDateMask(value) }))}
                    placeholder="DD-MM-AAAA"
                    keyboardType="number-pad"
                  />
                </View>

                <View className="mt-3">
                  <Input
                    label="Objetivo da sessão *"
                    value={newEvolucaoForm.objetivoSessao}
                    onChangeText={(value) => setNewEvolucaoForm((current) => ({ ...current, objetivoSessao: value }))}
                    placeholder="Informe o objetivo da sessão"
                  />
                </View>

                <View className="mt-3">
                  <Input
                    label="Descrição da evolução *"
                    value={newEvolucaoForm.descricaoEvolucao}
                    onChangeText={(value) => setNewEvolucaoForm((current) => ({ ...current, descricaoEvolucao: value }))}
                    placeholder="Descreva a evolução clínica"
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                  />
                </View>

                <Button
                  className="mt-3"
                  label={editingEvolucaoId ? 'Salvar alterações' : 'Salvar evolução'}
                  onPress={() => void handleSaveEvolucao()}
                  loading={creatingEvolucao}
                />
              </View>
            ) : null}

            {canViewAnexos ? (
              <View className="rounded-2xl border border-surface-border bg-surface-card p-4">
                <AppText className="text-sm font-semibold text-content-primary">Anexos da evolução</AppText>

                {canCreateAnexo && canCreateEvolucao ? (
                  <>
                    <View className="mt-3">
                      <Input
                        label="Descrição do anexo *"
                        value={descricaoAnexo}
                        onChangeText={setDescricaoAnexo}
                        placeholder="Ex.: Laudo, exame, relatório..."
                      />
                    </View>

                    <View className="mt-3 rounded-xl border border-dashed border-surface-border bg-surface-background px-3 py-3">
                      <AppText className="text-xs text-content-secondary">
                        {selectedFile ? `Arquivo: ${selectedFile.name}` : 'Nenhum arquivo selecionado'}
                      </AppText>
                      <View className="mt-2 flex-row gap-2">
                        <Button label={selectedFile ? 'Trocar arquivo' : 'Selecionar arquivo'} size="sm" variant="secondary" onPress={() => void handlePickFile()} />
                        {selectedFile ? <Button label="Remover" size="sm" onPress={() => setSelectedFile(null)} /> : null}
                      </View>
                    </View>

                    <Button
                      className="mt-3"
                      label="Anexar arquivo"
                      onPress={() => void handleUploadAnexo()}
                      loading={uploadingAnexo}
                      disabled={!selectedFile || !descricaoAnexo.trim()}
                    />
                  </>
                ) : (
                  <AppText className="mt-3 text-xs text-content-muted">Você não tem permissão para enviar anexos de evolução.</AppText>
                )}

                <View className="mt-4 gap-2">
                  {anexos.length === 0 ? (
                    <AppText className="text-xs text-content-muted">Nenhum anexo de evolução cadastrado.</AppText>
                  ) : (
                    anexos.map((anexo) => {
                      const sizeLabel = formatBytes((anexo as any).tamanhoBytes);
                      return (
                        <View key={anexo.id} className="rounded-xl border border-surface-border bg-surface-background p-3">
                          <AppText className="text-sm font-semibold text-content-primary">{anexo.nomeArquivo}</AppText>
                          <AppText className="mt-1 text-xs text-content-secondary">{anexo.descricao || 'Sem descrição'}</AppText>
                          {sizeLabel ? <AppText className="mt-1 text-xs text-content-muted">Tamanho: {sizeLabel}</AppText> : null}

                          <View className="mt-3 flex-row gap-2">
                            <Button label="Abrir" size="sm" variant="secondary" className="flex-1" onPress={() => void handleOpenAnexo(anexo.id)} />
                            {canDeleteAnexo ? (
                              <Button
                                label="Excluir"
                                size="sm"
                                className="flex-1"
                                loading={deletingAnexoId === anexo.id}
                                onPress={() => void handleDeleteAnexo(anexo.id)}
                              />
                            ) : null}
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            ) : null}

            <View className="rounded-2xl border border-surface-border bg-surface-card p-4">
              <AppText className="text-sm font-semibold text-content-primary">Evoluções registradas</AppText>

              <View className="mt-3 gap-2">
                {filteredEvolucoes.length === 0 ? (
                  <EmptyState
                    title="Nenhuma evolução encontrada"
                    description="Ainda não há evoluções para os filtros selecionados."
                    ctaLabel="Limpar filtro"
                    onPressCta={() => setSelectedProfissionalFilter('todos')}
                  />
                ) : (
                  filteredEvolucoes.map((evolucao) => (
                    <View key={evolucao.id} className="rounded-xl border border-surface-border bg-surface-background p-3">
                      <View className="flex-row items-center justify-between">
                        <AppText className="text-xs font-semibold text-content-muted">{formatDate(evolucao.dataEvolucao)}</AppText>
                        {canDeleteEvolucao ? (
                          <Button
                            label="Excluir"
                            size="sm"
                            variant="secondary"
                            loading={deletingEvolucaoId === evolucao.id}
                            onPress={() => void handleDeleteEvolucao(evolucao.id)}
                          />
                        ) : null}
                      </View>
                      <AppText className="mt-1 text-sm font-semibold text-content-primary">
                        {evolucao.objetivoSessao || 'Sem objetivo informado'}
                      </AppText>
                      <AppText className="mt-1 text-xs text-content-secondary">
                        Profissional: {evolucao.profissionalNome || 'Não informado'}
                      </AppText>
                      <AppText className="mt-2 text-sm text-content-secondary">
                        {evolucao.descricaoEvolucao || 'Sem descrição da evolução.'}
                      </AppText>
                    </View>
                  ))
                )}
              </View>
            </View>

            {agendamentoIdFromRoute && id ? (
              <Button
                label="Ver todas as evoluções"
                variant="secondary"
                onPress={() => router.push(routes.customerEvolutions(id, nome))}
              />
            ) : null}
          </>
        )}
      </ScrollView>
    </AppScreen>
  );
}



