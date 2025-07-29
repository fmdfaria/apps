import { FastifyInstance } from 'fastify';
import { ConveniosController } from '../controllers/ConveniosController';

const conveniosController = new ConveniosController();

export async function conveniosRoutes(app: FastifyInstance) {
  app.post('/convenios', conveniosController.create);
  app.get('/convenios', conveniosController.list);
  app.put('/convenios/:id', conveniosController.update);
  app.delete('/convenios/:id', conveniosController.delete);
} 