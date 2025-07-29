import { FastifyInstance } from 'fastify';
import { AdendosContratosController } from '../controllers/AdendosContratosController';

const controller = new AdendosContratosController();

export async function adendosContratosRoutes(app: FastifyInstance) {
  app.post('/adendos-contratos', controller.create);
  app.get('/adendos-contratos', controller.list);
  app.put('/adendos-contratos/:id', controller.update);
  app.delete('/adendos-contratos/:id', controller.delete);
} 