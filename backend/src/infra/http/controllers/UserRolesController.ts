import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { AssignRoleToUserUseCase } from '../../../core/application/use-cases/user-role/AssignRoleToUserUseCase';
import { RemoveRoleFromUserUseCase } from '../../../core/application/use-cases/user-role/RemoveRoleFromUserUseCase';
import { ListUserRolesUseCase } from '../../../core/application/use-cases/user-role/ListUserRolesUseCase';
import { ListUserAllowedRoutesUseCase } from '../../../core/application/use-cases/role-route/ListUserAllowedRoutesUseCase';

export class UserRolesController {
  async assignRole(request: FastifyRequest, reply: FastifyReply) {
    const bodySchema = z.object({
      userId: z.string().uuid(),
      roleId: z.string().uuid(),
    });

    const { userId, roleId } = bodySchema.parse(request.body);

    const useCase = container.resolve(AssignRoleToUserUseCase);
    const userRole = await useCase.execute({ userId, roleId });

    return reply.status(201).send(userRole);
  }

  async removeRole(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      userId: z.string().uuid(),
      roleId: z.string().uuid(),
    });

    const { userId, roleId } = paramsSchema.parse(request.params);

    const useCase = container.resolve(RemoveRoleFromUserUseCase);
    await useCase.execute({ userId, roleId });

    return reply.status(204).send();
  }

  async listUserRoles(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      userId: z.string().uuid(),
    });

    const querySchema = z.object({
      onlyActive: z.string().optional().transform((val) => val === 'true'),
    });

    const { userId } = paramsSchema.parse(request.params);
    const { onlyActive } = querySchema.parse(request.query);

    const useCase = container.resolve(ListUserRolesUseCase);
    const userRoles = await useCase.execute({ userId, onlyActive });

    return reply.send(userRoles);
  }

  async listUserAllowedRoutes(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      userId: z.string().uuid(),
    });

    const { userId } = paramsSchema.parse(request.params);

    const useCase = container.resolve(ListUserAllowedRoutesUseCase);
    const routes = await useCase.execute({ userId });

    return reply.send(routes);
  }
}