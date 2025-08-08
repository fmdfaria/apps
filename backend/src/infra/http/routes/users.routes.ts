import { FastifyInstance } from 'fastify';
import { UsersController } from '../controllers/UsersController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

const controller = new UsersController();

export async function usersRoutes(app: FastifyInstance) {
  // Rota para buscar permissões do usuário logado
  app.get('/users/me/permissions', { 
    preHandler: [ensureAuthenticated] 
  }, async (request, reply) => {
    // @ts-ignore
    const userId = request.user?.id;
    
    if (!userId) {
      return reply.status(401).send({ message: 'Usuário não autenticado.' });
    }

    try {
      const { container } = require('tsyringe');
      const { ListUserAllowedRoutesUseCase } = require('../../../core/application/use-cases/role-route/ListUserAllowedRoutesUseCase');
      
      const useCase = container.resolve(ListUserAllowedRoutesUseCase);
      const allowedRoutes = await useCase.execute({ userId });

      return reply.send(allowedRoutes);
    } catch (error) {
      console.error('Erro ao buscar permissões do usuário:', error);
      return reply.status(500).send({ message: 'Erro interno do servidor.' });
    }
  });

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