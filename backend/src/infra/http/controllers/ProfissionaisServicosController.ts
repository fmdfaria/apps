import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { ListProfissionaisServicosUseCase } from '../../../core/application/use-cases/profissional-servico/ListProfissionaisServicosUseCase';
import { ListProfissionaisByServicoUseCase } from '../../../core/application/use-cases/profissional-servico/ListProfissionaisByServicoUseCase';

export class ProfissionaisServicosController {
  async index(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const listProfissionaisServicosUseCase = container.resolve(ListProfissionaisServicosUseCase);

    const profissionaisServicos = await listProfissionaisServicosUseCase.execute();

    return reply.status(200).send(profissionaisServicos);
  }

  async show(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const { id } = paramsSchema.parse(request.params);

    const listProfissionaisByServicoUseCase = container.resolve(ListProfissionaisByServicoUseCase);

    const profissionaisServicos = await listProfissionaisByServicoUseCase.execute({
      servicoId: id,
    });

    return reply.status(200).send(profissionaisServicos);
  }

  async getServicosByProfissional(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({
      profissionalId: z.string().uuid(),
    });

    const { profissionalId } = paramsSchema.parse(request.params);

    try {
      const listProfissionaisServicosUseCase = container.resolve(ListProfissionaisServicosUseCase);
      
      // Buscar todos os relacionamentos profissional-serviço
      const profissionaisServicos = await listProfissionaisServicosUseCase.execute();
      
      // Filtrar apenas os serviços do profissional específico
      const servicosProfissional = profissionaisServicos.filter(
        ps => ps.profissional.id === profissionalId
      );

      // Extrair serviços únicos e seus convênios
      const servicosComConvenios = servicosProfissional.map(ps => ({
        id: ps.servico.id,
        nome: ps.servico.nome,
        duracaoMinutos: ps.servico.duracaoMinutos,
        valor: ps.servico.valor,
        convenio: {
          id: ps.servico.convenio.id,
          nome: ps.servico.convenio.nome
        }
      }));

      // Remover duplicatas baseando-se no ID do serviço
      const servicosUnicos = servicosComConvenios.filter((servico, index, arr) => 
        arr.findIndex(s => s.id === servico.id) === index
      );

      // Extrair convênios únicos
      const conveniosUnicos = servicosUnicos
        .map(s => s.convenio)
        .filter((convenio, index, arr) => 
          arr.findIndex(c => c.id === convenio.id) === index
        );

      return reply.status(200).send({
        profissionalId,
        servicos: servicosUnicos,
        convenios: conveniosUnicos
      });
    } catch (error) {
      return reply.status(500).send({ 
        message: 'Erro ao buscar serviços e convênios do profissional', 
        error 
      });
    }
  }
}