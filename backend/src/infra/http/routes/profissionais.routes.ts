import { FastifyInstance } from 'fastify';
import { ProfissionaisController } from '../controllers/ProfissionaisController';

const profissionaisController = new ProfissionaisController();

export async function profissionaisRoutes(app: FastifyInstance) {
  app.post('/profissionais', profissionaisController.create);
  app.get('/profissionais', profissionaisController.list);
  app.put('/profissionais/:id', profissionaisController.update);
  app.delete('/profissionais/:id', profissionaisController.delete);
  app.get('/profissionais/:id', profissionaisController.show);
  
  // Rotas específicas para edição por seção
  app.put('/profissionais/:id/endereco', profissionaisController.editarEndereco);
  app.put('/profissionais/:id/informacao-profissional', profissionaisController.editarInformacaoProfissional);
  app.put('/profissionais/:id/dados-bancarios', profissionaisController.editarDadosBancarios);
  app.put('/profissionais/:id/empresa-contrato', profissionaisController.editarEmpresaContrato);
  app.put('/profissionais/:id/servicos', profissionaisController.editarServicos);
  
  // Rotas para deletar comprovantes específicos
  app.delete('/profissionais/:id/comprovante-endereco', profissionaisController.deletarComprovanteEndereco);
  app.delete('/profissionais/:id/comprovante-registro', profissionaisController.deletarComprovanteRegistro);
  app.delete('/profissionais/:id/comprovante-bancario', profissionaisController.deletarComprovanteBancario);
} 