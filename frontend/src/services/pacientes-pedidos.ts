import api from './api';
import type { PacientePedido } from '@/types/PacientePedido';

export interface CreatePacientePedidoData {
  dataPedidoMedico?: string | null;
  crm?: string | null;
  cbo?: string | null;
  cid?: string | null;
  autoPedidos?: boolean;
  descricao?: string | null;
  servicoId?: string | null;
}

export interface UpdatePacientePedidoData {
  dataPedidoMedico?: string | null;
  crm?: string | null;
  cbo?: string | null;
  cid?: string | null;
  autoPedidos?: boolean;
  descricao?: string | null;
  servicoId?: string | null;
}

export const createPacientePedido = async (
  pacienteId: string,
  data: CreatePacientePedidoData
): Promise<PacientePedido> => {
  const response = await api.post(`/pacientes/${pacienteId}/pedidos`, {
    ...data,
    dataPedidoMedico: data.dataPedidoMedico || null,
  });
  return response.data;
};

export const getPacientesPedidos = async (pacienteId: string): Promise<PacientePedido[]> => {
  const response = await api.get(`/pacientes/${pacienteId}/pedidos`);
  return response.data;
};

export const updatePacientePedido = async (
  pacienteId: string,
  pedidoId: string,
  data: UpdatePacientePedidoData
): Promise<PacientePedido> => {
  const response = await api.put(`/pacientes/${pacienteId}/pedidos/${pedidoId}`, {
    ...data,
    dataPedidoMedico: data.dataPedidoMedico || null,
  });
  return response.data;
};

export const deletePacientePedido = async (
  pacienteId: string,
  pedidoId: string
): Promise<void> => {
  await api.delete(`/pacientes/${pacienteId}/pedidos/${pedidoId}`);
};

// Nova rota: listar todos os pedidos (para dashboards)
export const getTodosPedidosMedicos = async (): Promise<PacientePedido[]> => {
  const response = await api.get(`/pacientes/pedidos`);
  return response.data;
};