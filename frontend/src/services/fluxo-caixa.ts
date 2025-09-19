import api from './api';
import type { 
  FluxoCaixa, 
  CreateFluxoCaixaData, 
  UpdateFluxoCaixaData, 
  ConciliarMovimentoData, 
  FluxoCaixaFilters,
  DashboardFluxoCaixa 
} from '@/types/FluxoCaixa';

export const getFluxoCaixa = async (filters?: FluxoCaixaFilters): Promise<FluxoCaixa[]> => {
  const params = new URLSearchParams();
  
  if (filters?.empresaId) {
    params.append('empresaId', filters.empresaId);
  }
  if (filters?.contaBancariaId) {
    params.append('contaBancariaId', filters.contaBancariaId);
  }
  if (filters?.tipo) {
    params.append('tipo', filters.tipo);
  }
  if (filters?.categoriaId) {
    params.append('categoriaId', filters.categoriaId);
  }
  if (filters?.dataMovimentoInicio) {
    params.append('dataMovimentoInicio', filters.dataMovimentoInicio);
  }
  if (filters?.dataMovimentoFim) {
    params.append('dataMovimentoFim', filters.dataMovimentoFim);
  }
  if (filters?.conciliado !== undefined) {
    params.append('conciliado', filters.conciliado.toString());
  }
  
  const queryString = params.toString();
  const url = queryString ? `/fluxo-caixa?${queryString}` : '/fluxo-caixa';
  
  const { data } = await api.get(url);
  return data.data;
};

export const getFluxoCaixaById = async (id: string): Promise<FluxoCaixa> => {
  const { data } = await api.get(`/fluxo-caixa/${id}`);
  return data.data;
};

export const createFluxoCaixa = async (movimento: CreateFluxoCaixaData): Promise<FluxoCaixa> => {
  const { data } = await api.post('/fluxo-caixa', movimento);
  return data.data;
};

export const updateFluxoCaixa = async (id: string, movimento: UpdateFluxoCaixaData): Promise<FluxoCaixa> => {
  const { data } = await api.put(`/fluxo-caixa/${id}`, movimento);
  return data.data;
};

export const deleteFluxoCaixa = async (id: string): Promise<void> => {
  await api.delete(`/fluxo-caixa/${id}`);
};

export const conciliarMovimento = async (id: string, dados: ConciliarMovimentoData): Promise<FluxoCaixa> => {
  const { data } = await api.post(`/fluxo-caixa/${id}/conciliar`, dados);
  return data.data;
};

export const getFluxoCaixaPorPeriodo = async (
  empresaId: string,
  dataInicio: string,
  dataFim: string
): Promise<any> => {
  const { data } = await api.get('/fluxo-caixa/periodo', {
    params: { empresaId, dataInicio, dataFim }
  });
  return data.data;
};

export const getDashboardFluxoCaixa = async (
  empresaId: string,
  dataInicio: string,
  dataFim: string
): Promise<DashboardFluxoCaixa> => {
  const { data } = await api.get('/fluxo-caixa/dashboard', {
    params: { empresaId, dataInicio, dataFim }
  });
  return data.data;
};