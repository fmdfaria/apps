import { FastifyInstance } from 'fastify';
import { EvolucoesPacientesController } from '../controllers/EvolucoesPacientesController';

export async function evolucoesPacientesRoutes(app: FastifyInstance) {
  const controller = new EvolucoesPacientesController();

  app.post('/evolucoes', controller.create);
  app.get('/evolucoes', controller.list);
  app.post('/evolucoes/status-por-agendamentos', controller.getStatusPorAgendamentos);
  app.get('/evolucoes/agendamento/:agendamentoId', controller.getByAgendamento);
  app.put('/evolucoes/:id', controller.update);
  app.delete('/evolucoes/:id', controller.delete);
} 