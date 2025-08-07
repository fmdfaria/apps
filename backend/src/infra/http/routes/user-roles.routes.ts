import { FastifyInstance } from 'fastify';
import { UserRolesController } from '../controllers/UserRolesController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';

export async function userRolesRoutes(fastify: FastifyInstance) {
  const userRolesController = new UserRolesController();

  fastify.addHook('preHandler', ensureAuthenticated);

  fastify.post('/user-roles', userRolesController.assignRole);
  fastify.get('/user-roles', userRolesController.listAllUserRoles);
  fastify.put('/user-roles/:id', userRolesController.updateUserRole);
  fastify.delete('/user-roles/:userId/:roleId', userRolesController.removeRole);
  fastify.get('/users/:userId/roles', userRolesController.listUserRoles);
  fastify.get('/users/:userId/allowed-routes', userRolesController.listUserAllowedRoutes);
}