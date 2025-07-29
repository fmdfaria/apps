import { FastifyInstance } from 'fastify';
import { ConselhosProfissionaisController } from '../controllers/ConselhosProfissionaisController';

const conselhosController = new ConselhosProfissionaisController();

export async function conselhosProfissionaisRoutes(app: FastifyInstance) {
  app.post('/conselhos', conselhosController.create);
  app.get('/conselhos', conselhosController.list);
  app.put('/conselhos/:id', conselhosController.update);
  app.delete('/conselhos/:id', conselhosController.delete);
} 