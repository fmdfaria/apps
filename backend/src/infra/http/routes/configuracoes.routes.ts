import { FastifyInstance } from 'fastify';
import { ConfiguracoesController } from '../controllers/ConfiguracoesController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

const configuracoesController = new ConfiguracoesController();

export async function configuracoesRoutes(app: FastifyInstance) {
  app.post('/configuracoes', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/configuracoes', 'POST')] 
  }, configuracoesController.create);
  
  app.get('/configuracoes', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/configuracoes', 'GET')] 
  }, configuracoesController.list);

  app.get('/configuracoes/entity', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/configuracoes/entity', 'GET')] 
  }, configuracoesController.getByEntity);
  
  app.put('/configuracoes/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/configuracoes/:id', 'PUT')] 
  }, configuracoesController.update);
  
  app.delete('/configuracoes/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/configuracoes/:id', 'DELETE')] 
  }, configuracoesController.delete);
}