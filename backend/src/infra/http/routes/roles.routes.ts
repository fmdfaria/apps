import { FastifyInstance } from 'fastify';
import { RolesController } from '../controllers/RolesController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

export async function rolesRoutes(fastify: FastifyInstance) {
  const rolesController = new RolesController();

  fastify.post('/roles', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/roles', 'POST')] 
  }, rolesController.create);
  
  fastify.get('/roles', { 
    preHandler: [ensureAuthenticated] 
  }, rolesController.list);
  
  fastify.put('/roles/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/roles/:id', 'PUT')] 
  }, rolesController.update);
  
  fastify.delete('/roles/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/roles/:id', 'DELETE')] 
  }, rolesController.delete);
}