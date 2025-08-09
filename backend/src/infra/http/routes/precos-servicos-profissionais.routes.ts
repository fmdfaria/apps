import { FastifyInstance } from 'fastify';
import * as PrecosServicosProfissionaisController from '../controllers/PrecosServicosProfissionaisController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

export async function precosServicosProfissionaisRoutes(app: FastifyInstance) {
  app.post(
    '/precos-servicos-profissionais',
    { preHandler: [ensureAuthenticated, ensureAuthorized('/precos-servicos-profissionais', 'POST')] },
    PrecosServicosProfissionaisController.create
  );
  app.put(
    '/precos-servicos-profissionais/:id',
    { preHandler: [ensureAuthenticated, ensureAuthorized('/precos-servicos-profissionais/:id', 'PUT')] },
    PrecosServicosProfissionaisController.update
  );
  app.get(
    '/precos-servicos-profissionais',
    { preHandler: [ensureAuthenticated, ensureAuthorized('/precos-servicos-profissionais', 'GET')] },
    PrecosServicosProfissionaisController.list
  );
  app.delete(
    '/precos-servicos-profissionais/:id',
    { preHandler: [ensureAuthenticated, ensureAuthorized('/precos-servicos-profissionais/:id', 'DELETE')] },
    PrecosServicosProfissionaisController.remove
  );
} 