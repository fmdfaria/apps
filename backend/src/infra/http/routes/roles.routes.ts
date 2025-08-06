import { FastifyInstance } from 'fastify';
import { RolesController } from '../controllers/RolesController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';

export async function rolesRoutes(fastify: FastifyInstance) {
  const rolesController = new RolesController();

  fastify.addHook('preHandler', ensureAuthenticated);

  fastify.post('/roles', rolesController.create);
  fastify.get('/roles', rolesController.list);
  fastify.put('/roles/:id', rolesController.update);
  fastify.delete('/roles/:id', rolesController.delete);
}