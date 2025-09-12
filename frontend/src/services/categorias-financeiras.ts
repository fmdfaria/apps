import api from './api';
import type { CategoriaFinanceira, CreateCategoriaFinanceiraData, UpdateCategoriaFinanceiraData, CategoriaFinanceiraFilters } from '@/types/CategoriaFinanceira';

export const getCategoriasFinanceiras = async (filters?: CategoriaFinanceiraFilters): Promise<CategoriaFinanceira[]> => {
  const params = new URLSearchParams();
  
  if (filters?.tipo) {
    params.append('tipo', filters.tipo);
  }
  if (filters?.ativo !== undefined) {
    params.append('ativo', String(filters.ativo));
  }
  
  const queryString = params.toString();
  const url = queryString ? `/categorias-financeiras?${queryString}` : '/categorias-financeiras';
  
  const { data } = await api.get(url);
  return data.data;
};

export const getCategoriasFinanceirasAtivas = async (): Promise<CategoriaFinanceira[]> => {
  return getCategoriasFinanceiras({ ativo: true });
};

export const getCategoriasReceita = async (): Promise<CategoriaFinanceira[]> => {
  return getCategoriasFinanceiras({ tipo: 'RECEITA', ativo: true });
};

export const getCategoriasDespesa = async (): Promise<CategoriaFinanceira[]> => {
  return getCategoriasFinanceiras({ tipo: 'DESPESA', ativo: true });
};

export const getCategoriasByTipo = async (
  tipo: 'RECEITA' | 'DESPESA'
): Promise<CategoriaFinanceira[]> => {
  return getCategoriasFinanceiras({ tipo, ativo: true });
};

export const getCategoriaFinanceiraById = async (id: string): Promise<CategoriaFinanceira> => {
  const { data } = await api.get(`/categorias-financeiras/${id}`);
  return data.data;
};

export const createCategoriaFinanceira = async (categoria: CreateCategoriaFinanceiraData): Promise<CategoriaFinanceira> => {
  const { data } = await api.post('/categorias-financeiras', categoria);
  return data.data;
};

export const updateCategoriaFinanceira = async (id: string, categoria: UpdateCategoriaFinanceiraData): Promise<CategoriaFinanceira> => {
  const { data } = await api.put(`/categorias-financeiras/${id}`, categoria);
  return data.data;
};

export const deleteCategoriaFinanceira = async (id: string): Promise<void> => {
  await api.delete(`/categorias-financeiras/${id}`);
};