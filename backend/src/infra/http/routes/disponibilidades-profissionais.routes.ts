import { FastifyInstance } from 'fastify';
import { DisponibilidadesProfissionaisController } from '../controllers/DisponibilidadesProfissionaisController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

const controller = new DisponibilidadesProfissionaisController();

export async function disponibilidadesProfissionaisRoutes(app: FastifyInstance) {
  app.get('/disponibilidades-profissionais', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/disponibilidades-profissionais', 'GET')] 
  }, controller.list);
  
  app.post(' ', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/disponibilidades-profissionais', 'POST')] 
  }, controller.create);
  
  app.put('/disponibilidades-profissionais/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/disponibilidades-profissionais/:id', 'PUT')] 
  }, controller.update);
  
  app.delete('/disponibilidades-profissionais/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/disponibilidades-profissionais/:id', 'DELETE')] 
  }, controller.delete);
} 