import { FastifyInstance } from 'fastify';
import { RoleRoutesController } from '../controllers/RoleRoutesController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';

export async function roleRoutesRoutes(fastify: FastifyInstance) {
  const roleRoutesController = new RoleRoutesController();

  fastify.addHook('preHandler', ensureAuthenticated);

  fastify.post('/role-routes', roleRoutesController.assignRoute);
  fastify.delete('/role-routes/:roleId/:routeId', roleRoutesController.removeRoute);
}