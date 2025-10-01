import { PacientePedido } from '../entities/PacientePedido';

export interface IPacientesPedidosRepository {
  create(pedido: PacientePedido): Promise<PacientePedido>;
  findById(id: string): Promise<PacientePedido | null>;
  findByPacienteId(pacienteId: string): Promise<PacientePedido[]>;
  findAll(): Promise<PacientePedido[]>;
  save(pedido: PacientePedido): Promise<PacientePedido>;
  delete(id: string): Promise<void>;
}