import { FastifyInstance } from 'fastify';
import { ProfissionaisController } from '../controllers/ProfissionaisController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

const profissionaisController = new ProfissionaisController();

export async function profissionaisRoutes(app: FastifyInstance) {
  app.post('/profissionais', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais', 'POST')] }, profissionaisController.create);
  app.get('/profissionais', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais', 'GET')] }, profissionaisController.list);
  app.get('/profissionais/me', { preHandler: [ensureAuthenticated] }, profissionaisController.getMe);
  app.put('/profissionais/:id', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais/:id', 'PUT')] }, profissionaisController.update);
  app.delete('/profissionais/:id', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais/:id', 'DELETE')] }, profissionaisController.delete);
  app.get('/profissionais/:id', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais/:id', 'GET')] }, profissionaisController.show);
  
  // Rotas específicas para edição por seção
  app.put('/profissionais/:id/endereco', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais/:id/endereco', 'PUT')] }, profissionaisController.editarEndereco);
  app.put('/profissionais/:id/informacao-profissional', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais/:id/informacao-profissional', 'PUT')] }, profissionaisController.editarInformacaoProfissional);
  app.put('/profissionais/:id/dados-bancarios', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais/:id/dados-bancarios', 'PUT')] }, profissionaisController.editarDadosBancarios);
  app.put('/profissionais/:id/empresa-contrato', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais/:id/empresa-contrato', 'PUT')] }, profissionaisController.editarEmpresaContrato);
  app.put('/profissionais/:id/servicos', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais/:id/servicos', 'PUT')] }, profissionaisController.editarServicos);
  
  // Rotas para deletar comprovantes específicos
  app.delete('/profissionais/:id/comprovante-endereco', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais/:id/comprovante-endereco', 'DELETE')] }, profissionaisController.deletarComprovanteEndereco);
  app.delete('/profissionais/:id/comprovante-registro', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais/:id/comprovante-registro', 'DELETE')] }, profissionaisController.deletarComprovanteRegistro);
  app.delete('/profissionais/:id/comprovante-bancario', { preHandler: [ensureAuthenticated, ensureAuthorized('/profissionais/:id/comprovante-bancario', 'DELETE')] }, profissionaisController.deletarComprovanteBancario);
} 