import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CreateBancoUseCase } from '../../../core/application/use-cases/banco/CreateBancoUseCase';
import { ListBancosUseCase } from '../../../core/application/use-cases/banco/ListBancosUseCase';
import { UpdateBancoUseCase } from '../../../core/application/use-cases/banco/UpdateBancoUseCase';
import { DeleteBancoUseCase } from '../../../core/application/use-cases/banco/DeleteBancoUseCase';

export class BancosController {
  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const createBancoBodySchema = z.object({
      codigo: z.string(),
      nome: z.string(),
    });

    const { codigo, nome } = createBancoBodySchema.parse(request.body);

    const createBancoUseCase = container.resolve(CreateBancoUseCase);

    const banco = await createBancoUseCase.execute({
      codigo,
      nome
    });

    return reply.status(201).send(banco);
  }

  async index(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const listBancosUseCase = container.resolve(ListBancosUseCase);

    const bancos = await listBancosUseCase.execute();

    return reply.status(200).send(bancos);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const updateBancoParamsSchema = z.object({
      id: z.string().uuid(),
    });
    const updateBancoBodySchema = z.object({
      codigo: z.string().optional(),
      nome: z.string().optional(),
    });

    const { id } = updateBancoParamsSchema.parse(request.params);
    const { codigo, nome } = updateBancoBodySchema.parse(request.body);

    const updateBancoUseCase = container.resolve(UpdateBancoUseCase);

    const banco = await updateBancoUseCase.execute({
      id,
      codigo,
      nome
    });

    return reply.status(200).send(banco);
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const deleteBancoParamsSchema = z.object({
      id: z.string().uuid(),
    });

    const { id } = deleteBancoParamsSchema.parse(request.params);

    const deleteBancoUseCase = container.resolve(DeleteBancoUseCase);

    await deleteBancoUseCase.execute({ id });

    return reply.status(204).send();
  }
}