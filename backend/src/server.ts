import 'reflect-metadata';
import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import 'dotenv/config';

import './shared/container';
import { AppError } from './shared/errors/AppError';
import { especialidadesRoutes } from './infra/http/routes/especialidades.routes';
import { conselhosProfissionaisRoutes } from './infra/http/routes/conselhos-profissionais.routes';
import { servicosRoutes } from './infra/http/routes/servicos.routes';
import { conveniosRoutes } from './infra/http/routes/convenios.routes';
import { pacientesRoutes } from './infra/http/routes/pacientes.routes';
import { recursosRoutes } from './infra/http/routes/recursos.routes';
import { profissionaisRoutes } from './infra/http/routes/profissionais.routes';
import { profissionaisServicosRoutes } from './infra/http/routes/profissionais-servicos.routes';
import { precosServicosProfissionaisRoutes } from './infra/http/routes/precos-servicos-profissionais.routes';
import { precosParticularesRoutes } from './infra/http/routes/precos-particulares.routes';
import { disponibilidadesProfissionaisRoutes } from './infra/http/routes/disponibilidades-profissionais.routes';
import { contratosProfissionaisRoutes } from './infra/http/routes/contratos-profissionais.routes';
import { adendosContratosRoutes } from './infra/http/routes/adendos-contratos.routes';
import { anexosRoutes } from './infra/http/routes/anexos.routes';
import { agendamentosRoutes } from './infra/http/routes/agendamentos.routes';
import { evolucoesPacientesRoutes } from './infra/http/routes/evolucoes-pacientes.routes';
import { pacientesPedidosRoutes } from './infra/http/routes/pacientes-pedidos.routes';
import { authRoutes } from './infra/http/routes/auth.routes';
import { usersRoutes } from './infra/http/routes/users.routes';
import { bancosRoutes } from './infra/http/routes/bancos.routes';
import { rolesRoutes } from './infra/http/routes/roles.routes';
import { routesRoutes } from './infra/http/routes/routes.routes';
import { userRolesRoutes } from './infra/http/routes/user-roles.routes';
import { roleRoutesRoutes } from './infra/http/routes/role-routes.routes';
import { filaEsperaRoutes } from './infra/http/routes/fila-espera.routes';
import { configuracoesRoutes } from './infra/http/routes/configuracoes.routes';
import { dashboardRoutes } from './infra/http/routes/dashboard.routes';
import { empresasRoutes } from './infra/http/routes/empresas.routes';
import { contasReceberRoutes } from './infra/http/routes/contas-receber.routes';

const app = fastify({
  logger: true,
});

app.register(cors, {
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
});

app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB, ajuste conforme sua necessidade
  }
});

app.register(especialidadesRoutes);
app.register(conselhosProfissionaisRoutes);
app.register(servicosRoutes);
app.register(conveniosRoutes);
app.register(pacientesRoutes);
app.register(recursosRoutes);
app.register(profissionaisRoutes);
app.register(profissionaisServicosRoutes);
app.register(precosServicosProfissionaisRoutes);
app.register(precosParticularesRoutes);
app.register(disponibilidadesProfissionaisRoutes);
app.register(contratosProfissionaisRoutes);
app.register(adendosContratosRoutes);
app.register(anexosRoutes);
app.register(agendamentosRoutes);
app.register(evolucoesPacientesRoutes);
app.register(pacientesPedidosRoutes, { prefix: '/pacientes' });
app.register(authRoutes);
app.register(usersRoutes);
app.register(bancosRoutes);
app.register(rolesRoutes);
app.register(routesRoutes);
app.register(userRolesRoutes);
app.register(roleRoutesRoutes);
app.register(filaEsperaRoutes);
app.register(configuracoesRoutes);
app.register(dashboardRoutes, { prefix: '/dashboard' });
app.register(empresasRoutes);
app.register(contasReceberRoutes);

// Health check route
app.get('/', async (request, reply) => {
  return { status: 'ok', message: 'Probotec Clinica API is running' };
});

app.setErrorHandler((error, request, reply) => {
  if (error instanceof ZodError) {
    return reply
      .status(400)
      .send({ message: 'Validation error.', issues: error.format() });
  }

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ message: error.message });
  }

  app.log.error(error);

  return reply.status(500).send({ message: 'Internal server error.' });
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3333;
    const host = process.env.HOST || '0.0.0.0';
    
    await app.listen({ port, host });
    app.log.info(`Server listening on http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start(); 