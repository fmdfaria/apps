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
import { precosServicosProfissionaisRoutes } from './infra/http/routes/precos-servicos-profissionais.routes';
import { precosParticularesRoutes } from './infra/http/routes/precos-particulares.routes';
import { disponibilidadesProfissionaisRoutes } from './infra/http/routes/disponibilidades-profissionais.routes';
import { contratosProfissionaisRoutes } from './infra/http/routes/contratos-profissionais.routes';
import { adendosContratosRoutes } from './infra/http/routes/adendos-contratos.routes';
import { anexosRoutes } from './infra/http/routes/anexos.routes';
import { agendamentosRoutes } from './infra/http/routes/agendamentos.routes';
import { evolucoesPacientesRoutes } from './infra/http/routes/evolucoes-pacientes.routes';
import { authRoutes } from './infra/http/routes/auth.routes';
import { usersRoutes } from './infra/http/routes/users.routes';

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
app.register(precosServicosProfissionaisRoutes);
app.register(precosParticularesRoutes);
app.register(disponibilidadesProfissionaisRoutes);
app.register(contratosProfissionaisRoutes);
app.register(adendosContratosRoutes);
app.register(anexosRoutes);
app.register(agendamentosRoutes);
app.register(evolucoesPacientesRoutes);
app.register(authRoutes);
app.register(usersRoutes);

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
    await app.listen({ port: 3001, host: '0.0.0.0' });
    app.log.info(`Server listening on http://localhost:3001`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start(); 