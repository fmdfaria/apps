import { FastifyInstance } from 'fastify';
import { AgendamentosController } from '../controllers/AgendamentosController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';
import { ensureAuthorized } from '../middlewares/ensureAuthorized';

const controller = new AgendamentosController();

export async function agendamentosRoutes(app: FastifyInstance) {
  app.get('/agendamentos', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos', 'GET')] 
  }, controller.list);

  app.get('/agendamentos/form-data', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos/form-data', 'GET')] 
  }, controller.getFormData);

  app.get('/agendamentos/:id/series-info', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos/:id', 'GET')] 
  }, controller.getSeriesInfo);
  
  app.post('/agendamentos', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos', 'POST')] 
  }, controller.create);
  
  app.put('/agendamentos/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos/:id', 'PUT')] 
  }, controller.update);
  
  app.delete('/agendamentos/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos/:id', 'DELETE')] 
  }, controller.delete);
  
  // Rota específica para liberação de agendamentos
  app.put('/agendamentos-liberar/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos-liberar/:id', 'PUT')] 
  }, controller.liberar);
  
  // Rota específica para liberação de agendamentos particulares
  app.put('/agendamentos-liberar-particular/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos-liberar-particular/:id', 'PUT')] 
  }, controller.liberarParticular);
  
  // Rota específica para liberação de agendamentos particulares mensais (grupo)
  app.put('/agendamentos-liberar-particular-mensal', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos-liberar-particular-mensal', 'PUT')] 
  }, controller.liberarParticularMensal);
  
  // Rota específica para atendimento de agendamentos
  app.put('/agendamentos-atender/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos-atender/:id', 'PUT')] 
  }, controller.atender);
  
  // Rota específica para conclusão de agendamentos
  app.put('/agendamentos-concluir/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos-concluir/:id', 'PUT')] 
  }, controller.concluir);
  
  // Rota dedicada para atualização de status de agendamentos
  app.patch('/agendamentos/:id/status', {
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos/:id/status', 'PATCH')]
  }, controller.updateStatus);

  // Rota para alteração livre de status (qualquer → qualquer)
  app.put('/agendamentos-alterar-status/:id', {
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos-alterar-status/:id', 'PUT')]
  }, controller.alterarStatus);

  // Rota específica para resolver pendências (PENDENTE → ATENDIDO)
  app.put('/agendamentos-pendencias/:id', { 
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos-pendencias/:id', 'PUT')] 
  }, controller.pendencia);
  
  // Rota específica para fechamento de pagamento
  app.post('/agendamentos/fechamento-pagamento', {
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos/fechamento-pagamento', 'POST')]
  }, controller.fechamentoPagamento);

  // Rota específica para fechamento de recebimento
  app.post('/agendamentos/fechamento-recebimento', {
    preHandler: [ensureAuthenticated, ensureAuthorized('/agendamentos/fechamento-recebimento', 'POST')]
  }, controller.fechamentoRecebimento);

  // Rota para buscar dados de webhook de pagamento profissional
  app.get('/agendamentos-pagamentos/:profissionalId/webhook-data', {
    preHandler: [
      ensureAuthenticated,
      ensureAuthorized('/agendamentos-pagamentos/:profissionalId/webhook-data', 'GET')
    ]
  }, (request, reply) => controller.getPagamentoProfissionalWebhookData(request as any, reply as any));

  // Rota para marcar agendamentos como WhatsApp enviado
  app.put('/agendamentos-pagamentos/marcar-whatsapp-enviado', {
    preHandler: [
      ensureAuthenticated,
      ensureAuthorized('/agendamentos-pagamentos/marcar-whatsapp-enviado', 'PUT')
    ]
  }, (request, reply) => controller.marcarWhatsappPagamentoEnviado(request as any, reply as any));
} 