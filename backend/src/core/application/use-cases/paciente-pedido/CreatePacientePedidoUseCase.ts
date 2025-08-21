import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { PacientePedido } from '../../../domain/entities/PacientePedido';
import { IPacientesPedidosRepository } from '../../../domain/repositories/IPacientesPedidosRepository';
import { IPacientesRepository } from '../../../domain/repositories/IPacientesRepository';
import { IServicosRepository } from '../../../domain/repositories/IServicosRepository';

interface IRequest {
  dataPedidoMedico?: Date | null;
  crm?: string | null;
  cbo?: string | null;
  cid?: string | null;
  autoPedidos?: boolean | null;
  descricao?: string | null;
  servicoId?: string | null;
  pacienteId: string;
}

@injectable()
export class CreatePacientePedidoUseCase {
  constructor(
    @inject('PacientesPedidosRepository')
    private pacientesPedidosRepository: IPacientesPedidosRepository,
    @inject('PacientesRepository')
    private pacientesRepository: IPacientesRepository,
    @inject('ServicosRepository')
    private servicosRepository: IServicosRepository
  ) {}

  async execute(data: IRequest): Promise<PacientePedido> {
    // Verificar se o paciente existe
    const paciente = await this.pacientesRepository.findById(data.pacienteId);
    if (!paciente) {
      throw new AppError('Paciente não encontrado.', 404);
    }

    // Verificar se o serviço existe (se informado)
    if (data.servicoId) {
      const servico = await this.servicosRepository.findById(data.servicoId);
      if (!servico) {
        throw new AppError('Serviço não encontrado.', 404);
      }
    }

    const pedido = new PacientePedido();
    pedido.dataPedidoMedico = data.dataPedidoMedico;
    pedido.crm = data.crm;
    pedido.cbo = data.cbo;
    pedido.cid = data.cid;
    pedido.autoPedidos = data.autoPedidos ?? true;
    pedido.descricao = data.descricao;
    pedido.servicoId = data.servicoId;
    pedido.pacienteId = data.pacienteId;

    const createdPedido = await this.pacientesPedidosRepository.create(pedido);

    return createdPedido;
  }
}