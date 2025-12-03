import { FastifyInstance } from 'fastify';
import { PacientesController } from '../controllers/PacientesController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

const pacientesController = new PacientesController();

export async function pacientesRoutes(app: FastifyInstance) {
  app.post('/pacientes', { preHandler: [ensureAuthenticated, ensureAuthorized('/pacientes', 'POST')] }, pacientesController.create);
  app.get('/pacientes', { preHandler: [ensureAuthenticated, ensureAuthorized('/pacientes', 'GET')] }, pacientesController.list);

  // IMPORTANTE: Esta rota deve vir ANTES de /pacientes/:id para evitar que "faltas-consecutivas" seja interpretado como um ID
  app.get('/pacientes/faltas-consecutivas', { preHandler: [ensureAuthenticated, ensureAuthorized('/pacientes/faltas-consecutivas', 'GET')] }, pacientesController.getFaltasConsecutivas.bind(pacientesController));

  app.get('/pacientes/:id', { preHandler: [ensureAuthenticated, ensureAuthorized('/pacientes/:id', 'GET')] }, pacientesController.show.bind(pacientesController));
  app.put('/pacientes/:id', { preHandler: [ensureAuthenticated, ensureAuthorized('/pacientes/:id', 'PUT')] }, pacientesController.update);
  app.delete('/pacientes/:id', { preHandler: [ensureAuthenticated, ensureAuthorized('/pacientes/:id', 'DELETE')] }, pacientesController.delete);
  app.patch('/pacientes/:id/status', { preHandler: [ensureAuthenticated, ensureAuthorized('/pacientes/:id/status', 'PATCH')] }, pacientesController.updateStatus.bind(pacientesController));
} 