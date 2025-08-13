import api from './api';
import type { Anexo } from '@/types/Anexo';

export const uploadAnexo = async ({ file, descricao, entidadeId, modulo, categoria, criadoPor }: {
  file: File;
  descricao: string;
  entidadeId: string;
  modulo: string;
  categoria: string;
  criadoPor?: string;
}) => {
  const formData = new FormData();
  formData.append('entidadeId', entidadeId);
  formData.append('modulo', modulo);
  formData.append('categoria', categoria);
  formData.append('descricao', descricao);
  if (criadoPor) {
    formData.append('criadoPor', criadoPor);
  }
  formData.append('file', file);

  // ✅ CORREÇÃO CRÍTICA: Remover Content-Type manual - deixar o navegador definir automaticamente
  const { data } = await api.post('/anexos', formData);
  return data;
};

export const getAnexos = async (entidadeId: string): Promise<Anexo[]> => {
  const { data } = await api.get('/anexos', { params: { entidadeId } });
  return data;
};

export const deleteAnexo = async (id: string): Promise<void> => {
  await api.delete(`/anexos/${id}`);
};

export const getAnexoDownloadUrl = async (id: string): Promise<string> => {
  const { data } = await api.get(`/anexos/${id}/download`);
  return data.downloadUrl;
}; 