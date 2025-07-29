import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CreateConvenioUseCase } from '../../../core/application/use-cases/convenio/CreateConvenioUseCase';
import { ListConveniosUseCase } from '../../../core/application/use-cases/convenio/ListConveniosUseCase';
import { UpdateConvenioUseCase } from '../../../core/application/use-cases/convenio/UpdateConvenioUseCase';
import { DeleteConvenioUseCase } from '../../../core/application/use-cases/convenio/DeleteConvenioUseCase';

export class ConveniosController {
  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const createBodySchema = z.object({
      nome: z.string().min(3),
    });
    const { nome } = createBodySchema.parse(request.body);
    const useCase = container.resolve(CreateConvenioUseCase);
    const convenio = await useCase.execute({ nome });
    return reply.status(201).send(convenio);
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const useCase = container.resolve(ListConveniosUseCase);
    const convenios = await useCase.execute();
    return reply.status(200).send(convenios);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const updateParamsSchema = z.object({ id: z.string().uuid() });
    const updateBodySchema = z.object({
      nome: z.string().min(3),
    });
    const { id } = updateParamsSchema.parse(request.params);
    const { nome } = updateBodySchema.parse(request.body);
    const useCase = container.resolve(UpdateConvenioUseCase);
    const convenio = await useCase.execute({ id, nome });
    return reply.status(200).send(convenio);
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const deleteParamsSchema = z.object({ id: z.string().uuid() });
    const { id } = deleteParamsSchema.parse(request.params);
    const useCase = container.resolve(DeleteConvenioUseCase);
    await useCase.execute({ id });
    return reply.status(204).send();
  }
} 