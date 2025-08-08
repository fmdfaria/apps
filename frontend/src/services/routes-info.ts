import api from './api';
import axios from 'axios';

export interface RouteInfo {
  nome: string;
  descricao: string;
  modulo?: string;
}

export async function getRouteInfo(path: string, method: string): Promise<RouteInfo | null> {
  try {
    // Cria uma instância separada do axios para evitar loops no interceptador
    const routeInfoApi = api.create ? axios.create({
      baseURL: api.defaults.baseURL,
      headers: api.defaults.headers,
    }) : api;
    
    // Adiciona token manualmente se existir
    const token = localStorage.getItem('accessToken');
    const headers: any = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await routeInfoApi.get('/routes/find-by-path', {
      params: { path, method },
      headers
    });
    return response.data;
  } catch (error: any) {
    // Se a rota não for encontrada, retorna null
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}