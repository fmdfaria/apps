import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { CreateEmpresaUseCase } from '../../../core/application/use-cases/empresa/CreateEmpresaUseCase';
import { ListEmpresasUseCase } from '../../../core/application/use-cases/empresa/ListEmpresasUseCase';
import { UpdateEmpresaUseCase } from '../../../core/application/use-cases/empresa/UpdateEmpresaUseCase';

interface CreateEmpresaBody {
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  site?: string;
  ativo?: boolean;
  empresaPrincipal?: boolean;
}

interface UpdateEmpresaBody {
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  site?: string;
  ativo?: boolean;
  empresaPrincipal?: boolean;
}

interface ListEmpresasQuery {
  ativo?: string;
  empresaPrincipal?: string;
}

interface EmpresaParams {
  id: string;
}

export class EmpresasController {
  async create(request: FastifyRequest<{ Body: CreateEmpresaBody }>, reply: FastifyReply) {
    try {
      const createEmpresaUseCase = container.resolve(CreateEmpresaUseCase);
      
      const empresa = await createEmpresaUseCase.execute(request.body);
      
      return reply.status(201).send({
        success: true,
        data: empresa
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async list(request: FastifyRequest<{ Querystring: ListEmpresasQuery }>, reply: FastifyReply) {
    try {
      const listEmpresasUseCase = container.resolve(ListEmpresasUseCase);
      
      const filters = {
        ...(request.query.ativo !== undefined && { ativo: request.query.ativo === 'true' }),
        ...(request.query.empresaPrincipal !== undefined && { empresaPrincipal: request.query.empresaPrincipal === 'true' })
      };

      const empresas = await listEmpresasUseCase.execute(filters);
      
      return reply.send({
        success: true,
        data: empresas
      });
    } catch (error) {
      return reply.status(500).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  async update(request: FastifyRequest<{ Params: EmpresaParams; Body: UpdateEmpresaBody }>, reply: FastifyReply) {
    try {
      const updateEmpresaUseCase = container.resolve(UpdateEmpresaUseCase);
      
      const empresa = await updateEmpresaUseCase.execute(request.params.id, request.body);
      
      return reply.send({
        success: true,
        data: empresa
      });
    } catch (error) {
      const statusCode = error instanceof Error && error.message === 'Empresa não encontrada' ? 404 : 400;
      
      return reply.status(statusCode).send({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }
}