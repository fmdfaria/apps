import { FastifyInstance } from 'fastify';
import { RoutesController } from '../controllers/RoutesController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';

export async function routesRoutes(fastify: FastifyInstance) {
  const routesController = new RoutesController();

  fastify.addHook('preHandler', ensureAuthenticated);

  fastify.post('/routes', routesController.create);
  fastify.get('/routes', routesController.list);
  fastify.put('/routes/:id', routesController.update);
  fastify.delete('/routes/:id', routesController.delete);
}