import { useState, useEffect } from 'react';
import { getDisponibilidadesProfissional, createDisponibilidade, updateDisponibilidade, deleteDisponibilidade } from '@/services/disponibilidades';
import type { DisponibilidadeProfissional, CreateDisponibilidadeDto, UpdateDisponibilidadeDto } from '@/types/DisponibilidadeProfissional';

export const useDisponibilidades = (profissionalId?: string) => {
  const [disponibilidades, setDisponibilidades] = useState<DisponibilidadeProfissional[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregarDisponibilidades = async () => {
    if (!profissionalId) {
      setDisponibilidades([]);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const data = await getDisponibilidadesProfissional(profissionalId);
      setDisponibilidades(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao carregar disponibilidades');
      setDisponibilidades([]);
    } finally {
      setLoading(false);
    }
  };

  const criarDisponibilidade = async (data: CreateDisponibilidadeDto) => {
    setLoading(true);
    setError(null);

    try {
      const novaDisponibilidade = await createDisponibilidade(data);
      setDisponibilidades(prev => [...prev, novaDisponibilidade]);
      return novaDisponibilidade;
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'Erro ao criar disponibilidade';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const atualizarDisponibilidade = async (id: string, data: UpdateDisponibilidadeDto) => {
    setLoading(true);
    setError(null);

    try {
      const disponibilidadeAtualizada = await updateDisponibilidade(id, data);
      setDisponibilidades(prev => 
        prev.map(item => item.id === id ? disponibilidadeAtualizada : item)
      );
      return disponibilidadeAtualizada;
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'Erro ao atualizar disponibilidade';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const excluirDisponibilidade = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      await deleteDisponibilidade(id);
      setDisponibilidades(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || 'Erro ao excluir disponibilidade';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const recarregar = () => {
    carregarDisponibilidades();
  };

  useEffect(() => {
    carregarDisponibilidades();
  }, [profissionalId]);

  return {
    disponibilidades,
    loading,
    error,
    criarDisponibilidade,
    atualizarDisponibilidade,
    excluirDisponibilidade,
    recarregar
  };
}; 