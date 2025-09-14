import { FastifyInstance } from 'fastify';
import { ContasReceberController } from '../controllers/ContasReceberController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

const controller = new ContasReceberController();

export async function contasReceberRoutes(app: FastifyInstance) {
  // Listar contas a receber (com filtros)
  app.get('/contas-receber', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-receber', 'GET')] 
  }, (request, reply) => controller.list(request as any, reply as any));
  
  // Criar conta a receber
  app.post('/contas-receber', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-receber', 'POST')] 
  }, (request, reply) => controller.create(request as any, reply as any));

  // Buscar conta por ID
  app.get('/contas-receber/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-receber/:id', 'GET')] 
  }, (request, reply) => controller.findById(request as any, reply as any));
  
  // Atualizar conta a receber
  app.put('/contas-receber/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-receber/:id', 'PUT')] 
  }, (request, reply) => controller.update(request as any, reply as any));

  // Excluir conta a receber
  app.delete('/contas-receber/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-receber/:id', 'DELETE')] 
  }, (request, reply) => controller.delete(request as any, reply as any));
  
  // Registrar recebimento
  app.post('/contas-receber/:id/receber', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-receber/:id/receber', 'POST')] 
  }, (request, reply) => controller.receber(request as any, reply as any));

  // Cancelar conta
  app.patch('/contas-receber/:id/cancelar', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-receber/:id/cancelar', 'PATCH')] 
  }, (request, reply) => controller.cancelar(request as any, reply as any));

  // Contas pendentes
  app.get('/contas-receber/pendentes', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-receber/pendentes', 'GET')] 
  }, (request, reply) => controller.listPendentes(request as any, reply as any));

  // Contas vencidas
  app.get('/contas-receber/vencidas', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-receber/vencidas', 'GET')] 
  }, (request, reply) => controller.listVencidas(request as any, reply as any));
}