import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
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
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  criadoPor: z.string().uuid().optional(),
});

export class AnexosController {
  private s3Service: S3StorageService;

  constructor() {
    this.s3Service = new S3StorageService();
  }

  private extractS3KeyFromUrl(url?: string | null): string | null {
    if (!url) return null;

    const trimmedUrl = url.trim();
    if (!trimmedUrl) return null;

    // Em alguns registros antigos, o campo `url` ja contem somente a key.
    if (!trimmedUrl.includes('://')) {
      return trimmedUrl.replace(/^\/+/, '') || null;
    }

    try {
      const parsedUrl = new URL(trimmedUrl);
      const bucketName = (process.env.AWS_S3_BUCKET || 'probotec-clinica-files').toLowerCase();
      const host = parsedUrl.hostname.toLowerCase();
      const isLikelyS3Host = host.includes('amazonaws.com') || host.startsWith(`${bucketName}.`);

      if (!isLikelyS3Host) {
        return null;
      }

      const rawPath = parsedUrl.pathname.replace(/^\/+/, '');
      if (!rawPath) {
        return null;
      }

      const pathParts = rawPath.split('/').filter(Boolean);
      if (pathParts.length === 0) {
        return null;
      }

      // URL no formato path-style: s3.amazonaws.com/bucket/key
      if (pathParts[0].toLowerCase() === bucketName) {
        const keyFromPathStyle = pathParts.slice(1).join('/');
        return keyFromPathStyle || null;
      }

      // URL no formato virtual-hosted-style: bucket.s3.amazonaws.com/key
      return rawPath;
    } catch {
      return null;
    }
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
      
      // Usar usuário logado se criadoPor não foi fornecido
      // @ts-ignore
      const userId = request.user?.id;
      const finalCriadoPor = criadoPor || userId;

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
          'uploaded-by': finalCriadoPor || 'unknown',
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
        criadoPor: finalCriadoPor,
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
      console.error('Error code:', error.code);
      
      // Tratar erro de arquivo muito grande especificamente
      if (error.code === 'FST_REQ_FILE_TOO_LARGE' || 
          error.code === 'FST_ERR_CTP_BODY_TOO_LARGE' ||
          error.code === 'LIMIT_FILE_SIZE' ||
          error.message === 'request file too large' ||
          error.message?.includes('file too large')) {
        const limiteAnexo = Number(process.env.LIMITE_ANEXO || 10);
        return reply.status(413).send({ 
          message: `Arquivo muito grande. Tamanho máximo permitido: ${limiteAnexo}MB` 
        });
      }
      
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

      // Remover do S3 com fallback para registros antigos sem s3Key salvo
      const s3Key = anexo.s3Key || this.extractS3KeyFromUrl(anexo.url);
      if (s3Key) {
        await this.s3Service.deleteFile(s3Key);
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
      let url: string | undefined = anexoAtual.url || undefined;
      let s3Key = anexoAtual.s3Key;
      let uploadResult = null;

      // Se veio novo arquivo, faz upload e remove o antigo
      if (mp && mp.filename) {
        // Remover arquivo antigo do S3 (com fallback para URL legada)
        const oldS3Key = anexoAtual.s3Key || this.extractS3KeyFromUrl(anexoAtual.url);
        if (oldS3Key) {
          await this.s3Service.deleteFile(oldS3Key);
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
        s3Key,
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

      const resolvedS3Key = anexo.s3Key || this.extractS3KeyFromUrl(anexo.url);
      if (!resolvedS3Key) {
        return reply.status(400).send({ message: 'Anexo não possui referência S3.' });
      }

      // Persistir key recuperada para evitar novas tentativas de fallback.
      if (!anexo.s3Key) {
        try {
          const prisma = container.resolve<PrismaClient>('PrismaClient');
          await prisma.anexo.update({
            where: { id: anexo.id },
            data: { s3Key: resolvedS3Key }
          });
        } catch (persistError) {
          console.warn('Não foi possível persistir s3Key legada do anexo:', persistError);
        }
      }

      // Gerar URL presignada para download (válida por 1 hora)
      const downloadUrl = await this.s3Service.generatePresignedUrl({
        s3Key: resolvedS3Key,
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

  // Método específico para servir a logo da aplicação
  async getLogo(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    try {
      const logoS3Key = 'app/logo-probotec-300x100.png';
      
      // Gerar URL presignada para a logo (válida por 24 horas)
      const logoUrl = await this.s3Service.generatePresignedUrl({
        s3Key: logoS3Key,
        operation: 'download',
        expiresIn: 24 * 3600 // 24 horas
      });

      return reply.send({ logoUrl });
    } catch (error: any) {
      console.error('Erro ao gerar URL da logo:', error);
      return reply.status(500).send({ 
        message: 'Erro ao carregar logo', 
        error: error.message 
      });
    }
  }

  // Método específico para servir o favicon da aplicação
  async getFavicon(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    try {
      const faviconS3Key = 'app/probotec.png';
      
      // Gerar URL presignada para o favicon (válida por 24 horas)
      const faviconUrl = await this.s3Service.generatePresignedUrl({
        s3Key: faviconS3Key,
        operation: 'download',
        expiresIn: 24 * 3600 // 24 horas
      });

      return reply.send({ faviconUrl });
    } catch (error: any) {
      console.error('Erro ao gerar URL do favicon:', error);
      return reply.status(500).send({ 
        message: 'Erro ao carregar favicon', 
        error: error.message 
      });
    }
  }

  // Método específico para upload de avatar do usuário
  async uploadAvatar(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    try {
      // @ts-ignore
      const userId = request.user?.id;
      
      if (!userId) {
        return reply.status(401).send({ message: 'Usuário não autenticado.' });
      }

      const mp = await request.file();
      if (!mp) {
        return reply.status(400).send({ message: 'Arquivo de avatar não enviado.' });
      }

      // Validar tipo de arquivo (apenas imagens)
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(mp.mimetype)) {
        return reply.status(400).send({ 
          message: 'Tipo de arquivo inválido. Apenas JPG, PNG e WebP são permitidos.' 
        });
      }

      // Validar tamanho usando variável de ambiente
      const fileBuffer = await mp.toBuffer();
      const limiteAnexo = Number(process.env.LIMITE_ANEXO || 10);
      const maxSize = limiteAnexo * 1024 * 1024; // Convertendo MB para bytes
      if (fileBuffer.length > maxSize) {
        return reply.status(413).send({ 
          message: `Arquivo muito grande. Tamanho máximo permitido: ${limiteAnexo}MB` 
        });
      }

      // Upload para S3
      const uploadResult = await this.s3Service.uploadFile({
        buffer: fileBuffer,
        filename: `avatar_${userId}_${Date.now()}.${mp.mimetype.split('/')[1]}`,
        mimetype: mp.mimetype,
        modulo: 'usuarios',
        categoria: 'avatares',
        entidadeId: userId,
        metadata: {
          'document-type': 'avatar',
          'user-id': userId
        }
      });

      // Atualizar o usuário no banco com a S3 key do avatar (não a URL)
      const userRepository = container.resolve<PrismaClient>('PrismaClient');
      await userRepository.user.update({
        where: { id: userId },
        data: { avatarUrl: uploadResult.s3Key } // Salvar apenas a S3 key
      });

      return reply.status(200).send({
        message: 'Avatar atualizado com sucesso!',
        avatarUrl: uploadResult.s3Key // Retornar a S3 key
      });
    } catch (error: any) {
      console.error('Erro no upload de avatar:', error);
      return reply.status(500).send({ 
        message: 'Erro interno do servidor', 
        error: error.message 
      });
    }
  }

  // Método para gerar URL presignada do avatar do usuário
  async getAvatarUrl(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    try {
      // @ts-ignore
      const userId = request.user?.id;
      
      if (!userId) {
        return reply.status(401).send({ message: 'Usuário não autenticado.' });
      }

      // Buscar a S3 key do avatar do usuário
      const userRepository = container.resolve<PrismaClient>('PrismaClient');
      const user = await userRepository.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true }
      });

      if (!user || !user.avatarUrl) {
        return reply.status(404).send({ message: 'Avatar não encontrado.' });
      }

      // Gerar URL presignada para o avatar (válida por 1 hora)
      const avatarUrl = await this.s3Service.generatePresignedUrl({
        s3Key: user.avatarUrl, // avatarUrl contém a S3 key
        operation: 'download',
        expiresIn: 3600 // 1 hora
      });

      return reply.send({ avatarUrl });
    } catch (error: any) {
      console.error('Erro ao gerar URL do avatar:', error);
      return reply.status(500).send({ 
        message: 'Erro ao carregar avatar', 
        error: error.message 
      });
    }
  }
} 

