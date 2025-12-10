import { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/AuthController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';

const controller = new AuthController();

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', /*ensureAuthenticated,*/ async (req, res) => controller.register(req, res)); // admin
  app.post('/login', async (req, res) => controller.login(req, res));
  app.post('/logout', async (req, res) => controller.logout(req, res));
  app.post('/password/request-reset', async (req, res) => controller.requestPasswordReset(req, res));
  app.post('/password/reset', async (req, res) => controller.resetPassword(req, res));
  app.post('/password/change', { preHandler: [ensureAuthenticated] }, async (req, res) => controller.changePassword(req, res));
  app.post('/password/validate', { preHandler: [ensureAuthenticated] }, async (req, res) => controller.validatePassword(req, res));
  app.post('/first-login', async (req, res) => controller.firstLogin(req, res));
  app.post('/email/request-confirmation', /*ensureAuthenticated,*/ async (req, res) => controller.requestEmailConfirmation(req, res));
  app.post('/email/confirm', async (req, res) => controller.confirmEmail(req, res));
} 