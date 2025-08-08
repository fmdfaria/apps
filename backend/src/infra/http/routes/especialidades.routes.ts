import { FastifyInstance } from 'fastify';
import { EspecialidadesController } from '../controllers/EspecialidadesController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

const especialidadesController = new EspecialidadesController();

export async function especialidadesRoutes(app: FastifyInstance) {
  app.post('/especialidades', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/especialidades', 'POST')] 
  }, especialidadesController.create);
  
  app.get('/especialidades', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/especialidades', 'GET')] 
  }, especialidadesController.list);
  
  app.put('/especialidades/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/especialidades/:id', 'PUT')] 
  }, especialidadesController.update);
  
  app.delete('/especialidades/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/especialidades/:id', 'DELETE')] 
  }, especialidadesController.delete);
} 