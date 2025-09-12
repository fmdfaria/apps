import { FastifyInstance } from 'fastify';
import { EmpresasController } from '../controllers/EmpresasController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

const controller = new EmpresasController();

export async function empresasRoutes(app: FastifyInstance) {
  app.get('/empresas', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/empresas', 'GET')] 
  }, controller.list);
  
  app.post('/empresas', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/empresas', 'POST')] 
  }, controller.create);
  
  app.put('/empresas/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/empresas/:id', 'PUT')] 
  }, controller.update);
}