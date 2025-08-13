import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CreateAnexoUseCase } from '../../../core/application/use-cases/anexo/CreateAnexoUseCase';
import { ListAnexosUseCase } from '../../../core/application/use-cases/anexo/ListAnexosUseCase';
import { DeleteAnexoUseCase } from '../../../core/application/use-cases/anexo/DeleteAnexoUseCase';
import { UpdateAnexoUseCase } from '../../../core/application/use-cases/anexo/UpdateAnexoUseCase';
import { S3StorageService } from '../../../shared/services/S3StorageService';
import crypto from 'crypto';

const anexoMultipartSchema = z.object({
  entidadeId: z.string().uuid(),
  modulo: z.string(), // 'pacientes', 'profissionais', etc.
  categoria: z.string(), // 'documentos', 'exames', etc.
  descricao: z.string().optional(),
  criadoPor: z.string().uuid().optional(),
});

export class AnexosController {
  private s3Service: S3StorageService;

  constructor() {
    this.s3Service = new S3StorageService();
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    try {
      const mp = await request.file();

      if (!mp) {
        return reply.status(400).send({ message: 'Arquivo não enviado.' });
      }

      // Extrair os valores dos campos corretamente
      const getFieldValue = (field: any) => (field && typeof field.value === 'string' ? field.value : undefined);
      const fields = {
        entidadeId: getFieldValue(mp.fields.entidadeId),
        modulo: getFieldValue(mp.fields.modulo),
        categoria: getFieldValue(mp.fields.categoria),
        descricao: getFieldValue(mp.fields.descricao),
        criadoPor: getFieldValue(mp.fields.criadoPor),
      };

      const parsedFields = anexoMultipartSchema.parse(fields);
      const { entidadeId, modulo, categoria, descricao, criadoPor } = parsedFields;

      const fileBuffer = await mp.toBuffer();
      const nomeArquivo = mp.filename || 'arquivo_sem_nome';

      // Upload para S3
      const uploadResult = await this.s3Service.uploadFile({
        buffer: fileBuffer,
        filename: nomeArquivo,
        mimetype: mp.mimetype || 'application/octet-stream',
        modulo,
        categoria,
        entidadeId,
        metadata: {
          'uploaded-by': criadoPor || 'unknown',
          'description': descricao || ''
        }
      });

      // Salvar no banco de dados
      const useCase = container.resolve(CreateAnexoUseCase);
      const anexo = await useCase.execute({
        entidadeId,
        bucket: modulo, // Manter compatibilidade, mas usar modulo
        nomeArquivo,
        descricao,
        criadoPor,
        url: uploadResult.url,
        // Novos campos para S3
        s3Key: uploadResult.s3Key,
        tamanhoBytes: uploadResult.size,
        mimeType: uploadResult.mimetype,
        hashArquivo: uploadResult.hash,
        storageProvider: 'S3'
      });

      return reply.status(201).send(anexo);
    } catch (error: any) {
      console.error('Erro no upload:', error);
      return reply.status(500).send({ 
        message: 'Erro interno do servidor', 
        error: error.message 
      });
    }
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const querySchema = z.object({
      entidadeId: z.string().uuid().optional(),
    });
    const filters = querySchema.parse(request.query);
    const useCase = container.resolve(ListAnexosUseCase);
    const anexos = await useCase.execute(filters);
    return reply.status(200).send(anexos);
  }

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    try {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const { id } = paramsSchema.parse(request.params);

      // Buscar anexo antes de deletar
      const listUseCase = container.resolve(ListAnexosUseCase);
      const anexos = await listUseCase.execute({});
      const anexo = anexos.find((a: any) => a.id === id);
      
      if (!anexo) {
        return reply.status(404).send({ message: 'Anexo não encontrado.' });
      }

      // Remover do S3 se tiver s3Key
      if (anexo.s3Key) {
        await this.s3Service.deleteFile(anexo.s3Key);
      }

      // Remover do banco
      const useCase = container.resolve(DeleteAnexoUseCase);
      await useCase.execute(id);

      return reply.status(204).send();
    } catch (error: any) {
      console.error('Erro ao deletar anexo:', error);
      return reply.status(500).send({ 
        message: 'Erro interno do servidor', 
        error: error.message 
      });
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    try {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const { id } = paramsSchema.parse(request.params);

      const mp = await request.file();
      if (!mp) {
        return reply.status(400).send({ message: 'Arquivo não enviado.' });
      }

      const getFieldValue = (field: any) => (field && typeof field.value === 'string' ? field.value : undefined);
      const fields = {
        descricao: getFieldValue(mp.fields.descricao),
        modulo: getFieldValue(mp.fields.modulo),
        categoria: getFieldValue(mp.fields.categoria),
      };

      // Buscar anexo atual
      const listUseCase = container.resolve(ListAnexosUseCase);
      const anexos = await listUseCase.execute({});
      const anexoAtual = anexos.find((a: any) => a.id === id);
      
      if (!anexoAtual) {
        return reply.status(404).send({ message: 'Anexo não encontrado.' });
      }

      let nomeArquivo = anexoAtual.nomeArquivo;
      let url = anexoAtual.url;
      let s3Key = anexoAtual.s3Key;
      let uploadResult = null;

      // Se veio novo arquivo, faz upload e remove o antigo
      if (mp && mp.filename) {
        // Remover arquivo antigo do S3
        if (anexoAtual.s3Key) {
          await this.s3Service.deleteFile(anexoAtual.s3Key);
        }

        // Upload novo arquivo
        const fileBuffer = await mp.toBuffer();
        nomeArquivo = mp.filename;

        uploadResult = await this.s3Service.uploadFile({
          buffer: fileBuffer,
          filename: nomeArquivo,
          mimetype: mp.mimetype || 'application/octet-stream',
          modulo: fields.modulo || anexoAtual.bucket, // Fallback para compatibilidade
          categoria: fields.categoria || 'outros',
          entidadeId: anexoAtual.entidadeId,
          metadata: {
            'updated-at': new Date().toISOString(),
            'description': fields.descricao || ''
          }
        });

        url = uploadResult.url;
        s3Key = uploadResult.s3Key;
      }

      const useCase = container.resolve(UpdateAnexoUseCase);
      const updated = await useCase.execute({
        id,
        descricao: fields.descricao,
        nomeArquivo,
        url,
        s3Key: uploadResult ? uploadResult.s3Key : undefined,
        tamanhoBytes: uploadResult ? uploadResult.size : undefined,
        mimeType: uploadResult ? uploadResult.mimetype : undefined,
        hashArquivo: uploadResult ? uploadResult.hash : undefined,
      });

      return reply.status(200).send(updated);
    } catch (error: any) {
      console.error('Erro ao atualizar anexo:', error);
      return reply.status(500).send({ 
        message: 'Erro interno do servidor', 
        error: error.message 
      });
    }
  }

  // Novo método para gerar URL presignada para download
  async getDownloadUrl(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    try {
      const paramsSchema = z.object({ id: z.string().uuid() });
      const { id } = paramsSchema.parse(request.params);

      // Buscar anexo
      const listUseCase = container.resolve(ListAnexosUseCase);
      const anexos = await listUseCase.execute({});
      const anexo = anexos.find((a: any) => a.id === id);
      
      if (!anexo) {
        return reply.status(404).send({ message: 'Anexo não encontrado.' });
      }

      if (!anexo.s3Key) {
        return reply.status(400).send({ message: 'Anexo não possui referência S3.' });
      }

      // Gerar URL presignada para download (válida por 1 hora)
      const downloadUrl = await this.s3Service.generatePresignedUrl({
        s3Key: anexo.s3Key,
        operation: 'download',
        expiresIn: 3600 // 1 hora
      });

      return reply.send({ downloadUrl });
    } catch (error: any) {
      console.error('Erro ao gerar URL de download:', error);
      return reply.status(500).send({ 
        message: 'Erro interno do servidor', 
        error: error.message 
      });
    }
  }
} 