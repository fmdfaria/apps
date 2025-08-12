import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CreateEvolucaoPacienteUseCase } from '../../../core/application/use-cases/evolucao-paciente/CreateEvolucaoPacienteUseCase';
import { ListEvolucoesPacienteUseCase } from '../../../core/application/use-cases/evolucao-paciente/ListEvolucoesPacienteUseCase';
import { UpdateEvolucaoPacienteUseCase } from '../../../core/application/use-cases/evolucao-paciente/UpdateEvolucaoPacienteUseCase';
import { DeleteEvolucaoPacienteUseCase } from '../../../core/application/use-cases/evolucao-paciente/DeleteEvolucaoPacienteUseCase';
import { GetEvolucaoByAgendamentoUseCase } from '../../../core/application/use-cases/evolucao-paciente/GetEvolucaoByAgendamentoUseCase';
import { GetStatusEvolucoesPorAgendamentosUseCase } from '../../../core/application/use-cases/evolucao-paciente/GetStatusEvolucoesPorAgendamentosUseCase';

const evolucaoBodySchema = z.object({
  pacienteId: z.string().uuid(),
  agendamentoId: z.string().uuid(),
  dataEvolucao: z.coerce.date(),
  objetivoSessao: z.string(),
  descricaoEvolucao: z.string(),
});

export class EvolucoesPacientesController {
  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const data = evolucaoBodySchema.parse(request.body);
    const useCase = container.resolve(CreateEvolucaoPacienteUseCase);
    const evolucao = await useCase.execute(data);
    return reply.status(201).send(evolucao);
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const querySchema = z.object({ pacienteId: z.string().uuid() });
    const { pacienteId } = querySchema.parse(request.query);
    const useCase = container.resolve(ListEvolucoesPacienteUseCase);
    const evolucoes = await useCase.execute(pacienteId);
    return reply.status(200).send(evolucoes);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const data = evolucaoBodySchema.partial().parse(request.body);
    const useCase = container.resolve(UpdateEvolucaoPacienteUseCase);
    const evolucao = await useCase.execute(id, data);
    return reply.status(200).send(evolucao);
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const useCase = container.resolve(DeleteEvolucaoPacienteUseCase);
    await useCase.execute(id);
    return reply.status(204).send();
  }

  async getByAgendamento(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ agendamentoId: z.string().uuid() });
    const { agendamentoId } = paramsSchema.parse(request.params);
    const useCase = container.resolve(GetEvolucaoByAgendamentoUseCase);
    const evolucao = await useCase.execute(agendamentoId);
    
    if (!evolucao) {
      return reply.status(404).send({ message: 'Evolução não encontrada para este agendamento' });
    }
    
    return reply.status(200).send(evolucao);
  }

  async getStatusPorAgendamentos(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const bodySchema = z.object({
      agendamentoIds: z.array(z.string().uuid()).min(1).max(100) // Limite de 100 para performance
    });
    const { agendamentoIds } = bodySchema.parse(request.body);
    
    const useCase = container.resolve(GetStatusEvolucoesPorAgendamentosUseCase);
    const status = await useCase.execute(agendamentoIds);
    
    return reply.status(200).send(status);
  }
} 