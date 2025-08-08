import { FastifyInstance } from 'fastify';
import { UserRolesController } from '../controllers/UserRolesController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

export async function userRolesRoutes(fastify: FastifyInstance) {
  const userRolesController = new UserRolesController();

  fastify.post('/user-roles', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/user-roles', 'POST')] 
  }, userRolesController.assignRole);
  
  fastify.get('/user-roles', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/user-roles', 'GET')] 
  }, userRolesController.listAllUserRoles);
  
  fastify.put('/user-roles/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/user-roles/:id', 'PUT')] 
  }, userRolesController.updateUserRole);
  
  fastify.delete('/user-roles/:userId/:roleId', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/user-roles/:userId/:roleId', 'DELETE')] 
  }, userRolesController.removeRole);
  
  fastify.get('/users/:userId/roles', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/users/:userId/roles', 'GET')] 
  }, userRolesController.listUserRoles);
  
  fastify.get('/users/:userId/allowed-routes', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/users/:userId/allowed-routes', 'GET')] 
  }, userRolesController.listUserAllowedRoutes);
}