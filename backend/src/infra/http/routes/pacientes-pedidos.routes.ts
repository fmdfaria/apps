import { FastifyInstance } from 'fastify';
import { PacientesPedidosController } from '../controllers/PacientesPedidosController';
import { authMiddleware } from '../middleware/authMiddleware';
import { rbacMiddleware } from '../middleware/rbacMiddleware';

export async function pacientesPedidosRoutes(fastify: FastifyInstance) {
  const controller = new PacientesPedidosController();

  // Middleware de autenticação para todas as rotas
  fastify.addHook('preHandler', authMiddleware);

  // POST /pacientes/:pacienteId/pedidos - Criar pedido médico
  fastify.post(
    '/:pacienteId/pedidos',
    {
      preHandler: [rbacMiddleware],
    },
    controller.create
  );

  // GET /pacientes/:pacienteId/pedidos - Listar pedidos médicos do paciente
  fastify.get(
    '/:pacienteId/pedidos',
    {
      preHandler: [rbacMiddleware],
    },
    controller.list
  );

  // PUT /pacientes/:pacienteId/pedidos/:id - Atualizar pedido médico
  fastify.put(
    '/:pacienteId/pedidos/:id',
    {
      preHandler: [rbacMiddleware],
    },
    controller.update
  );

  // DELETE /pacientes/:pacienteId/pedidos/:id - Excluir pedido médico
  fastify.delete(
    '/:pacienteId/pedidos/:id',
    {
      preHandler: [rbacMiddleware],
    },
    controller.delete
  );
}