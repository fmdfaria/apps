import { Router } from 'express';
import { AgendamentosContasController } from '../controllers/AgendamentosContasController';
import { ensureAuthenticated } from '../middlewares/ensureAuthenticated';

const agendamentosContasRoutes = Router();
const agendamentosContasController = new AgendamentosContasController();

// Todas as rotas precisam de autenticação
agendamentosContasRoutes.use(ensureAuthenticated);

// 🔗 AGENDAMENTOS-CONTAS (Relacionamento)
agendamentosContasRoutes.get('/', agendamentosContasController.findAll);                          // GET /agendamentos-contas - Listar relacionamentos
agendamentosContasRoutes.post('/', agendamentosContasController.create);                         // POST /agendamentos-contas - Criar relacionamento
agendamentosContasRoutes.get('/agendamento/:id', agendamentosContasController.findByAgendamento); // GET /agendamentos-contas/agendamento/:id - Por agendamento
agendamentosContasRoutes.get('/conta-receber/:id', agendamentosContasController.findByContaReceber); // GET /agendamentos-contas/conta-receber/:id - Por conta a receber
agendamentosContasRoutes.get('/conta-pagar/:id', agendamentosContasController.findByContaPagar);  // GET /agendamentos-contas/conta-pagar/:id - Por conta a pagar
agendamentosContasRoutes.delete('/:id', agendamentosContasController.delete);                    // DELETE /agendamentos-contas/:id - Remover relacionamento

export { agendamentosContasRoutes };