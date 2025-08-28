import { FastifyInstance } from 'fastify';
import { FilaEsperaController } from '../controllers/FilaEsperaController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

const controller = new FilaEsperaController();

export async function filaEsperaRoutes(app: FastifyInstance) {
  app.post('/fila-de-espera', { preHandler: [ensureAuthenticated, ensureAuthorized('/fila-de-espera', 'POST')] }, controller.create);
  app.get('/fila-de-espera', { preHandler: [ensureAuthenticated, ensureAuthorized('/fila-de-espera', 'GET')] }, controller.list);
  app.get('/fila-de-espera/:id', { preHandler: [ensureAuthenticated, ensureAuthorized('/fila-de-espera/:id', 'GET')] }, controller.show.bind(controller));
  app.put('/fila-de-espera/:id', { preHandler: [ensureAuthenticated, ensureAuthorized('/fila-de-espera/:id', 'PUT')] }, controller.update);
  app.delete('/fila-de-espera/:id', { preHandler: [ensureAuthenticated, ensureAuthorized('/fila-de-espera/:id', 'DELETE')] }, controller.delete);
  app.patch('/fila-de-espera/:id/status', { preHandler: [ensureAuthenticated, ensureAuthorized('/fila-de-espera/:id/status', 'PATCH')] }, controller.updateStatus.bind(controller));
}


