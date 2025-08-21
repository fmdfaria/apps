import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CreatePacientePedidoUseCase } from '../../../core/application/use-cases/paciente-pedido/CreatePacientePedidoUseCase';
import { ListPacientesPedidosUseCase } from '../../../core/application/use-cases/paciente-pedido/ListPacientesPedidosUseCase';
import { UpdatePacientePedidoUseCase } from '../../../core/application/use-cases/paciente-pedido/UpdatePacientePedidoUseCase';
import { DeletePacientePedidoUseCase } from '../../../core/application/use-cases/paciente-pedido/DeletePacientePedidoUseCase';

const bodySchema = z.object({
  dataPedidoMedico: z.coerce.date().optional().nullable(),
  crm: z.string().optional().nullable(),
  cbo: z.string().optional().nullable(),
  cid: z.string().optional().nullable(),
  autoPedidos: z.boolean().optional().nullable(),
  descricao: z.string().optional().nullable(),
  servicoId: z.string().uuid().optional().nullable(),
});

export class PacientesPedidosController {
  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({
      pacienteId: z.string().uuid(),
    });

    const { pacienteId } = paramsSchema.parse(request.params);
    const data = bodySchema.parse(request.body);
    
    const useCase = container.resolve(CreatePacientePedidoUseCase);
    const pedido = await useCase.execute({ ...data, pacienteId });
    
    return reply.status(201).send(pedido);
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({
      pacienteId: z.string().uuid(),
    });

    const { pacienteId } = paramsSchema.parse(request.params);
    
    const useCase = container.resolve(ListPacientesPedidosUseCase);
    const pedidos = await useCase.execute({ pacienteId });
    
    return reply.status(200).send(pedidos);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({
      pacienteId: z.string().uuid(),
      id: z.string().uuid(),
    });

    const { id } = paramsSchema.parse(request.params);
    const data = bodySchema.parse(request.body);
    
    const useCase = container.resolve(UpdatePacientePedidoUseCase);
    const pedido = await useCase.execute({ id, ...data });
    
    return reply.status(200).send(pedido);
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({
      pacienteId: z.string().uuid(),
      id: z.string().uuid(),
    });

    const { id } = paramsSchema.parse(request.params);
    
    const useCase = container.resolve(DeletePacientePedidoUseCase);
    await useCase.execute({ id });
    
    return reply.status(204).send();
  }
}