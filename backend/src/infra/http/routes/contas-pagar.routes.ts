import { FastifyInstance } from 'fastify';
import { ContasPagarController } from '../controllers/ContasPagarController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

const controller = new ContasPagarController();

export async function contasPagarRoutes(app: FastifyInstance) {
  // Listar contas a pagar
  app.get('/contas-pagar', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-pagar', 'GET')] 
  }, (request, reply) => controller.list(request as any, reply as any));
  
  // Criar nova conta a pagar
  app.post('/contas-pagar', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-pagar', 'POST')] 
  }, (request, reply) => controller.create(request as any, reply as any));
  
  // Buscar conta a pagar por ID
  app.get('/contas-pagar/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-pagar/:id', 'GET')] 
  }, (request, reply) => controller.findById(request as any, reply as any));
  
  // Atualizar conta a pagar
  app.put('/contas-pagar/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-pagar/:id', 'PUT')] 
  }, (request, reply) => controller.update(request as any, reply as any));

  // Excluir conta a pagar
  app.delete('/contas-pagar/:id', {
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-pagar/:id', 'DELETE')]
  }, (request, reply) => controller.delete(request as any, reply as any));

  // Registrar pagamento
  app.post('/contas-pagar/:id/pagar', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-pagar/:id/pagar', 'POST')] 
  }, (request, reply) => controller.pagar(request as any, reply as any));

  // Cancelar conta
  app.patch('/contas-pagar/:id/cancelar', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-pagar/:id/cancelar', 'PATCH')] 
  }, (request, reply) => controller.cancelar(request as any, reply as any));

  // Contas pendentes
  app.get('/contas-pagar/pendentes', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-pagar/pendentes', 'GET')] 
  }, (request, reply) => controller.findPendentes(request as any, reply as any));

  // Contas vencidas
  app.get('/contas-pagar/vencidas', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-pagar/vencidas', 'GET')] 
  }, (request, reply) => controller.findVencidas(request as any, reply as any));

  // Contas recorrentes
  app.get('/contas-pagar/recorrentes', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-pagar/recorrentes', 'GET')] 
  }, (request, reply) => controller.findRecorrentes(request as any, reply as any));

  // Buscar dados para webhook
  app.get('/contas-pagar/:id/webhook-data', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-pagar/:id/webhook-data', 'GET')] 
  }, (request, reply) => controller.getDadosWebhook(request as any, reply as any));
}