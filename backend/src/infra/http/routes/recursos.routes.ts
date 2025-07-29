import { FastifyInstance } from 'fastify';
import { RecursosController } from '../controllers/RecursosController';

const recursosController = new RecursosController();

export async function recursosRoutes(app: FastifyInstance) {
  app.post('/recursos', recursosController.create);
  app.get('/recursos', recursosController.list);
  app.put('/recursos/:id', recursosController.update);
  app.delete('/recursos/:id', recursosController.delete);
} 