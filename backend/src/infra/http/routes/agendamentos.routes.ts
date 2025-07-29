import { FastifyInstance } from 'fastify';
import { AgendamentosController } from '../controllers/AgendamentosController';

const controller = new AgendamentosController();

export async function agendamentosRoutes(app: FastifyInstance) {
  app.post('/agendamentos', controller.create);
  app.get('/agendamentos', controller.list);
  app.put('/agendamentos/:id', controller.update);
  app.delete('/agendamentos/:id', controller.delete);
} 