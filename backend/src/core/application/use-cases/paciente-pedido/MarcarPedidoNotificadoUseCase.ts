import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { PacientePedido } from '../../../domain/entities/PacientePedido';
import { IPacientesPedidosRepository } from '../../../domain/repositories/IPacientesPedidosRepository';

interface IRequest {
  id: string;
  tipo: '30dias' | '10dias' | 'vencido';
  acao?: 'atribuir' | 'desatribuir';
}

@injectable()
export class MarcarPedidoNotificadoUseCase {
  constructor(
    @inject('PacientesPedidosRepository')
    private pacientesPedidosRepository: IPacientesPedidosRepository
  ) {}

  async execute({ id, tipo, acao = 'atribuir' }: IRequest): Promise<PacientePedido> {
    const pedido = await this.pacientesPedidosRepository.findById(id);

    if (!pedido) {
      throw new AppError('Pedido médico não encontrado.', 404);
    }

    const valorNotificacao = acao === 'atribuir';

    // Atualizar notificação conforme tipo e ação
    if (tipo === '30dias') {
      pedido.enviado30dias = valorNotificacao;
    } else if (tipo === '10dias') {
      pedido.enviado10dias = valorNotificacao;
    } else if (tipo === 'vencido') {
      pedido.enviadoVencido = valorNotificacao;
    }

    return this.pacientesPedidosRepository.save(pedido);
  }
}
