import api from './api';
import type { ContaBancaria, CreateContaBancariaData, UpdateContaBancariaData, ContaBancariaFilters } from '@/types/ContaBancaria';

export const getContasBancarias = async (filters?: ContaBancariaFilters): Promise<ContaBancaria[]> => {
  const params = new URLSearchParams();
  
  if (filters?.empresaId) {
    params.append('empresaId', filters.empresaId);
  }
  if (filters?.ativo !== undefined) {
    params.append('ativo', String(filters.ativo));
  }
  if (filters?.contaPrincipal !== undefined) {
    params.append('contaPrincipal', String(filters.contaPrincipal));
  }
  
  const queryString = params.toString();
  const url = queryString ? `/contas-bancarias?${queryString}` : '/contas-bancarias';
  
  const { data } = await api.get(url);
  return data.data;
};

export const getContasBancariasAtivas = async (): Promise<ContaBancaria[]> => {
  return getContasBancarias({ ativo: true });
};

export const getContasBancariasByEmpresa = async (empresaId: string): Promise<ContaBancaria[]> => {
  return getContasBancarias({ empresaId, ativo: true });
};

export const getContaPrincipalByEmpresa = async (empresaId: string): Promise<ContaBancaria | null> => {
  const contas = await getContasBancarias({ empresaId, contaPrincipal: true, ativo: true });
  return contas.length > 0 ? contas[0] : null;
};

export const getContaBancariaById = async (id: string): Promise<ContaBancaria> => {
  const { data } = await api.get(`/contas-bancarias/${id}`);
  return data.data;
};

export const createContaBancaria = async (conta: CreateContaBancariaData): Promise<ContaBancaria> => {
  const { data } = await api.post('/contas-bancarias', conta);
  return data.data;
};

export const updateContaBancaria = async (id: string, conta: UpdateContaBancariaData): Promise<ContaBancaria> => {
  const { data } = await api.put(`/contas-bancarias/${id}`, conta);
  return data.data;
};

export const deleteContaBancaria = async (id: string): Promise<void> => {
  await api.delete(`/contas-bancarias/${id}`);
};

export const atualizarSaldoContaBancaria = async (id: string, saldo: number): Promise<void> => {
  await api.patch(`/contas-bancarias/${id}/saldo`, { saldo });
};