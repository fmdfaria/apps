import api from './api';
import type { Empresa, CreateEmpresaData, UpdateEmpresaData, EmpresaFilters } from '@/types/Empresa';

export const getEmpresas = async (filters?: EmpresaFilters): Promise<Empresa[]> => {
  const params = new URLSearchParams();
  
  if (filters?.ativo !== undefined) {
    params.append('ativo', String(filters.ativo));
  }
  if (filters?.empresaPrincipal !== undefined) {
    params.append('empresaPrincipal', String(filters.empresaPrincipal));
  }
  
  const queryString = params.toString();
  const url = queryString ? `/empresas?${queryString}` : '/empresas';
  
  const { data } = await api.get(url);
  return data.data;
};

export const getEmpresasAtivas = async (): Promise<Empresa[]> => {
  return getEmpresas({ ativo: true });
};

export const getEmpresaPrincipal = async (): Promise<Empresa | null> => {
  const empresas = await getEmpresas({ empresaPrincipal: true });
  return empresas.length > 0 ? empresas[0] : null;
};

export const getEmpresaById = async (id: string): Promise<Empresa> => {
  const { data } = await api.get(`/empresas/${id}`);
  return data.data;
};

export const createEmpresa = async (empresa: CreateEmpresaData): Promise<Empresa> => {
  const { data } = await api.post('/empresas', empresa);
  return data.data;
};

export const updateEmpresa = async (id: string, empresa: UpdateEmpresaData): Promise<Empresa> => {
  const { data } = await api.put(`/empresas/${id}`, empresa);
  return data.data;
};

export const deleteEmpresa = async (id: string): Promise<void> => {
  await api.delete(`/empresas/${id}`);
};

export const updateEmpresaStatus = async (id: string, ativo: boolean): Promise<Empresa> => {
  const { data } = await api.patch(`/empresas/${id}/status`, { ativo });
  return data.data;
};