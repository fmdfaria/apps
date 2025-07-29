import api from './api';
import type { Anexo } from '@/types/Anexo';

export const uploadAnexo = async ({ file, descricao, entidadeId, bucket }: {
  file: File;
  descricao: string;
  entidadeId: string;
  bucket?: string;
}) => {
  const formData = new FormData();
  formData.append('entidadeId', entidadeId);
  formData.append('bucket', bucket || 'pacientes');
  formData.append('descricao', descricao);
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