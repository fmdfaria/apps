import type { FilaEsperaItem, FilaEsperaOption, FilaEsperaPayload } from '@/features/fila-espera/types';
import { api } from '@/services/api/client';

export async function getFilaEspera(params?: { ativo?: boolean }) {
  const response = await api.get<FilaEsperaItem[]>('/fila-de-espera', { params });
  return response.data;
}

export async function createFilaEspera(payload: FilaEsperaPayload) {
  try {
    const response = await api.post<FilaEsperaItem>('/fila-de-espera', payload);
    return response.data;
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    const horarioOriginal = String(payload.horarioPreferencia || '').toUpperCase();

    if (status !== 400 || !horarioOriginal.startsWith('MANH')) {
      throw error;
    }

    const fallbackHorarios = ['MANHÃƒ', 'MANHÃ', 'MANHA'].filter((value) => value !== payload.horarioPreferencia);

    for (const horarioFallback of fallbackHorarios) {
      try {
        const response = await api.post<FilaEsperaItem>('/fila-de-espera', {
          ...payload,
          horarioPreferencia: horarioFallback,
        });
        return response.data;
      } catch (retryError) {
        const retryStatus = (retryError as { response?: { status?: number } })?.response?.status;
        if (retryStatus !== 400) {
          throw retryError;
        }
      }
    }

    throw error;
  }
}

export async function updateFilaEspera(id: string, payload: FilaEsperaPayload) {
  try {
    const response = await api.put<FilaEsperaItem>(`/fila-de-espera/${id}`, payload);
    return response.data;
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    const horarioOriginal = String(payload.horarioPreferencia || '').toUpperCase();

    if (status !== 400 || !horarioOriginal.startsWith('MANH')) {
      throw error;
    }

    const fallbackHorarios = ['MANHÃƒ', 'MANHÃ', 'MANHA'].filter((value) => value !== payload.horarioPreferencia);

    for (const horarioFallback of fallbackHorarios) {
      try {
        const response = await api.put<FilaEsperaItem>(`/fila-de-espera/${id}`, {
          ...payload,
          horarioPreferencia: horarioFallback,
        });
        return response.data;
      } catch (retryError) {
        const retryStatus = (retryError as { response?: { status?: number } })?.response?.status;
        if (retryStatus !== 400) {
          throw retryError;
        }
      }
    }

    throw error;
  }
}

export async function deleteFilaEspera(id: string) {
  await api.delete(`/fila-de-espera/${id}`);
}

export async function toggleFilaEsperaStatus(id: string, ativo: boolean) {
  const response = await api.patch<FilaEsperaItem>(`/fila-de-espera/${id}/status`, { ativo });
  return response.data;
}

export async function getFilaEsperaFormOptions() {
  const [pacientesResponse, servicosResponse, profissionaisResponse] = await Promise.all([
    api.get<Array<{ id: string; nomeCompleto?: string; ativo?: boolean }>>('/pacientes'),
    api.get<Array<{ id: string; nome?: string; ativo?: boolean }>>('/servicos'),
    api.get<Array<{ id: string; nome?: string; ativo?: boolean }>>('/profissionais'),
  ]);

  const pacientes: FilaEsperaOption[] = (pacientesResponse.data || [])
    .filter((item) => item?.id && item?.nomeCompleto)
    .map((item) => ({ id: item.id, nome: item.nomeCompleto as string }));

  const servicos: FilaEsperaOption[] = (servicosResponse.data || [])
    .filter((item) => item?.id && item?.nome)
    .map((item) => ({ id: item.id, nome: item.nome as string }));

  const profissionais: FilaEsperaOption[] = (profissionaisResponse.data || [])
    .filter((item) => item?.id && item?.nome)
    .map((item) => ({ id: item.id, nome: item.nome as string }));

  return { pacientes, servicos, profissionais };
}
