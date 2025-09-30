import { FastifyInstance } from 'fastify';
import { EvolucoesPacientesController } from '../controllers/EvolucoesPacientesController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

export async function evolucoesPacientesRoutes(app: FastifyInstance) {
  const controller = new EvolucoesPacientesController();

  app.post('/evolucoes', {
    preHandler: [ensureAuthenticated, ensureAuthorized('/evolucoes', 'POST')]
  }, controller.create);

  app.get('/evolucoes', {
    preHandler: [ensureAuthenticated, ensureAuthorized('/evolucoes', 'GET')]
  }, controller.list);

  app.post('/evolucoes/status-por-agendamentos', {
    preHandler: [ensureAuthenticated, ensureAuthorized('/evolucoes/status-por-agendamentos', 'POST')]
  }, controller.getStatusPorAgendamentos);

  app.get('/evolucoes/agendamento/:agendamentoId', {
    preHandler: [ensureAuthenticated, ensureAuthorized('/evolucoes/agendamento/:agendamentoId', 'GET')]
  }, controller.getByAgendamento);

  app.put('/evolucoes/:id', {
    preHandler: [ensureAuthenticated, ensureAuthorized('/evolucoes/:id', 'PUT')]
  }, controller.update);

  app.delete('/evolucoes/:id', {
    preHandler: [ensureAuthenticated, ensureAuthorized('/evolucoes/:id', 'DELETE')]
  }, controller.delete);
} 