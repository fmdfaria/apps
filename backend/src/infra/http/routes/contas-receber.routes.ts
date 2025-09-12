import { FastifyInstance } from 'fastify';
import { ContasReceberController } from '../controllers/ContasReceberController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

const controller = new ContasReceberController();

export async function contasReceberRoutes(app: FastifyInstance) {
  app.get('/contas-receber', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-receber', 'GET')] 
  }, controller.list);

  app.get('/contas-receber/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-receber/:id', 'GET')] 
  }, controller.show);
  
  app.post('/contas-receber', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-receber', 'POST')] 
  }, controller.create);
  
  app.post('/contas-receber/:id/receber', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-receber/:id/receber', 'POST')] 
  }, controller.receber);
}