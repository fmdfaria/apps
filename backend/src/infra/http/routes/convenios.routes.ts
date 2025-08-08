import { FastifyInstance } from 'fastify';
import { ConveniosController } from '../controllers/ConveniosController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

const conveniosController = new ConveniosController();

export async function conveniosRoutes(app: FastifyInstance) {
  app.post('/convenios', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/convenios', 'POST')] 
  }, conveniosController.create);
  
  app.get('/convenios', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/convenios', 'GET')] 
  }, conveniosController.list);
  
  app.put('/convenios/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/convenios/:id', 'PUT')] 
  }, conveniosController.update);
  
  app.delete('/convenios/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/convenios/:id', 'DELETE')] 
  }, conveniosController.delete);
} 