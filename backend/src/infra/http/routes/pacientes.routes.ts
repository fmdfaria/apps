import { FastifyInstance } from 'fastify';
import { PacientesController } from '../controllers/PacientesController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

const pacientesController = new PacientesController();

export async function pacientesRoutes(app: FastifyInstance) {
  app.post('/pacientes', { preHandler: [ensureAuthenticated, ensureAuthorized('/pacientes', 'POST')] }, pacientesController.create);
  app.get('/pacientes', { preHandler: [ensureAuthenticated, ensureAuthorized('/pacientes', 'GET')] }, pacientesController.list);
  app.put('/pacientes/:id', { preHandler: [ensureAuthenticated, ensureAuthorized('/pacientes/:id', 'PUT')] }, pacientesController.update);
  app.delete('/pacientes/:id', { preHandler: [ensureAuthenticated, ensureAuthorized('/pacientes/:id', 'DELETE')] }, pacientesController.delete);
} 