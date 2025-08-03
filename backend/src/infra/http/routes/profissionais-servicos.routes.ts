import { FastifyInstance } from 'fastify';
import { ProfissionaisServicosController } from '../controllers/ProfissionaisServicosController';

const profissionaisServicosController = new ProfissionaisServicosController();

export async function profissionaisServicosRoutes(app: FastifyInstance) {
  app.get('/profissionais-servicos', profissionaisServicosController.index);
  app.get('/profissionais-servicos/:id', profissionaisServicosController.show);
  app.get('/profissionais/:profissionalId/servicos-convenios', profissionaisServicosController.getServicosByProfissional);
}