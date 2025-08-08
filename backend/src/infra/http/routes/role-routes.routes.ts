import { FastifyInstance } from 'fastify';
import { RoleRoutesController } from '../controllers/RoleRoutesController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

export async function roleRoutesRoutes(fastify: FastifyInstance) {
  const roleRoutesController = new RoleRoutesController();

  fastify.post('/role-routes', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/role-routes', 'POST')] 
  }, roleRoutesController.assignRoute);
  
  fastify.get('/role-routes', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/role-routes', 'GET')] 
  }, roleRoutesController.listAllRoleRoutes);
  
  fastify.put('/role-routes/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/role-routes/:id', 'PUT')] 
  }, roleRoutesController.updateRoleRoute);
  
  fastify.delete('/role-routes/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/role-routes/:id', 'DELETE')] 
  }, roleRoutesController.deleteRoleRoute);
  
  fastify.delete('/role-routes/:roleId/:routeId', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/role-routes/:roleId/:routeId', 'DELETE')] 
  }, roleRoutesController.removeRoute);
}