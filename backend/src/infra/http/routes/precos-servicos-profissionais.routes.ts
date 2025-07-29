import { FastifyInstance } from 'fastify';
import * as PrecosServicosProfissionaisController from '../controllers/PrecosServicosProfissionaisController';

export async function precosServicosProfissionaisRoutes(app: FastifyInstance) {
  app.post(
    '/precos-servicos-profissionais',
    PrecosServicosProfissionaisController.create
  );
  app.put(
    '/precos-servicos-profissionais/:id',
    PrecosServicosProfissionaisController.update
  );
  app.get(
    '/precos-servicos-profissionais',
    PrecosServicosProfissionaisController.list
  );
  app.delete(
    '/precos-servicos-profissionais/:id',
    PrecosServicosProfissionaisController.remove
  );
} 