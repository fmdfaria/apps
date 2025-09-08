import { useState, useEffect, useCallback, useMemo } from 'react';
import { getConfiguracoesByEntity } from '@/services/configuracoes';

export interface ConfiguracoesAtenderPage {
  evolucao: boolean;
  compareceu: boolean;
  assinatura_paciente: boolean;
  assinatura_profissional: boolean;
}

// Função helper para determinar o contexto baseado no tipo de atendimento
const getContextoPorTipoAtendimento = (tipoAtendimento?: string): string => {
  if (tipoAtendimento === 'online') {
    return 'atender_page_online';
  }
  return 'atender_page_presencial'; // Default para presencial
};

// Cache para evitar múltiplas requisições - agora inclui o contexto na chave
const configuracoesCache = new Map<string, { data: ConfiguracoesAtenderPage; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export const useConfiguracoesAtenderPage = (convenioId?: string | null, tipoAtendimento?: string) => {
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesAtenderPage>({
    evolucao: true,
    compareceu: true,
    assinatura_paciente: true,
    assinatura_profissional: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Função para verificar se o cache é válido
  const isCacheValid = useCallback((convenioId: string, tipoAtendimento?: string): boolean => {
    const contexto = getContextoPorTipoAtendimento(tipoAtendimento);
    const cacheKey = `${convenioId}:${contexto}`;
    const cached = configuracoesCache.get(cacheKey);
    if (!cached) return false;
    return Date.now() - cached.timestamp < CACHE_DURATION;
  }, []);

  // Função para buscar configurações da API
  const fetchConfiguracoes = useCallback(async (convenioId: string, tipoAtendimento?: string) => {
    const contexto = getContextoPorTipoAtendimento(tipoAtendimento);
    const cacheKey = `${convenioId}:${contexto}`;
    
    // Verificar cache primeiro
    if (isCacheValid(convenioId, tipoAtendimento)) {
      const cached = configuracoesCache.get(cacheKey)!;
      setConfiguracoes(cached.data);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const configuracoesResponse = await getConfiguracoesByEntity({
        entidadeTipo: 'convenio',
        entidadeId: convenioId,
        contexto: contexto
      });

      console.log(`Configurações ${contexto} para convênio`, convenioId, ':', configuracoesResponse);

      // Parse das configurações para boolean - aceita tanto boolean quanto string
      const novasConfiguracoes: ConfiguracoesAtenderPage = {
        evolucao: Boolean(configuracoesResponse['evolucao'] === true || configuracoesResponse['evolucao'] === 'true'),
        compareceu: Boolean(configuracoesResponse['compareceu'] === true || configuracoesResponse['compareceu'] === 'true'),
        assinatura_paciente: Boolean(configuracoesResponse['assinatura_paciente'] === true || configuracoesResponse['assinatura_paciente'] === 'true'),
        assinatura_profissional: Boolean(configuracoesResponse['assinatura_profissional'] === true || configuracoesResponse['assinatura_profissional'] === 'true'),
      };

      // Se nenhuma configuração foi encontrada, assumir que todos estão habilitados
      const hasAnyConfig = Object.keys(configuracoesResponse).length > 0;
      const configuracoesFinais = hasAnyConfig ? novasConfiguracoes : {
        evolucao: true,
        compareceu: true,
        assinatura_paciente: true,
        assinatura_profissional: true,
      };

      console.log(`Configurações parseadas ${contexto}:`, configuracoesFinais);
      
      setConfiguracoes(configuracoesFinais);
      
      // Salvar no cache
      configuracoesCache.set(cacheKey, {
        data: configuracoesFinais,
        timestamp: Date.now()
      });

    } catch (err: any) {
      console.warn('Erro ao carregar configurações AtenderPage do convênio:', err);
      // Em caso de erro, manter todos os botões habilitados por segurança
      const configuracoesDefault = {
        evolucao: true,
        compareceu: true,
        assinatura_paciente: true,
        assinatura_profissional: true,
      };
      setConfiguracoes(configuracoesDefault);
      setError(err.message || 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, [isCacheValid]);

  useEffect(() => {
    if (convenioId) {
      fetchConfiguracoes(convenioId, tipoAtendimento);
    } else {
      // Se não há convênio, todos os botões ficam habilitados
      setConfiguracoes({
        evolucao: true,
        compareceu: true,
        assinatura_paciente: true,
        assinatura_profissional: true,
      });
      setLoading(false);
      setError(null);
    }
  }, [convenioId, tipoAtendimento, fetchConfiguracoes]);

  // Função para limpar o cache (útil para testes ou atualizações)
  const clearCache = useCallback(() => {
    configuracoesCache.clear();
  }, []);

  // Função para verificar se algum botão está desabilitado
  const hasDisabledButtons = useMemo(() => {
    return !configuracoes.evolucao || 
           !configuracoes.compareceu || 
           !configuracoes.assinatura_paciente || 
           !configuracoes.assinatura_profissional;
  }, [configuracoes]);

  return {
    configuracoes,
    loading,
    error,
    hasDisabledButtons,
    clearCache
  };
};

// Interface para agendamento com informações mínimas necessárias
interface AgendamentoInfo {
  id: string;
  convenioId: string;
  tipoAtendimento: string;
}

// Hook para usar com múltiplos agendamentos (útil para listas)
export const useMultipleConfiguracoesAtenderPage = (agendamentos: AgendamentoInfo[]) => {
  const [configuracoesMap, setConfiguracoesMap] = useState<Map<string, ConfiguracoesAtenderPage>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMultipleConfiguracoes = async () => {
      if (agendamentos.length === 0) {
        setConfiguracoesMap(new Map());
        return;
      }

      setLoading(true);
      setError(null);
      
      const newMap = new Map<string, ConfiguracoesAtenderPage>();
      
      try {
        // Criar mapa de convênio + contexto para evitar requisições duplicadas
        const configuracoesUniques = new Map<string, { convenioId: string; tipoAtendimento: string }>();
        
        agendamentos.forEach(agendamento => {
          const contexto = getContextoPorTipoAtendimento(agendamento.tipoAtendimento);
          const key = `${agendamento.convenioId}:${contexto}`;
          if (!configuracoesUniques.has(key)) {
            configuracoesUniques.set(key, {
              convenioId: agendamento.convenioId,
              tipoAtendimento: agendamento.tipoAtendimento
            });
          }
        });

        // Buscar configurações para cada combinação única de convênio + tipo
        const promises = Array.from(configuracoesUniques.values()).map(async ({ convenioId, tipoAtendimento }) => {
          const contexto = getContextoPorTipoAtendimento(tipoAtendimento);
          const cacheKey = `${convenioId}:${contexto}`;
          
          // Verificar cache primeiro
          const cached = configuracoesCache.get(cacheKey);
          if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            return { cacheKey, configuracoes: cached.data };
          }

          try {
            const configuracoesResponse = await getConfiguracoesByEntity({
              entidadeTipo: 'convenio',
              entidadeId: convenioId,
              contexto: contexto
            });

            const configuracoes: ConfiguracoesAtenderPage = {
              evolucao: Boolean(configuracoesResponse['evolucao'] === true || configuracoesResponse['evolucao'] === 'true'),
              compareceu: Boolean(configuracoesResponse['compareceu'] === true || configuracoesResponse['compareceu'] === 'true'),
              assinatura_paciente: Boolean(configuracoesResponse['assinatura_paciente'] === true || configuracoesResponse['assinatura_paciente'] === 'true'),
              assinatura_profissional: Boolean(configuracoesResponse['assinatura_profissional'] === true || configuracoesResponse['assinatura_profissional'] === 'true'),
            };

            // Se nenhuma configuração foi encontrada, assumir que todos estão habilitados
            const hasAnyConfig = Object.keys(configuracoesResponse).length > 0;
            const configuracoesFinais = hasAnyConfig ? configuracoes : {
              evolucao: true,
              compareceu: true,
              assinatura_paciente: true,
              assinatura_profissional: true,
            };

            // Salvar no cache
            configuracoesCache.set(cacheKey, {
              data: configuracoesFinais,
              timestamp: Date.now()
            });

            return { cacheKey, configuracoes: configuracoesFinais };
          } catch (err) {
            console.warn(`Erro ao carregar configurações ${contexto} para convênio ${convenioId}:`, err);
            // Em caso de erro, habilitar todos os botões
            const configDefault = {
              evolucao: true,
              compareceu: true,
              assinatura_paciente: true,
              assinatura_profissional: true,
            };
            return { cacheKey, configuracoes: configDefault };
          }
        });

        const results = await Promise.all(promises);
        
        // Criar mapa com configurações para cada agendamento individual
        agendamentos.forEach(agendamento => {
          const contexto = getContextoPorTipoAtendimento(agendamento.tipoAtendimento);
          const cacheKey = `${agendamento.convenioId}:${contexto}`;
          
          // Encontrar a configuração correspondente
          const result = results.find(r => r.cacheKey === cacheKey);
          if (result) {
            newMap.set(agendamento.id, result.configuracoes);
          } else {
            // Fallback: habilitar todos os botões
            newMap.set(agendamento.id, {
              evolucao: true,
              compareceu: true,
              assinatura_paciente: true,
              assinatura_profissional: true,
            });
          }
        });

        setConfiguracoesMap(newMap);
      } catch (err: any) {
        console.error('Erro ao carregar configurações múltiplas:', err);
        setError(err.message || 'Erro ao carregar configurações');
      } finally {
        setLoading(false);
      }
    };

    fetchMultipleConfiguracoes();
  }, [agendamentos]);

  return {
    configuracoesMap,
    loading,
    error
  };
};