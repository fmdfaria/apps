import api from './api';
import type { Configuracao } from '@/types/Configuracao';

export interface CreateConfiguracaoData {
  entidadeTipo: string;
  entidadeId?: string | null;
  contexto: string;
  chave: string;
  valor: string;
  tipoValor?: string;
  descricao?: string | null;
  ativo?: boolean;
}

export interface UpdateConfiguracaoData {
  entidadeTipo?: string;
  entidadeId?: string | null;
  contexto?: string;
  chave?: string;
  valor?: string;
  tipoValor?: string;
  descricao?: string | null;
  ativo?: boolean;
}

export interface GetByEntityParams {
  entidadeTipo: string;
  entidadeId?: string;
  contexto?: string;
}

export const getConfiguracoes = async (): Promise<Configuracao[]> => {
  const { data } = await api.get('/configuracoes');
  return data;
};

export const getConfiguracoesByEntity = async (params: GetByEntityParams): Promise<Record<string, any>> => {
  const { data } = await api.get('/configuracoes/entity', { params });
  return data;
};

export const createConfiguracao = async (configuracao: CreateConfiguracaoData): Promise<Configuracao> => {
  const { data } = await api.post('/configuracoes', configuracao);
  return data;
};

export const updateConfiguracao = async (id: string, configuracao: UpdateConfiguracaoData): Promise<Configuracao> => {
  const { data } = await api.put(`/configuracoes/${id}`, configuracao);
  return data;
};

export const deleteConfiguracao = async (id: string): Promise<void> => {
  await api.delete(`/configuracoes/${id}`);
};

/**
 * Verifica se um convênio tem a configuração de pular direto para FINALIZADO
 * quando o status for LIBERADO (sem passar por ATENDIDO)
 *
 * @param convenioId - ID do convênio a ser verificado
 * @returns true se deve pular para FINALIZADO, false caso contrário
 */
export const verificarLiberadoParaFinalizado = async (convenioId: string): Promise<boolean> => {
  try {
    const configuracoes = await getConfiguracoesByEntity({
      entidadeTipo: 'convenio',
      entidadeId: convenioId,
      contexto: 'liberado_para_finalizado'
    });

    // Buscar a chave 'status' no objeto retornado
    const valorConfig = configuracoes?.status;

    // Aceitar tanto string 'true' quanto boolean true
    return valorConfig === 'true' || valorConfig === true;
  } catch (error) {
    console.error('Erro ao verificar configuração liberado_para_finalizado:', error);
    // Default: não pular etapa (comportamento padrão)
    return false;
  }
};