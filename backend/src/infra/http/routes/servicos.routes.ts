import { FastifyInstance } from 'fastify';
import { ServicosController } from '../controllers/ServicosController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

const servicosController = new ServicosController();

export async function servicosRoutes(app: FastifyInstance) {
  app.post('/servicos', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/servicos', 'POST')] 
  }, servicosController.create);
  
  app.get('/servicos', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/servicos', 'GET')] 
  }, servicosController.list);
  
  app.put('/servicos/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/servicos/:id', 'PUT')] 
  }, servicosController.update);
  
  app.delete('/servicos/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/servicos/:id', 'DELETE')] 
  }, servicosController.delete);
  app.patch('/servicos/:id/status', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/servicos/:id/status', 'PATCH')] 
  }, servicosController.updateStatus.bind(servicosController));
} 