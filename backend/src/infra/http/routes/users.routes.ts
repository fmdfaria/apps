import { FastifyInstance } from 'fastify';
import { UsersController } from '../controllers/UsersController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

const controller = new UsersController();

export async function usersRoutes(app: FastifyInstance) {
  app.get('/users', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/users', 'GET')] 
  }, async (req, res) => controller.list(req, res));
  
  app.put('/users/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/users/:id', 'PUT')] 
  }, async (req, res) => controller.update(req, res));
  
  app.delete('/users/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/users/:id', 'DELETE')] 
  }, async (req, res) => controller.delete(req, res));
  
  app.get('/users/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/users/:id', 'GET')] 
  }, async (req, res) => controller.show(req, res));
} 