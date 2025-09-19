import { FastifyInstance } from 'fastify';
import { AgendamentosContasController } from '../controllers/AgendamentosContasController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

const controller = new AgendamentosContasController();

export async function agendamentosContasRoutes(app: FastifyInstance) {
  // 🔗 AGENDAMENTOS-CONTAS (Relacionamento)
  
  // Listar relacionamentos
  app.get('/agendamentos-contas', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos-contas', 'GET')] 
  }, (request, reply) => controller.findAll(request as any, reply as any));

  // Criar relacionamento
  app.post('/agendamentos-contas', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos-contas', 'POST')] 
  }, (request, reply) => controller.create(request as any, reply as any));

  // Buscar por agendamento
  app.get('/agendamentos-contas/agendamento/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos-contas', 'GET')] 
  }, (request, reply) => controller.findByAgendamento(request as any, reply as any));

  // Buscar por conta a receber
  app.get('/agendamentos-contas/conta-receber/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos-contas', 'GET')] 
  }, (request, reply) => controller.findByContaReceber(request as any, reply as any));

  // Buscar por conta a pagar
  app.get('/agendamentos-contas/conta-pagar/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos-contas', 'GET')] 
  }, (request, reply) => controller.findByContaPagar(request as any, reply as any));

  // Remover relacionamento
  app.delete('/agendamentos-contas/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos-contas', 'DELETE')] 
  }, (request, reply) => controller.delete(request as any, reply as any));
}