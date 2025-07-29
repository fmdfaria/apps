import { FastifyInstance } from 'fastify';
import { PacientesController } from '../controllers/PacientesController';

const pacientesController = new PacientesController();

export async function pacientesRoutes(app: FastifyInstance) {
  app.post('/pacientes', pacientesController.create);
  app.get('/pacientes', pacientesController.list);
  app.put('/pacientes/:id', pacientesController.update);
  app.delete('/pacientes/:id', pacientesController.delete);
} 