import { useState, useEffect, useCallback } from 'react';
import { getConfiguracoesByEntity } from '@/services/configuracoes';

export interface CamposObrigatorios {
  servico_obrigatorio: boolean;
  data_pedido_obrigatorio: boolean;
  crm_obrigatorio: boolean;
  cbo_obrigatorio: boolean;
  cid_obrigatorio: boolean;
}

export const useConfiguracoesConvenio = (convenioId?: string | null) => {
  const [camposObrigatorios, setCamposObrigatorios] = useState<CamposObrigatorios>({
    servico_obrigatorio: false,
    data_pedido_obrigatorio: false,
    crm_obrigatorio: false,
    cbo_obrigatorio: false,
    cid_obrigatorio: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfiguracoes = useCallback(async (convenioId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const configuracoes = await getConfiguracoesByEntity({
        entidadeTipo: 'convenio',
        entidadeId: convenioId,
        contexto: 'pedidos_medicos'
      });

      console.log('API Response - Configurações:', configuracoes);

      // Parse das configurações para boolean - aceita tanto boolean quanto string, trata undefined como false
      const novosRequisitos: CamposObrigatorios = {
        servico_obrigatorio: Boolean(configuracoes['servico_obrigatorio'] === true || configuracoes['servico_obrigatorio'] === 'true'),
        data_pedido_obrigatorio: Boolean(configuracoes['data_pedido_obrigatorio'] === true || configuracoes['data_pedido_obrigatorio'] === 'true'),
        crm_obrigatorio: Boolean(configuracoes['crm_obrigatorio'] === true || configuracoes['crm_obrigatorio'] === 'true'),
        cbo_obrigatorio: Boolean(configuracoes['cbo_obrigatorio'] === true || configuracoes['cbo_obrigatorio'] === 'true'),
        cid_obrigatorio: Boolean(configuracoes['cid_obrigatorio'] === true || configuracoes['cid_obrigatorio'] === 'true'),
      };

      console.log('Campos obrigatórios parseados:', novosRequisitos);
      setCamposObrigatorios(novosRequisitos);
    } catch (err: any) {
      console.warn('Erro ao carregar configurações do convênio:', err);
      // Em caso de erro, manter todos os campos como opcionais
      setCamposObrigatorios({
        servico_obrigatorio: false,
        data_pedido_obrigatorio: false,
        crm_obrigatorio: false,
        cbo_obrigatorio: false,
        cid_obrigatorio: false,
      });
      setError(err.message || 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (convenioId) {
      fetchConfiguracoes(convenioId);
    } else {
      // Se não há convênio, todos os campos são opcionais
      setCamposObrigatorios({
        servico_obrigatorio: false,
        data_pedido_obrigatorio: false,
        crm_obrigatorio: false,
        cbo_obrigatorio: false,
        cid_obrigatorio: false,
      });
    }
  }, [convenioId, fetchConfiguracoes]);

  // Função utilitária para validar o formulário
  const validarFormulario = useCallback((form: any): { isValid: boolean; errors: string[] } => {
    console.log('Validando formulário:', { form, camposObrigatorios });
    const errors: string[] = [];

    if (camposObrigatorios.servico_obrigatorio && !form.servicoId?.trim()) {
      errors.push('O campo Serviço é obrigatório para este convênio.');
    }

    if (camposObrigatorios.data_pedido_obrigatorio && !form.dataPedidoMedico?.trim()) {
      errors.push('O campo Data do Pedido Médico é obrigatório para este convênio.');
    }

    if (camposObrigatorios.crm_obrigatorio && !form.crm?.trim()) {
      errors.push('O campo CRM é obrigatório para este convênio.');
    }

    if (camposObrigatorios.cbo_obrigatorio && !form.cbo?.trim()) {
      errors.push('O campo CBO é obrigatório para este convênio.');
    }

    if (camposObrigatorios.cid_obrigatorio && !form.cid?.trim()) {
      errors.push('O campo CID é obrigatório para este convênio.');
    }

    console.log('Resultado da validação:', { isValid: errors.length === 0, errors });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [camposObrigatorios]);

  return {
    camposObrigatorios,
    loading,
    error,
    validarFormulario
  };
};