import { FastifyInstance } from 'fastify';
import { ConselhosProfissionaisController } from '../controllers/ConselhosProfissionaisController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

const conselhosController = new ConselhosProfissionaisController();

export async function conselhosProfissionaisRoutes(app: FastifyInstance) {
  app.post('/conselhos', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/conselhos', 'POST')] 
  }, conselhosController.create);
  
  app.get('/conselhos', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/conselhos', 'GET')] 
  }, conselhosController.list);
  
  app.put('/conselhos/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/conselhos/:id', 'PUT')] 
  }, conselhosController.update);
  
  app.delete('/conselhos/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/conselhos/:id', 'DELETE')] 
  }, conselhosController.delete);
} 