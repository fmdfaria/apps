import { FastifyInstance } from 'fastify';
import * as PrecosParticularesController from '../controllers/PrecosParticularesController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

export async function precosParticularesRoutes(app: FastifyInstance) {
  app.post('/precos-particulares', { preHandler: [ensureAuthenticated, ensureAuthorized('/precos-particulares', 'POST')] }, PrecosParticularesController.create);
  app.put('/precos-particulares/:id', { preHandler: [ensureAuthenticated, ensureAuthorized('/precos-particulares/:id', 'PUT')] }, PrecosParticularesController.update);
  app.get('/precos-particulares', { preHandler: [ensureAuthenticated, ensureAuthorized('/precos-particulares', 'GET')] }, PrecosParticularesController.list);
  app.delete('/precos-particulares/:id', { preHandler: [ensureAuthenticated, ensureAuthorized('/precos-particulares/:id', 'DELETE')] }, PrecosParticularesController.remove);
} 