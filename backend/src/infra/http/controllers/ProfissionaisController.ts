import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CreateProfissionalUseCase } from '../../../core/application/use-cases/profissional/CreateProfissionalUseCase';
import { ListProfissionaisUseCase } from '../../../core/application/use-cases/profissional/ListProfissionaisUseCase';
import { UpdateProfissionalUseCase } from '../../../core/application/use-cases/profissional/UpdateProfissionalUseCase';
import { DeleteProfissionalUseCase } from '../../../core/application/use-cases/profissional/DeleteProfissionalUseCase';
import { GetProfissionalByUserIdUseCase } from '../../../core/application/use-cases/profissional/GetProfissionalByUserIdUseCase';
import { IProfissionaisRepository } from '../../../core/domain/repositories/IProfissionaisRepository';
import { S3StorageService } from '../../../shared/services/S3StorageService';
import { UpdateProfissionalStatusUseCase } from '../../../core/application/use-cases/profissional/UpdateProfissionalStatusUseCase';

export class ProfissionaisController {
  private s3Service: S3StorageService;

  constructor() {
    this.s3Service = new S3StorageService();
  }
  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const createBodySchema = z.object({
      nome: z.string(),
      cpf: z.string(),
      email: z.string().email(),
      whatsapp: z.string().optional(),
    });

    const body = createBodySchema.parse(request.body);
    
    const data = {
      ...body,
      especialidadesIds: [],
      servicosIds: [],
    };

    const useCase = container.resolve(CreateProfissionalUseCase);
    const profissional = await useCase.execute(data);
    
    return reply.status(201).send(profissional);
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const querySchema = z.object({
      ativo: z.coerce.boolean().optional(),
    });
    const { ativo } = querySchema.parse(request.query);

    if (ativo === true) {
      const repo = container.resolve('ProfissionaisRepository') as IProfissionaisRepository;
      const profissionais = await repo.findAllActive();
      return reply.status(200).send(profissionais);
    }

