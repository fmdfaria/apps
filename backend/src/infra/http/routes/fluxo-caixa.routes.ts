import { FastifyInstance } from 'fastify';
import { FluxoCaixaController } from '../controllers/FluxoCaixaController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

const controller = new FluxoCaixaController();

export async function fluxoCaixaRoutes(app: FastifyInstance) {
  // Listar movimentações de fluxo de caixa
  app.get('/fluxo-caixa', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/fluxo-caixa', 'GET')] 
  }, (request, reply) => controller.list(request as any, reply as any));
  
  // Criar nova movimentação manual
  app.post('/fluxo-caixa', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/fluxo-caixa', 'POST')] 
  }, (request, reply) => controller.create(request as any, reply as any));
  
  // Buscar movimentação por ID
  app.get('/fluxo-caixa/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/fluxo-caixa/:id', 'GET')] 
  }, (request, reply) => controller.findById(request as any, reply as any));
  
  // Atualizar movimentação
  app.put('/fluxo-caixa/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/fluxo-caixa/:id', 'PUT')] 
  }, (request, reply) => controller.update(request as any, reply as any));

  // Excluir movimentação
  app.delete('/fluxo-caixa/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/fluxo-caixa/:id', 'DELETE')] 
  }, (request, reply) => controller.delete(request as any, reply as any));

  // Conciliar movimento
  app.post('/fluxo-caixa/:id/conciliar', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/fluxo-caixa/:id/conciliar', 'POST')] 
  }, (request, reply) => controller.conciliar(request as any, reply as any));

  // Dashboard de fluxo de caixa
  app.get('/fluxo-caixa/dashboard', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/fluxo-caixa/dashboard', 'GET')] 
  }, (request, reply) => controller.dashboard(request as any, reply as any));

  // Relatório de fluxo de caixa por período
  app.get('/fluxo-caixa/periodo', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/fluxo-caixa/periodo', 'GET')] 
  }, (request, reply) => controller.relatorio(request as any, reply as any));
}