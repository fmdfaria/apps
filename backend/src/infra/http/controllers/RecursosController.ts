import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CreateRecursoUseCase } from '../../../core/application/use-cases/recurso/CreateRecursoUseCase';
import { ListRecursosUseCase } from '../../../core/application/use-cases/recurso/ListRecursosUseCase';
import { ListRecursosByDateUseCase } from '../../../core/application/use-cases/recurso/ListRecursosByDateUseCase';
import { UpdateRecursoUseCase } from '../../../core/application/use-cases/recurso/UpdateRecursoUseCase';
import { DeleteRecursoUseCase } from '../../../core/application/use-cases/recurso/DeleteRecursoUseCase';

export class RecursosController {
  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const createRecursoBodySchema = z.object({
      nome: z.string(),
      descricao: z.string().optional(),
    });

    const { nome, descricao } = createRecursoBodySchema.parse(request.body);

    const createRecursoUseCase = container.resolve(CreateRecursoUseCase);

    const recurso = await createRecursoUseCase.execute({ nome, descricao });

    return reply.status(201).send(recurso);
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const listRecursosUseCase = container.resolve(ListRecursosUseCase);

    const recursos = await listRecursosUseCase.execute();

    return reply.status(200).send(recursos);
  }

  async listByDate(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const listRecursosByDateQuerySchema = z.object({
      data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
    });

    const { data } = listRecursosByDateQuerySchema.parse(request.query);

    const listRecursosByDateUseCase = container.resolve(ListRecursosByDateUseCase);

    const recursos = await listRecursosByDateUseCase.execute({ data });

    return reply.status(200).send(recursos);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const updateRecursoParamsSchema = z.object({
      id: z.string().uuid(),
    });
    const updateRecursoBodySchema = z.object({
      nome: z.string(),
      descricao: z.string().optional(),
    });

    const { id } = updateRecursoParamsSchema.parse(request.params);
    const { nome, descricao } = updateRecursoBodySchema.parse(request.body);

    const updateRecursoUseCase = container.resolve(UpdateRecursoUseCase);

    const recurso = await updateRecursoUseCase.execute({ id, nome, descricao });

    return reply.status(200).send(recurso);
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const deleteRecursoParamsSchema = z.object({
      id: z.string().uuid(),
    });

    const { id } = deleteRecursoParamsSchema.parse(request.params);

    const deleteRecursoUseCase = container.resolve(DeleteRecursoUseCase);

    await deleteRecursoUseCase.execute({ id });

    return reply.status(204).send();
  }
} 