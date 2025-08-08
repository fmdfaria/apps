import { FastifyInstance } from 'fastify';
import { RecursosController } from '../controllers/RecursosController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';
const recursosController = new RecursosController();

export async function recursosRoutes(app: FastifyInstance) {
  app.get('/recursos', recursosController.list);
  app.put('/recursos/:id', recursosController.update);
  app.delete('/recursos/:id', recursosController.delete);

  app.post('/recursos', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/recursos', 'POST')] 
  }, recursosController.create);
} 