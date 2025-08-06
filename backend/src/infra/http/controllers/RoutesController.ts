import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CreateRouteUseCase } from '../../../core/application/use-cases/route/CreateRouteUseCase';
import { ListRoutesUseCase } from '../../../core/application/use-cases/route/ListRoutesUseCase';
import { UpdateRouteUseCase } from '../../../core/application/use-cases/route/UpdateRouteUseCase';
import { DeleteRouteUseCase } from '../../../core/application/use-cases/route/DeleteRouteUseCase';

export class RoutesController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const bodySchema = z.object({
      path: z.string().min(1),
      method: z.string().min(1),
      nome: z.string().min(1),
      descricao: z.string().optional(),
      modulo: z.string().optional(),
    });

    const { path, method, nome, descricao, modulo } = bodySchema.parse(request.body);

    const useCase = container.resolve(CreateRouteUseCase);
    const route = await useCase.execute({ path, method, nome, descricao, modulo });

    return reply.status(201).send(route);
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const querySchema = z.object({
      onlyActive: z.string().optional().transform((val) => val === 'true'),
      modulo: z.string().optional(),
    });

    const { onlyActive, modulo } = querySchema.parse(request.query);

    const useCase = container.resolve(ListRoutesUseCase);
    const routes = await useCase.execute({ onlyActive, modulo });

    return reply.send(routes);
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const bodySchema = z.object({
      path: z.string().min(1).optional(),
      method: z.string().min(1).optional(),
      nome: z.string().min(1).optional(),
      descricao: z.string().optional(),
      modulo: z.string().optional(),
      ativo: z.boolean().optional(),
    });

    const { id } = paramsSchema.parse(request.params);
    const { path, method, nome, descricao, modulo, ativo } = bodySchema.parse(request.body);

    const useCase = container.resolve(UpdateRouteUseCase);
    const route = await useCase.execute({ id, path, method, nome, descricao, modulo, ativo });

    return reply.send(route);
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const { id } = paramsSchema.parse(request.params);

    const useCase = container.resolve(DeleteRouteUseCase);
    await useCase.execute({ id });

    return reply.status(204).send();
  }
}