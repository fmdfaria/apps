import { api } from '@/services/api/client';
import type {
  Anexo,
  CreateEvolucaoPacientePayload,
  Convenio,
  CreatePacientePedidoPayload,
  CreatePatientPayload,
  EvolucaoPaciente,
  PaginatedPatientsResponse,
  PacientePedido,
  Patient,
  ProfissionalOption,
  UpdatePacientePedidoPayload,
  UpdatePatientPayload,
  UpdateEvolucaoPacientePayload,
} from '@/features/customers/types';

export async function getPatients() {
  const response = await api.get<Patient[]>('/pacientes');
  return response.data;
}

type GetPatientsPaginatedParams = {
  page?: number;
  limit?: number;
  search?: string;
};

export async function getPatientsPaginated(params: GetPatientsPaginatedParams) {
  const response = await api.get<PaginatedPatientsResponse>('/pacientes', {
    params,
  });

  return response.data;
}

export async function getPatientById(id: string) {
  const response = await api.get<Patient>(`/pacientes/${id}`);
  return response.data;
}

export async function createPatient(payload: CreatePatientPayload) {
  const response = await api.post<Patient>('/pacientes', payload);
  return response.data;
}

export async function updatePatient(id: string, payload: UpdatePatientPayload) {
  const response = await api.put<Patient>(`/pacientes/${id}`, payload);
  return response.data;
}

export async function togglePatientStatus(id: string, ativo: boolean) {
  const response = await api.patch<Patient>(`/pacientes/${id}/status`, { ativo });
  return response.data;
}

export async function getConvenios() {
  const response = await api.get<Convenio[]>('/convenios');
  return response.data;
}

type UploadAnexoInput = {
  entityId: string;
  modulo: 'pacientes' | 'evolucoes';
  descricao: string;
  file: {
    uri: string;
    name: string;
    type?: string;
  };
};

async function uploadAnexo({ entityId, modulo, descricao, file }: UploadAnexoInput) {
  const formData = new FormData();
  formData.append('entidadeId', entityId);
  formData.append('modulo', modulo);
  formData.append('categoria', 'documentos');
  formData.append('descricao', descricao);
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type || 'application/octet-stream',
  } as any);

  const response = await api.post<Anexo>('/anexos', formData);
  return response.data;
}

export async function getPatientAnexos(patientId: string) {
  const response = await api.get<Anexo[]>('/anexos', {
    params: {
      entidadeId: patientId,
      modulo: 'pacientes',
    },
  });

  return response.data;
}

type UploadPatientAnexoInput = {
  patientId: string;
  descricao: string;
  file: {
    uri: string;
    name: string;
    type?: string;
  };
};

export async function uploadPatientAnexo({ patientId, descricao, file }: UploadPatientAnexoInput) {
  return uploadAnexo({
    entityId: patientId,
    modulo: 'pacientes',
    descricao,
    file,
  });
}

export async function getEvolucaoAnexos(patientId: string) {
  const response = await api.get<Anexo[]>('/anexos', {
    params: {
      entidadeId: patientId,
      modulo: 'evolucoes',
    },
  });

  return response.data;
}

type UploadEvolucaoAnexoInput = {
  patientId: string;
  descricao: string;
  file: {
    uri: string;
    name: string;
    type?: string;
  };
};

export async function uploadEvolucaoAnexo({ patientId, descricao, file }: UploadEvolucaoAnexoInput) {
  return uploadAnexo({
    entityId: patientId,
    modulo: 'evolucoes',
    descricao,
    file,
  });
}

export async function deleteAnexo(id: string) {
  await api.delete(`/anexos/${id}`);
}

export async function getAnexoDownloadUrl(id: string) {
  const response = await api.get<{ downloadUrl: string }>(`/anexos/${id}/download`);
  return response.data.downloadUrl;
}

export async function getPatientEvolucoes(patientId: string) {
  const response = await api.get<EvolucaoPaciente[]>('/evolucoes', {
    params: {
      pacienteId: patientId,
    },
  });

  return response.data;
}

export async function createPatientEvolucao(payload: CreateEvolucaoPacientePayload) {
  const response = await api.post<EvolucaoPaciente>('/evolucoes', payload);
  return response.data;
}

export async function updatePatientEvolucao(id: string, payload: UpdateEvolucaoPacientePayload) {
  const response = await api.put<EvolucaoPaciente>(`/evolucoes/${id}`, payload);
  return response.data;
}

export async function deletePatientEvolucao(id: string) {
  await api.delete(`/evolucoes/${id}`);
}

export async function getProfissionaisOptions() {
  const response = await api.get<Array<{ id: string; nome: string; ativo?: boolean }>>('/profissionais', {
    params: {
      ativo: true,
    },
  });

  return response.data
    .filter((item) => item?.id && item?.nome)
    .map((item) => ({ id: item.id, nome: item.nome } satisfies ProfissionalOption));
}

export async function getPatientPedidos(patientId: string) {
  const response = await api.get<PacientePedido[]>(`/pacientes/${patientId}/pedidos`);
  return response.data;
}

export async function createPatientPedido(patientId: string, payload: CreatePacientePedidoPayload) {
  const response = await api.post<PacientePedido>(`/pacientes/${patientId}/pedidos`, payload);
  return response.data;
}

export async function updatePatientPedido(patientId: string, pedidoId: string, payload: UpdatePacientePedidoPayload) {
  const response = await api.put<PacientePedido>(`/pacientes/${patientId}/pedidos/${pedidoId}`, payload);
  return response.data;
}

export async function deletePatientPedido(patientId: string, pedidoId: string) {
  await api.delete(`/pacientes/${patientId}/pedidos/${pedidoId}`);
}

type ServicoOption = {
  id: string;
  nome: string;
  ativo?: boolean;
};

export async function getServicosOptions() {
  const response = await api.get<ServicoOption[]>('/servicos');
  return response.data.filter((item) => item?.id && item?.nome && item.ativo !== false);
}
