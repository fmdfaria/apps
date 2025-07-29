import { FastifyInstance } from 'fastify';
import { AnexosController } from '../controllers/AnexosController';

const controller = new AnexosController();

export async function anexosRoutes(app: FastifyInstance) {
  app.post('/anexos', controller.create);
  app.get('/anexos', controller.list);
  app.delete('/anexos/:id', controller.delete);
  app.put('/anexos/:id', controller.update);
} 