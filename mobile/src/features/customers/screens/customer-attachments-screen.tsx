import * as DocumentPicker from 'expo-document-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonBlock } from '@/components/feedback/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { showConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/context/auth-context';
import { hasRoutePermission } from '@/features/auth/permissions';
import {
  deleteAnexo,
  getAnexoDownloadUrl,
  getPatientAnexos,
  uploadPatientAnexo,
} from '@/features/customers/services/patients-api';
import type { Anexo } from '@/features/customers/types';
import { useToast } from '@/providers/toast-provider';

type PickedFile = {
  uri: string;
  name: string;
  mimeType?: string;
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

function formatBytes(bytes?: number | null) {
  if (!bytes || Number.isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CustomerAttachmentsScreen() {
  const { id, nome } = useLocalSearchParams<{ id: string; nome?: string }>();
  const { permissions } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anexos, setAnexos] = useState<Anexo[]>([]);

  const [selectedFile, setSelectedFile] = useState<PickedFile | null>(null);
  const [descricao, setDescricao] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deletingAnexoId, setDeletingAnexoId] = useState<string | null>(null);

  const canViewAnexos = useMemo(() => hasRoutePermission(permissions, { path: '/anexos', method: 'GET' }), [permissions]);
  const canCreateAnexo = useMemo(() => hasRoutePermission(permissions, { path: '/anexos', method: 'POST' }), [permissions]);
  const canDeleteAnexo = useMemo(
    () => hasRoutePermission(permissions, { path: '/anexos/:id', method: 'DELETE' }),
    [permissions],
  );

  const loadAnexos = useCallback(
    async (isRefresh = false) => {
      if (!id) {
        setError('Paciente inválido.');
        setLoading(false);
        return;
      }

      if (!canViewAnexos) {
        setError('Você não tem permissão para visualizar anexos.');
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
        const data = await getPatientAnexos(id);
        setAnexos(Array.isArray(data) ? data.filter((item) => !item.bucket || item.bucket === 'pacientes') : []);
      } catch (err) {
        setError(getErrorMessage(err, 'Não foi possível carregar os anexos.'));
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [canViewAnexos, id],
  );

  useEffect(() => {
    void loadAnexos();
  }, [loadAnexos]);

  const handlePickFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets.length) {
        return;
      }

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

  const handleUpload = useCallback(async () => {
    if (!id || !canCreateAnexo) {
      return;
    }

    if (!selectedFile) {
      showToast({ message: 'Selecione um arquivo para enviar.' });
      return;
    }

    const descricaoLimpa = descricao.trim();
    if (!descricaoLimpa) {
      showToast({ message: 'Informe uma descrição para o anexo.' });
      return;
    }

    setUploading(true);
    try {
      await uploadPatientAnexo({
        patientId: id,
        descricao: descricaoLimpa,
        file: {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType,
        },
      });
      setSelectedFile(null);
      setDescricao('');
      showToast({ message: 'Anexo enviado com sucesso.' });
      await loadAnexos(true);
    } catch (err) {
      showToast({ message: getErrorMessage(err, 'Não foi possível enviar o anexo.') });
    } finally {
      setUploading(false);
    }
  }, [canCreateAnexo, descricao, id, loadAnexos, selectedFile, showToast]);

  const handleOpenDownload = useCallback(
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

  const confirmDeleteAnexo = useCallback(
    (anexoId: string) => {
      if (!canDeleteAnexo) {
        return;
      }

      void (async () => {
        const confirmed = await showConfirmDialog({
          title: 'Confirmar exclusão',
          message: 'Realmente deseja excluir?',
          confirmText: 'Excluir',
          cancelText: 'Cancelar',
          destructive: true,
        });

        if (!confirmed) {
          return;
        }

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
      })();
    },
    [canDeleteAnexo, showToast],
  );

  return (
    <AppScreen>
      <PageHeader title="Gerenciar anexos" subtitle={nome ? `Paciente: ${nome}` : 'Anexos do paciente'} />

      {canCreateAnexo ? (
        <View className="mt-3 rounded-2xl border border-surface-border bg-surface-card p-4">
          <AppText className="text-sm font-semibold text-content-primary">Novo anexo</AppText>

          <View className="mt-3">
            <Input
              label="Descrição *"
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Ex.: Pedido médico, laudo, relatório..."
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
            label="Enviar anexo"
            onPress={() => void handleUpload()}
            loading={uploading}
            disabled={!selectedFile || !descricao.trim()}
          />
        </View>
      ) : null}

      <View className="mt-3 flex-1">
        {loading ? (
          <SkeletonBlock lines={6} />
        ) : error ? (
          <ErrorState description={error} onRetry={() => void loadAnexos()} />
        ) : anexos.length === 0 ? (
          <EmptyState
            title="Nenhum anexo encontrado"
            description="Ainda não há anexos cadastrados para este paciente."
            ctaLabel="Atualizar"
            onPressCta={() => void loadAnexos(true)}
          />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 24 }}>
            {anexos.map((anexo) => {
              const sizeLabel = formatBytes((anexo as any).tamanhoBytes);
              return (
                <View key={anexo.id} className="rounded-xl border border-surface-border bg-surface-card p-3">
                  <AppText className="text-sm font-semibold text-content-primary">{anexo.nomeArquivo}</AppText>
                  <AppText className="mt-1 text-xs text-content-secondary">{anexo.descricao || 'Sem descrição'}</AppText>
                  {sizeLabel ? <AppText className="mt-1 text-xs text-content-muted">Tamanho: {sizeLabel}</AppText> : null}

                  <View className="mt-3 flex-row gap-2">
                    <Button label="Abrir" size="sm" variant="secondary" className="flex-1" onPress={() => void handleOpenDownload(anexo.id)} />
                    {canDeleteAnexo ? (
                      <Button
                        label="Excluir"
                        size="sm"
                        className="flex-1 bg-red-600"
                        loading={deletingAnexoId === anexo.id}
                        onPress={() => confirmDeleteAnexo(anexo.id)}
                      />
                    ) : null}
                  </View>
                </View>
              );
            })}

            <Pressable
              onPress={() => void loadAnexos(true)}
              className="items-center rounded-xl border border-surface-border bg-surface-background px-4 py-3"
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <AppText className="text-sm font-semibold text-content-primary">{refreshing ? 'Atualizando...' : 'Atualizar anexos'}</AppText>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </AppScreen>
  );
}
