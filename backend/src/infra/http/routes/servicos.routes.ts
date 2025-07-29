import { FastifyInstance } from 'fastify';
import { ServicosController } from '../controllers/ServicosController';

const servicosController = new ServicosController();

export async function servicosRoutes(app: FastifyInstance) {
  app.post('/servicos', servicosController.create);
  app.get('/servicos', servicosController.list);
  app.put('/servicos/:id', servicosController.update);
  app.delete('/servicos/:id', servicosController.delete);
} 