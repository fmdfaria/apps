import { FastifyInstance } from 'fastify';
import { ContasBancariasController } from '../controllers/ContasBancariasController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

const controller = new ContasBancariasController();

export async function contasBancariasRoutes(app: FastifyInstance) {
  // Listar contas bancárias
  app.get('/contas-bancarias', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-bancarias', 'GET')] 
  }, (request, reply) => controller.list(request as any, reply as any));
  
  // Criar nova conta bancária
  app.post('/contas-bancarias', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-bancarias', 'POST')] 
  }, (request, reply) => controller.create(request as any, reply as any));
  
  // Buscar conta bancária por ID
  app.get('/contas-bancarias/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-bancarias/:id', 'GET')] 
  }, (request, reply) => controller.findById(request as any, reply as any));
  
  // Atualizar conta bancária
  app.put('/contas-bancarias/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-bancarias/:id', 'PUT')] 
  }, (request, reply) => controller.update(request as any, reply as any));

  // Excluir conta bancária
  app.delete('/contas-bancarias/:id', {
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-bancarias/:id', 'DELETE')]
  }, (request, reply) => controller.delete(request as any, reply as any));

  // Contas por empresa
  app.get('/contas-bancarias/empresa/:empresaId', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-bancarias/empresa/:empresaId', 'GET')] 
  }, (request, reply) => controller.findByEmpresa(request as any, reply as any));

  // Atualizar saldo
  app.patch('/contas-bancarias/:id/saldo', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/contas-bancarias/:id/saldo', 'PATCH')] 
  }, (request, reply) => controller.atualizarSaldo(request as any, reply as any));
}