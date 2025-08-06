import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { AssignRouteToRoleUseCase } from '../../../core/application/use-cases/role-route/AssignRouteToRoleUseCase';
import { RemoveRouteFromRoleUseCase } from '../../../core/application/use-cases/role-route/RemoveRouteFromRoleUseCase';

export class RoleRoutesController {
  async assignRoute(request: FastifyRequest, reply: FastifyReply) {
    const bodySchema = z.object({
      roleId: z.string().uuid(),
      routeId: z.string().uuid(),
    });

    const { roleId, routeId } = bodySchema.parse(request.body);

    const useCase = container.resolve(AssignRouteToRoleUseCase);
    const roleRoute = await useCase.execute({ roleId, routeId });

    return reply.status(201).send(roleRoute);
  }

  async removeRoute(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      roleId: z.string().uuid(),
      routeId: z.string().uuid(),
    });

    const { roleId, routeId } = paramsSchema.parse(request.params);

    const useCase = container.resolve(RemoveRouteFromRoleUseCase);
    await useCase.execute({ roleId, routeId });

    return reply.status(204).send();
  }
}