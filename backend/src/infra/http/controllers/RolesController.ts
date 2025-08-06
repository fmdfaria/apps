import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CreateRoleUseCase } from '../../../core/application/use-cases/role/CreateRoleUseCase';
import { ListRolesUseCase } from '../../../core/application/use-cases/role/ListRolesUseCase';
import { UpdateRoleUseCase } from '../../../core/application/use-cases/role/UpdateRoleUseCase';
import { DeleteRoleUseCase } from '../../../core/application/use-cases/role/DeleteRoleUseCase';

export class RolesController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const bodySchema = z.object({
      nome: z.string().min(1),
      descricao: z.string().optional(),
    });

    const { nome, descricao } = bodySchema.parse(request.body);

    const useCase = container.resolve(CreateRoleUseCase);
    const role = await useCase.execute({ nome, descricao });

    return reply.status(201).send(role);
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const querySchema = z.object({
      onlyActive: z.string().optional().transform((val) => val === 'true'),
    });

    const { onlyActive } = querySchema.parse(request.query);

    const useCase = container.resolve(ListRolesUseCase);
    const roles = await useCase.execute({ onlyActive });

    return reply.send(roles);
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const bodySchema = z.object({
      nome: z.string().min(1).optional(),
      descricao: z.string().optional(),
      ativo: z.boolean().optional(),
    });

    const { id } = paramsSchema.parse(request.params);
    const { nome, descricao, ativo } = bodySchema.parse(request.body);

    const useCase = container.resolve(UpdateRoleUseCase);
    const role = await useCase.execute({ id, nome, descricao, ativo });

    return reply.send(role);
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const { id } = paramsSchema.parse(request.params);

    const useCase = container.resolve(DeleteRoleUseCase);
    await useCase.execute({ id });

    return reply.status(204).send();
  }
}