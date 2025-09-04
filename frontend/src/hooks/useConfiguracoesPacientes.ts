import { useState, useEffect, useCallback } from 'react';
import { getConfiguracoesByEntity } from '@/services/configuracoes';

export interface CamposObrigatoriosPacientes {
  data_nascimento_obrigatorio: boolean;
  cpf_obrigatorio: boolean;
  email_obrigatorio: boolean;
  numero_carteirinha_obrigatorio: boolean;
  nome_responsavel_obrigatorio: boolean;
}

export const useConfiguracoesPacientes = (convenioId?: string | null) => {
  const [camposObrigatorios, setCamposObrigatorios] = useState<CamposObrigatoriosPacientes>({
    data_nascimento_obrigatorio: false,
    cpf_obrigatorio: false,
    email_obrigatorio: false,
    numero_carteirinha_obrigatorio: false,
    nome_responsavel_obrigatorio: false,
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
        contexto: 'pacientes'
      });

      console.log('API Response - Configurações Pacientes:', configuracoes);

      // Parse das configurações para boolean - aceita tanto boolean quanto string, trata undefined como false
      const novosRequisitos: CamposObrigatoriosPacientes = {
        data_nascimento_obrigatorio: Boolean(configuracoes['data_nascimento_obrigatorio'] === true || configuracoes['data_nascimento_obrigatorio'] === 'true'),
        cpf_obrigatorio: Boolean(configuracoes['cpf_obrigatorio'] === true || configuracoes['cpf_obrigatorio'] === 'true'),
        email_obrigatorio: Boolean(configuracoes['email_obrigatorio'] === true || configuracoes['email_obrigatorio'] === 'true'),
        numero_carteirinha_obrigatorio: Boolean(configuracoes['numero_carteirinha_obrigatorio'] === true || configuracoes['numero_carteirinha_obrigatorio'] === 'true'),
        nome_responsavel_obrigatorio: Boolean(configuracoes['nome_responsavel_obrigatorio'] === true || configuracoes['nome_responsavel_obrigatorio'] === 'true'),
      };

      console.log('Campos obrigatórios pacientes parseados:', novosRequisitos);
      setCamposObrigatorios(novosRequisitos);
    } catch (err: any) {
      console.warn('Erro ao carregar configurações do convênio para pacientes:', err);
      // Em caso de erro, manter todos os campos como opcionais
      setCamposObrigatorios({
        data_nascimento_obrigatorio: false,
        cpf_obrigatorio: false,
        email_obrigatorio: false,
        numero_carteirinha_obrigatorio: false,
        nome_responsavel_obrigatorio: false,
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
        data_nascimento_obrigatorio: false,
        cpf_obrigatorio: false,
        email_obrigatorio: false,
        numero_carteirinha_obrigatorio: false,
        nome_responsavel_obrigatorio: false,
      });
    }
  }, [convenioId, fetchConfiguracoes]);

  // Função utilitária para validar o formulário de paciente
  const validarFormularioPaciente = useCallback((form: any): { isValid: boolean; errors: string[] } => {
    console.log('Validando formulário paciente:', { form, camposObrigatorios });
    const errors: string[] = [];

    if (camposObrigatorios.data_nascimento_obrigatorio && !form.dataNascimento?.trim()) {
      errors.push('O campo Data de Nascimento é obrigatório para este convênio.');
    }

    if (camposObrigatorios.cpf_obrigatorio && !form.cpf?.trim()) {
      errors.push('O campo CPF é obrigatório para este convênio.');
    }

    if (camposObrigatorios.email_obrigatorio && !form.email?.trim()) {
      errors.push('O campo E-mail é obrigatório para este convênio.');
    }

    if (camposObrigatorios.numero_carteirinha_obrigatorio && !form.numeroCarteirinha?.trim()) {
      errors.push('O campo Número da Carteirinha é obrigatório para este convênio.');
    }

    if (camposObrigatorios.nome_responsavel_obrigatorio && !form.nomeResponsavel?.trim()) {
      errors.push('O campo Nome do Responsável é obrigatório para este convênio.');
    }

    console.log('Resultado da validação paciente:', { isValid: errors.length === 0, errors });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [camposObrigatorios]);

  return {
    camposObrigatorios,
    loading,
    error,
    validarFormularioPaciente
  };
};