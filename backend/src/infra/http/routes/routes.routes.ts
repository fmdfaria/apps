import { FastifyInstance } from 'fastify';
import { RoutesController } from '../controllers/RoutesController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

export async function routesRoutes(fastify: FastifyInstance) {
  const routesController = new RoutesController();

  fastify.post('/routes', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/routes', 'POST')] 
  }, routesController.create);
  
  fastify.get('/routes', { 
    preHandler: [ensureAuthenticated] 
  }, routesController.list);
  
  fastify.put('/routes/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/routes/:id', 'PUT')] 
  }, routesController.update);
  
  fastify.delete('/routes/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/routes/:id', 'DELETE')] 
  }, routesController.delete);

  fastify.get('/routes/find-by-path', { 
    preHandler: [ensureAuthenticated] 
  }, routesController.findByPathAndMethod);
}