import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { IPacientesPedidosRepository } from '../../../domain/repositories/IPacientesPedidosRepository';

interface IRequest {
  id: string;
}

@injectable()
export class DeletePacientePedidoUseCase {
  constructor(
    @inject('PacientesPedidosRepository')
    private pacientesPedidosRepository: IPacientesPedidosRepository
  ) {}

  async execute({ id }: IRequest): Promise<void> {
    const pedido = await this.pacientesPedidosRepository.findById(id);

    if (!pedido) {
      throw new AppError('Pedido médico não encontrado.', 404);
    }

    await this.pacientesPedidosRepository.delete(id);
  }
}