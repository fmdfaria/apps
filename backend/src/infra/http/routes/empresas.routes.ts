import { FastifyInstance } from 'fastify';
import { EmpresasController } from '../controllers/EmpresasController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

const controller = new EmpresasController();

export async function empresasRoutes(app: FastifyInstance) {
  app.get('/empresas', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/empresas', 'GET')] 
  }, (request, reply) => controller.list(request as any, reply as any));
  
  app.post('/empresas', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/empresas', 'POST')] 
  }, (request, reply) => controller.create(request as any, reply as any));
  
  // Buscar empresa por ID
  app.get('/empresas/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/empresas/:id', 'GET')] 
  }, (request, reply) => controller.findById(request as any, reply as any));
  
  app.put('/empresas/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/empresas/:id', 'PUT')] 
  }, (request, reply) => controller.update(request as any, reply as any));

  app.delete('/empresas/:id', {
    preHandler: [ensureAuthenticated, ensureAuthorized('/empresas/:id', 'DELETE')]
  }, (request, reply) => controller.delete(request as any, reply as any));

  // Ativar/desativar empresa
  app.patch('/empresas/:id/status', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/empresas/:id/status', 'PATCH')] 
  }, (request, reply) => controller.updateStatus(request as any, reply as any));
}