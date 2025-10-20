import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { PacientePedido } from '../../../domain/entities/PacientePedido';
import { IPacientesPedidosRepository } from '../../../domain/repositories/IPacientesPedidosRepository';

interface IRequest {
  id: string;
  tipo: '30dias' | '10dias' | 'vencido';
}

@injectable()
export class MarcarPedidoNotificadoUseCase {
  constructor(
    @inject('PacientesPedidosRepository')
    private pacientesPedidosRepository: IPacientesPedidosRepository
  ) {}

  async execute({ id, tipo }: IRequest): Promise<PacientePedido> {
    const pedido = await this.pacientesPedidosRepository.findById(id);

    if (!pedido) {
      throw new AppError('Pedido médico não encontrado.', 404);
    }

    // Marcar como notificado conforme o tipo
    if (tipo === '30dias') {
      pedido.enviado30dias = true;
    } else if (tipo === '10dias') {
      pedido.enviado10dias = true;
    } else if (tipo === 'vencido') {
      pedido.enviadoVencido = true;
    }

    return this.pacientesPedidosRepository.save(pedido);
  }
}
