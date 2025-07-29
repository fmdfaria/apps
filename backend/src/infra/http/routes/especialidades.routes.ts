import { FastifyInstance } from 'fastify';
import { EspecialidadesController } from '../controllers/EspecialidadesController';

const especialidadesController = new EspecialidadesController();

export async function especialidadesRoutes(app: FastifyInstance) {
  app.post('/especialidades', especialidadesController.create);
  app.get('/especialidades', especialidadesController.list);
  app.put('/especialidades/:id', especialidadesController.update);
  app.delete('/especialidades/:id', especialidadesController.delete);
} 