import { FastifyInstance } from 'fastify';
import { DisponibilidadesProfissionaisController } from '../controllers/DisponibilidadesProfissionaisController';

const controller = new DisponibilidadesProfissionaisController();

export async function disponibilidadesProfissionaisRoutes(app: FastifyInstance) {
  app.post('/disponibilidades-profissionais', controller.create);
  app.get('/disponibilidades-profissionais', controller.list);
  app.put('/disponibilidades-profissionais/:id', controller.update);
  app.delete('/disponibilidades-profissionais/:id', controller.delete);
} 