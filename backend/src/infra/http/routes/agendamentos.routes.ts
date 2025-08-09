import { FastifyInstance } from 'fastify';
import { AgendamentosController } from '../controllers/AgendamentosController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

const controller = new AgendamentosController();

export async function agendamentosRoutes(app: FastifyInstance) {
  app.get('/agendamentos', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos', 'GET')] 
  }, controller.list);
  
  app.post('/agendamentos', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos', 'POST')] 
  }, controller.create);
  
  app.put('/agendamentos/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos/:id', 'PUT')] 
  }, controller.update);
  
  app.delete('/agendamentos/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos/:id', 'DELETE')] 
  }, controller.delete);
  
  // Rota específica para liberação de agendamentos
  app.put('/agendamentos-liberar/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos-liberar/:id', 'PUT')] 
  }, controller.liberar);
  
  // Rota específica para atendimento de agendamentos
  app.put('/agendamentos-atender/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos-atender/:id', 'PUT')] 
  }, controller.atender);
  
  // Rota específica para conclusão de agendamentos
  app.put('/agendamentos-concluir/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos-concluir/:id', 'PUT')] 
  }, controller.concluir);
} 