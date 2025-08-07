import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { AssignRouteToRoleUseCase } from '../../../core/application/use-cases/role-route/AssignRouteToRoleUseCase';
import { RemoveRouteFromRoleUseCase } from '../../../core/application/use-cases/role-route/RemoveRouteFromRoleUseCase';
import { ListAllRoleRoutesUseCase } from '../../../core/application/use-cases/role-route/ListAllRoleRoutesUseCase';
import { UpdateRoleRouteUseCase } from '../../../core/application/use-cases/role-route/UpdateRoleRouteUseCase';
import { DeleteRoleRouteUseCase } from '../../../core/application/use-cases/role-route/DeleteRoleRouteUseCase';

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

  async listAllRoleRoutes(request: FastifyRequest, reply: FastifyReply) {
    const useCase = container.resolve(ListAllRoleRoutesUseCase);
    const roleRoutes = await useCase.execute();

    return reply.send(roleRoutes);
  }

  async updateRoleRoute(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const bodySchema = z.object({
      ativo: z.boolean().optional(),
    });

    const { id } = paramsSchema.parse(request.params);
    const { ativo } = bodySchema.parse(request.body);

    const useCase = container.resolve(UpdateRoleRouteUseCase);
    const roleRoute = await useCase.execute({ id, ativo });

    return reply.send(roleRoute);
  }

  async deleteRoleRoute(request: FastifyRequest, reply: FastifyReply) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const { id } = paramsSchema.parse(request.params);

    const useCase = container.resolve(DeleteRoleRouteUseCase);
    await useCase.execute({ id });

    return reply.status(204).send();
  }
}