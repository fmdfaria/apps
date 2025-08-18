import { FastifyInstance } from 'fastify';
import { ProfissionaisController } from '../controllers/ProfissionaisController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

const profissionaisController = new ProfissionaisController();

export async function profissionaisRoutes(app: FastifyInstance) {
  app.post('/profissionais', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais', 'POST')] }, profissionaisController.create.bind(profissionaisController));
  app.get('/profissionais', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais', 'GET')] }, profissionaisController.list.bind(profissionaisController));
  app.get('/profissionais/me', { preHandler: [ensureAuthenticated] }, profissionaisController.getMe.bind(profissionaisController));
  app.put('/profissionais/:id', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais/:id', 'PUT')] }, profissionaisController.update.bind(profissionaisController));
  app.delete('/profissionais/:id', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais/:id', 'DELETE')] }, profissionaisController.delete.bind(profissionaisController));
  app.get('/profissionais/:id', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais/:id', 'GET')] }, profissionaisController.show.bind(profissionaisController));
  
  // Rotas específicas para edição por seção
  app.put('/profissionais/:id/endereco', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais/:id/endereco', 'PUT')] }, profissionaisController.editarEndereco.bind(profissionaisController));
  app.put('/profissionais/:id/informacao-profissional', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais/:id/informacao-profissional', 'PUT')] }, profissionaisController.editarInformacaoProfissional.bind(profissionaisController));
  app.put('/profissionais/:id/dados-bancarios', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais/:id/dados-bancarios', 'PUT')] }, profissionaisController.editarDadosBancarios.bind(profissionaisController));
  app.put('/profissionais/:id/empresa-contrato', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais/:id/empresa-contrato', 'PUT')] }, profissionaisController.editarEmpresaContrato.bind(profissionaisController));
  app.put('/profissionais/:id/servicos', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais/:id/servicos', 'PUT')] }, profissionaisController.editarServicos.bind(profissionaisController));
  app.patch('/profissionais/:id/status', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais/:id/status', 'PATCH')] }, profissionaisController.updateStatus.bind(profissionaisController));
  
  // Rotas para deletar comprovantes específicos
  app.delete('/profissionais/:id/comprovante-endereco', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais/:id/comprovante-endereco', 'DELETE')] }, profissionaisController.deletarComprovanteEndereco.bind(profissionaisController));
  app.delete('/profissionais/:id/comprovante-registro', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais/:id/comprovante-registro', 'DELETE')] }, profissionaisController.deletarComprovanteRegistro.bind(profissionaisController));
  app.delete('/profissionais/:id/comprovante-bancario', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais/:id/comprovante-bancario', 'DELETE')] }, profissionaisController.deletarComprovanteBancario.bind(profissionaisController));
} 