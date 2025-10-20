import { inject, injectable } from 'tsyringe';
import { PacientePedido } from '../../../domain/entities/PacientePedido';
import { IPacientesPedidosRepository, TipoNotificacao } from '../../../domain/repositories/IPacientesPedidosRepository';

interface IRequest {
  tipo: TipoNotificacao;
}

@injectable()
export class ListPedidosPorVencimentoUseCase {
  constructor(
    @inject('PacientesPedidosRepository')
    private pacientesPedidosRepository: IPacientesPedidosRepository
  ) {}

  async execute({ tipo }: IRequest): Promise<PacientePedido[]> {
    return this.pacientesPedidosRepository.findPedidosPorVencimento(tipo);
  }
}
