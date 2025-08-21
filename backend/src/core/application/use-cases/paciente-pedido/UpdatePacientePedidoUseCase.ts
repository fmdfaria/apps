import { inject, injectable } from 'tsyringe';
import { AppError } from '../../../../shared/errors/AppError';
import { PacientePedido } from '../../../domain/entities/PacientePedido';
import { IPacientesPedidosRepository } from '../../../domain/repositories/IPacientesPedidosRepository';
import { IServicosRepository } from '../../../domain/repositories/IServicosRepository';

interface IRequest {
  id: string;
  dataPedidoMedico?: Date | null;
  crm?: string | null;
  cbo?: string | null;
  cid?: string | null;
  autoPedidos?: boolean | null;
  descricao?: string | null;
  servicoId?: string | null;
}

@injectable()
export class UpdatePacientePedidoUseCase {
  constructor(
    @inject('PacientesPedidosRepository')
    private pacientesPedidosRepository: IPacientesPedidosRepository,
    @inject('ServicosRepository')
    private servicosRepository: IServicosRepository
  ) {}

  async execute({ id, ...data }: IRequest): Promise<PacientePedido> {
    const pedido = await this.pacientesPedidosRepository.findById(id);

    if (!pedido) {
      throw new AppError('Pedido médico não encontrado.', 404);
    }

    // Verificar se o serviço existe (se informado)
    if (data.servicoId) {
      const servico = await this.servicosRepository.findById(data.servicoId);
      if (!servico) {
        throw new AppError('Serviço não encontrado.', 404);
      }
    }

    // Atualizar os dados do pedido
    pedido.dataPedidoMedico = data.dataPedidoMedico;
    pedido.crm = data.crm;
    pedido.cbo = data.cbo;
    pedido.cid = data.cid;
    pedido.autoPedidos = data.autoPedidos;
    pedido.descricao = data.descricao;
    pedido.servicoId = data.servicoId;

    const updatedPedido = await this.pacientesPedidosRepository.save(pedido);

    return updatedPedido;
  }
}