import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CreatePacienteUseCase } from '../../../core/application/use-cases/paciente/CreatePacienteUseCase';
import { ListPacientesUseCase } from '../../../core/application/use-cases/paciente/ListPacientesUseCase';
import { UpdatePacienteUseCase } from '../../../core/application/use-cases/paciente/UpdatePacienteUseCase';
import { DeletePacienteUseCase } from '../../../core/application/use-cases/paciente/DeletePacienteUseCase';

const bodySchema = z.object({
  nomeCompleto: z.string().min(3),
  tipoServico: z.string(),
  email: z.string().email().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  cpf: z.string().optional().nullable(),
  dataNascimento: z.coerce.date().optional().nullable(),
  convenioId: z.string().uuid().optional().nullable(),
  numeroCarteirinha: z.string().optional().nullable(),
  dataPedidoMedico: z.coerce.date().optional().nullable(),
  crm: z.string().optional().nullable(),
  cbo: z.string().optional().nullable(),
  cid: z.string().optional().nullable(),
  pedidoMedicoArquivo: z.string().optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
});

export class PacientesController {
  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    try {
      const data = bodySchema.parse(request.body);
      const useCase = container.resolve(CreatePacienteUseCase);
      const paciente = await useCase.execute(data);
      return reply.status(201).send(paciente);
    } catch (error: any) {
      // Prisma unique constraint error
      if (error.code === 'P2002' && error.meta && error.meta.target) {
        if (error.meta.target.includes('email')) {
          return reply.status(409).send({ message: 'Já existe um paciente com este e-mail.' });
        }
        if (error.meta.target.includes('cpf')) {
          return reply.status(409).send({ message: 'Já existe um paciente com este CPF.' });
        }
      }
      throw error;
    }
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const useCase = container.resolve(ListPacientesUseCase);
    const pacientes = await useCase.execute();
    return reply.status(200).send(pacientes);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const updateParamsSchema = z.object({ id: z.string().uuid() });
    const { id } = updateParamsSchema.parse(request.params);
    const data = bodySchema.parse(request.body);
    const useCase = container.resolve(UpdatePacienteUseCase);
    const paciente = await useCase.execute({ id, ...data });
    return reply.status(200).send(paciente);
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const deleteParamsSchema = z.object({ id: z.string().uuid() });
    const { id } = deleteParamsSchema.parse(request.params);
    const useCase = container.resolve(DeletePacienteUseCase);
    await useCase.execute({ id });
    return reply.status(204).send();
  }
} 