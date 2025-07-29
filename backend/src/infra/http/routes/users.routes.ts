import { FastifyInstance } from 'fastify';
import { UsersController } from '../controllers/UsersController';
// import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
// import { ensureAdmin } from '../middlewares/ensureAdmin';

const controller = new UsersController();

export async function usersRoutes(app: FastifyInstance) {
  app.get('/users', /*ensureAuthenticated, ensureAdmin,*/ async (req, res) => controller.list(req, res));
  app.put('/users/:id', /*ensureAuthenticated, ensureAdmin,*/ async (req, res) => controller.update(req, res));
  app.delete('/users/:id', /*ensureAuthenticated, ensureAdmin,*/ async (req, res) => controller.delete(req, res));
  app.get('/users/:id', /*ensureAuthenticated, ensureAdmin,*/ async (req, res) => controller.show(req, res));
} 