    const useCase = container.resolve(ListProfissionaisUseCase);
    const profissionais = await useCase.execute();
    return reply.status(200).send(profissionais);
  }

  async getMe(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    // Extrair userId do token JWT
    const userId = request.user?.id;
    
    if (!userId) {
      return reply.status(401).send({ message: 'Token inválido ou usuário não autenticado.' });
    }

    const useCase = container.resolve(GetProfissionalByUserIdUseCase);
    const profissional = await useCase.execute(userId);
    
    if (!profissional) {
      return reply.status(404).send({ message: 'Profissional não encontrado para este usuário.' });
    }
    
    return reply.status(200).send(profissional);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);

    // Buscar profissional atual
    const useCase = container.resolve(UpdateProfissionalUseCase);
    const repo = container.resolve('ProfissionaisRepository') as IProfissionaisRepository;
    const profissionalAtual = await repo.findById(id);
    if (!profissionalAtual) {
      return reply.status(404).send({ message: 'Profissional não encontrado.' });
    }

    // Verificar se é multipart/form-data
    const isMultipart = request.headers['content-type']?.includes('multipart/form-data');
    
    let body: any = {};
    let comprovanteEnderecoUrl: string | undefined = profissionalAtual.comprovanteEndereco || undefined;
    let comprovanteRegistroUrl: string | undefined = profissionalAtual.comprovanteRegistro || undefined;
    let comprovanteBancarioUrl: string | undefined = profissionalAtual.comprovanteBancario || undefined;

    if (isMultipart) {
      // @ts-ignore
      const parts = request.parts();

      for await (const part of parts) {
        if (part.type === 'file') {
          let path = part.filename;
          const fileBuffer = await part.toBuffer();
          
          if (part.fieldname === 'comprovante_endereco') {
            const uploadResult = await this.s3Service.uploadFile({
              buffer: fileBuffer,
              filename: part.filename || 'comprovante_endereco',
              mimetype: part.mimetype || 'application/octet-stream',
              modulo: 'profissionais',
              categoria: 'comprovantes',
              entidadeId: profissionalAtual.id,
              metadata: { 'document-type': 'comprovante_endereco' }
            });
            comprovanteEnderecoUrl = uploadResult.url;
          } else if (part.fieldname === 'comprovante_registro') {
            const uploadResult = await this.s3Service.uploadFile({
              buffer: fileBuffer,
              filename: part.filename || 'comprovante_registro',
              mimetype: part.mimetype || 'application/octet-stream',
              modulo: 'profissionais',
              categoria: 'comprovantes',
              entidadeId: profissionalAtual.id,
              metadata: { 'document-type': 'comprovante_registro' }
            });
            comprovanteRegistroUrl = uploadResult.url;
          } else if (part.fieldname === 'comprovante_bancario') {
            const uploadResult = await this.s3Service.uploadFile({
              buffer: fileBuffer,
              filename: part.filename || 'comprovante_bancario',
              mimetype: part.mimetype || 'application/octet-stream',
              modulo: 'profissionais',
              categoria: 'comprovantes',
              entidadeId: profissionalAtual.id,
              metadata: { 'document-type': 'comprovante_bancario' }
            });
            comprovanteBancarioUrl = uploadResult.url;
          }
        } else if (part.type === 'field' && 'value' in part && typeof part.value === 'string') {
          body[part.fieldname] = part.value;
        }
      }
    } else {
      // Se não é multipart, pegar dados do body JSON
      body = request.body || {};
    }

    // Mapear snake_case para camelCase antes de montar o objeto data (update)
    if ('comprovante_registro' in body) {
      body.comprovanteRegistro = body.comprovante_registro;
      delete body.comprovante_registro;
    }
    if ('comprovante_bancario' in body) {
      body.comprovanteBancario = body.comprovante_bancario;
      delete body.comprovante_bancario;
    }
    if ('comprovante_endereco' in body) {
      body.comprovanteEndereco = body.comprovante_endereco;
      delete body.comprovante_endereco;
    }

    // Montar o objeto de atualização
    const data = {
      ...body,
      comprovanteEndereco: comprovanteEnderecoUrl,
      comprovanteRegistro: comprovanteRegistroUrl,
      comprovanteBancario: comprovanteBancarioUrl,
    };
    
    // Converter campos string vazia para undefined
    Object.keys(data).forEach(key => {
      if (typeof data[key] === 'string' && data[key].trim() === '') {
        data[key] = undefined;
      }
    });
    
    // Para arrays de IDs, só incluir se enviados e filtrar valores vazios
    if ('especialidadesIds' in data) {
      if (typeof data.especialidadesIds === 'string') {
        try {
          data.especialidadesIds = JSON.parse(data.especialidadesIds);
        } catch {
          data.especialidadesIds = [];
        }
      }
      if (Array.isArray(data.especialidadesIds)) {
        data.especialidadesIds = data.especialidadesIds.filter((id: string) => !!id && id.trim() !== '');
        if (data.especialidadesIds.length === 0) delete data.especialidadesIds;
      } else {
        delete data.especialidadesIds;
      }
    }
    
    if ('servicosIds' in data) {
      if (typeof data.servicosIds === 'string') {
        try {
          data.servicosIds = JSON.parse(data.servicosIds);
        } catch {
          data.servicosIds = [];
        }
      }
      if (Array.isArray(data.servicosIds)) {
        data.servicosIds = data.servicosIds.filter((id: string) => !!id && id.trim() !== '');
        if (data.servicosIds.length === 0) delete data.servicosIds;
      } else {
        delete data.servicosIds;
      }
    }
    
    const profissional = await useCase.execute({ id, ...data });
    return reply.status(200).send(profissional);
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const repo = container.resolve('ProfissionaisRepository') as IProfissionaisRepository;
    const profissional = await repo.findById(id);
    if (!profissional) {
      return reply.status(404).send({ message: 'Profissional não encontrado.' });
    }
    // Remover arquivos do bucket se existirem
    // Delete S3 files - URLs não são mais keys diretas, então skip por enquanto
    // TODO: Implementar lógica para deletar por S3 key quando disponível
    const useCase = container.resolve(DeleteProfissionalUseCase);
    await useCase.execute({ id });
    return reply.status(204).send();
  }

  async updateStatus(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const bodySchema = z.object({ ativo: z.boolean() });
    const { ativo } = bodySchema.parse(request.body);
    const useCase = container.resolve(UpdateProfissionalStatusUseCase);
    const profissional = await useCase.execute({ id, ativo });
    return reply.status(200).send(profissional);
  }

  async show(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const repo = container.resolve('ProfissionaisRepository') as IProfissionaisRepository;
    const profissional = await repo.findById(id);
    if (!profissional) {
      return reply.status(404).send({ message: 'Profissional não encontrado.' });
    }
    return reply.status(200).send(profissional);
  }

  async editarEndereco(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);

    // Buscar profissional atual para obter o comprovante anterior
    const repo = container.resolve('ProfissionaisRepository') as IProfissionaisRepository;
    const profissionalAtual = await repo.findById(id);
    if (!profissionalAtual) {
      return reply.status(404).send({ message: 'Profissional não encontrado.' });
    }

    // Verificar se é multipart/form-data
    const isMultipart = request.headers['content-type']?.includes('multipart/form-data');
    
    let endereco: any = {};
    let comprovanteEnderecoUrl: string | undefined = profissionalAtual.comprovanteEndereco || undefined;

    if (isMultipart) {
      // @ts-ignore
      const parts = request.parts();
      const body: any = {};
      let hasFile = false;

      for await (const part of parts) {
        if (part.type === 'file') {
          hasFile = true;
          
          // Aceitar tanto 'comprovante_endereco' quanto 'file'
          if (part.fieldname === 'comprovante_endereco' || part.fieldname === 'file') {
            try {
              const fileBuffer = await part.toBuffer();
              
              const uploadResult = await this.s3Service.uploadFile({
                buffer: fileBuffer,
                filename: part.filename || 'comprovante_endereco',
                mimetype: part.mimetype || 'application/octet-stream',
                modulo: 'profissionais',
                categoria: 'comprovantes',
                entidadeId: id,
                metadata: { 'document-type': 'comprovante_endereco' }
              });
              
              comprovanteEnderecoUrl = uploadResult.url;
            } catch (err) {
              return reply.status(500).send({ message: 'Erro no upload do arquivo', error: err });
            }
          }
        } else if (part.type === 'field' && 'value' in part && typeof part.value === 'string') {
          body[part.fieldname] = part.value;
        }
      }
      
      endereco = {
        cep: body.cep,
        logradouro: body.logradouro,
        numero: body.numero,
        complemento: body.complemento,
        bairro: body.bairro,
        cidade: body.cidade,
        estado: body.estado,
      };
    } else {
      // Se não é multipart, pegar dados do body JSON
      const bodySchema = z.object({
        cep: z.string().optional(),
        logradouro: z.string().optional(),
        numero: z.string().optional(),
        complemento: z.string().optional(),
        bairro: z.string().optional(),
        cidade: z.string().optional(),
        estado: z.string().optional(),
      });
      
      try {
        endereco = bodySchema.parse(request.body);
      } catch (parseError) {
        return reply.status(400).send({ message: 'Dados inválidos', error: parseError });
      }
    }

    const updateData = {
      ...endereco,
      ...(comprovanteEnderecoUrl && { comprovanteEndereco: comprovanteEnderecoUrl }),
    };

    try {
      const useCase = container.resolve(UpdateProfissionalUseCase);
      const profissional = await useCase.execute({ id, ...updateData });
      
      return reply.status(200).send(profissional);
    } catch (useCaseError) {
      return reply.status(500).send({ message: 'Erro ao atualizar profissional', error: useCaseError });
    }
  }

  async editarInformacaoProfissional(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);

    // Buscar profissional atual para obter o comprovante anterior
    const repo = container.resolve('ProfissionaisRepository') as IProfissionaisRepository;
    const profissionalAtual = await repo.findById(id);
    if (!profissionalAtual) {
      return reply.status(404).send({ message: 'Profissional não encontrado.' });
    }

    // Verificar se é multipart/form-data
    const isMultipart = request.headers['content-type']?.includes('multipart/form-data');
    
    let dadosProfissionais: any = {};
    let especialidadesIds: string[] = [];
    let comprovanteRegistroUrl: string | undefined = profissionalAtual.comprovanteRegistro || undefined;

    if (isMultipart) {
      // @ts-ignore
      const parts = request.parts();
      const body: any = {};

      for await (const part of parts) {
        if (part.type === 'file') {
          if (part.fieldname === 'comprovante_registro' || part.fieldname === 'file') {
            try {
              const fileBuffer = await part.toBuffer();
              
              const uploadResult = await this.s3Service.uploadFile({
                buffer: fileBuffer,
                filename: part.filename || 'comprovante_registro',
                mimetype: part.mimetype || 'application/octet-stream',
                modulo: 'profissionais',
                categoria: 'comprovantes',
                entidadeId: id,
                metadata: { 'document-type': 'comprovante_registro' }
              });
              
              comprovanteRegistroUrl = uploadResult.url;
            } catch (err) {
              return reply.status(500).send({ message: 'Erro no upload do arquivo', error: err });
            }
          }
        } else if (part.type === 'field' && 'value' in part && typeof part.value === 'string') {
          body[part.fieldname] = part.value;
        }
      }

      dadosProfissionais = {
        conselhoId: body.conselhoId,
        numeroConselho: body.numeroConselho,
      };

      // Processar especialidades
      if (body.especialidadesIds) {
        try {
          especialidadesIds = JSON.parse(body.especialidadesIds);
        } catch {
          especialidadesIds = [];
        }
      }
    } else {
      // Se não é multipart, pegar dados do body JSON
      const bodySchema = z.object({
        conselhoId: z.string().uuid().optional(),
        numeroConselho: z.string().optional(),
        especialidadesIds: z.array(z.string().uuid()).default([]),
      });
      
      const body = bodySchema.parse(request.body);
      dadosProfissionais = {
        conselhoId: body.conselhoId,
        numeroConselho: body.numeroConselho,
      };
      especialidadesIds = body.especialidadesIds;
    }

    const updateData = {
      ...dadosProfissionais,
      especialidadesIds,
      ...(comprovanteRegistroUrl && { comprovanteRegistro: comprovanteRegistroUrl }),
    };

    const useCase = container.resolve(UpdateProfissionalUseCase);
    const profissional = await useCase.execute({ id, ...updateData });
    
    return reply.status(200).send(profissional);
  }

  async editarDadosBancarios(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);

    // Buscar profissional atual para obter o comprovante anterior
    const repo = container.resolve('ProfissionaisRepository') as IProfissionaisRepository;
    const profissionalAtual = await repo.findById(id);
    if (!profissionalAtual) {
      return reply.status(404).send({ message: 'Profissional não encontrado.' });
    }

    // Verificar se é multipart/form-data
    const isMultipart = request.headers['content-type']?.includes('multipart/form-data');
    
    let dadosBancarios: any = {};
    let comprovanteBancarioUrl: string | undefined = profissionalAtual.comprovanteBancario || undefined;

    if (isMultipart) {
      // @ts-ignore
      const parts = request.parts();
      const body: any = {};

      for await (const part of parts) {
        if (part.type === 'file') {
          if (part.fieldname === 'comprovante_bancario' || part.fieldname === 'file') {
            try {
              const fileBuffer = await part.toBuffer();
              
              const uploadResult = await this.s3Service.uploadFile({
                buffer: fileBuffer,
                filename: part.filename || 'comprovante_bancario',
                mimetype: part.mimetype || 'application/octet-stream',
                modulo: 'profissionais',
                categoria: 'comprovantes',
                entidadeId: id,
                metadata: { 'document-type': 'comprovante_bancario' }
              });
              
              comprovanteBancarioUrl = uploadResult.url;
            } catch (err) {
              return reply.status(500).send({ message: 'Erro no upload do arquivo', error: err });
            }
          }
        } else if (part.type === 'field' && 'value' in part && typeof part.value === 'string') {
          body[part.fieldname] = part.value;
        }
      }

      dadosBancarios = {
        banco: body.banco,
        tipoConta: body.tipo_conta,
        agencia: body.agencia,
        contaNumero: body.conta_numero,
        contaDigito: body.conta_digito,
        tipo_pix: body.tipo_pix,
        pix: body.pix,
      };
    } else {
      // Se não é multipart, pegar dados do body JSON
      const bodySchema = z.object({
        banco: z.string().optional(),
        tipoConta: z.string().optional(),
        agencia: z.string().optional(),
        contaNumero: z.string().optional(),
        contaDigito: z.string().optional(),
        tipo_pix: z.string().optional(),
        pix: z.string().optional(),
      });
      
      dadosBancarios = bodySchema.parse(request.body);
    }

    const updateData = {
      ...dadosBancarios,
      ...(comprovanteBancarioUrl && { comprovanteBancario: comprovanteBancarioUrl }),
    };

    const useCase = container.resolve(UpdateProfissionalUseCase);
    const profissional = await useCase.execute({ id, ...updateData });
    
    return reply.status(200).send(profissional);
  }

  async editarEmpresaContrato(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);

    const bodySchema = z.object({
      cnpj: z.string().optional(),
      razaoSocial: z.string().optional(),
    });

    const body = bodySchema.parse(request.body);

    const useCase = container.resolve(UpdateProfissionalUseCase);
    const profissional = await useCase.execute({ id, ...body });
    
    return reply.status(200).send(profissional);
  }

  async editarServicos(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);

    const bodySchema = z.object({
      servicosIds: z.array(z.string().uuid()).default([]),
    });

    const body = bodySchema.parse(request.body);

    const useCase = container.resolve(UpdateProfissionalUseCase);
    const profissional = await useCase.execute({ id, servicosIds: body.servicosIds });
    
    return reply.status(200).send(profissional);
  }

  async deletarComprovanteEndereco(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);

    // Buscar profissional atual para obter o comprovante
    const repo = container.resolve('ProfissionaisRepository') as IProfissionaisRepository;
    const profissional = await repo.findById(id);
    if (!profissional) {
      return reply.status(404).send({ message: 'Profissional não encontrado.' });
    }

    if (!profissional.comprovanteEndereco) {
      return reply.status(404).send({ message: 'Nenhum comprovante de endereço encontrado.' });
    }

    try {
      // Remover arquivo do bucket
      // TODO: Implementar remoção de arquivo S3 antigo quando disponível o S3 key

      // Atualizar no banco removendo a URL
      const useCase = container.resolve(UpdateProfissionalUseCase);
      const profissionalAtualizado = await useCase.execute({ 
        id, 
        comprovanteEndereco: null 
      });

      return reply.status(200).send(profissionalAtualizado);
    } catch (error) {
      return reply.status(500).send({ message: 'Erro ao deletar comprovante de endereço', error });
    }
  }

  async deletarComprovanteRegistro(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);

    // Buscar profissional atual para obter o comprovante
    const repo = container.resolve('ProfissionaisRepository') as IProfissionaisRepository;
    const profissional = await repo.findById(id);
    if (!profissional) {
      return reply.status(404).send({ message: 'Profissional não encontrado.' });
    }

    if (!profissional.comprovanteRegistro) {
      return reply.status(404).send({ message: 'Nenhum comprovante de registro encontrado.' });
    }

    try {
      // Remover arquivo do bucket
      // TODO: Implementar remoção de arquivo S3 antigo quando disponível o S3 key

      // Atualizar no banco removendo a URL
      const useCase = container.resolve(UpdateProfissionalUseCase);
      const profissionalAtualizado = await useCase.execute({ 
        id, 
        comprovanteRegistro: null 
      });

      return reply.status(200).send(profissionalAtualizado);
    } catch (error) {
      return reply.status(500).send({ message: 'Erro ao deletar comprovante de registro', error });
    }
  }

  async deletarComprovanteBancario(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);

    // Buscar profissional atual para obter o comprovante
    const repo = container.resolve('ProfissionaisRepository') as IProfissionaisRepository;
    const profissional = await repo.findById(id);
    if (!profissional) {
      return reply.status(404).send({ message: 'Profissional não encontrado.' });
    }

    if (!profissional.comprovanteBancario) {
      return reply.status(404).send({ message: 'Nenhum comprovante bancário encontrado.' });
    }

    try {
      // Remover arquivo do bucket
      // TODO: Implementar remoção de arquivo S3 antigo quando disponível o S3 key

      // Atualizar no banco removendo a URL
      const useCase = container.resolve(UpdateProfissionalUseCase);
      const profissionalAtualizado = await useCase.execute({ 
        id, 
        comprovanteBancario: null 
      });

      return reply.status(200).send(profissionalAtualizado);
    } catch (error) {
      return reply.status(500).send({ message: 'Erro ao deletar comprovante bancário', error });
    }
  }
} 