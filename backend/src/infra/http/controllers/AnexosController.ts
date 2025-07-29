import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { CreateAnexoUseCase } from '../../../core/application/use-cases/anexo/CreateAnexoUseCase';
import { ListAnexosUseCase } from '../../../core/application/use-cases/anexo/ListAnexosUseCase';
import { DeleteAnexoUseCase } from '../../../core/application/use-cases/anexo/DeleteAnexoUseCase';
import { UpdateAnexoUseCase } from '../../../core/application/use-cases/anexo/UpdateAnexoUseCase';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_API_URL = process.env.SUPABASE_API_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_API_URL, SUPABASE_SERVICE_ROLE_KEY);

const anexoMultipartSchema = z.object({
  entidadeId: z.string().uuid(),
  bucket: z.string(),
  descricao: z.string().optional(),
  criadoPor: z.string().uuid().optional(),
});

export class AnexosController {
  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const mp = await request.file();

    if (!mp) {
      return reply.status(400).send({ message: 'Arquivo não enviado.' });
    }
    // Extrair os valores dos campos corretamente
    const getFieldValue = (field: any) => (field && typeof field.value === 'string' ? field.value : undefined);
    const fields = {
      entidadeId: getFieldValue(mp.fields.entidadeId),
      bucket: getFieldValue(mp.fields.bucket),
      descricao: getFieldValue(mp.fields.descricao),
      criadoPor: getFieldValue(mp.fields.criadoPor),
    };
    const parsedFields = anexoMultipartSchema.parse(fields);
    const { entidadeId, bucket, descricao, criadoPor } = parsedFields;
    const fileBuffer = await mp.toBuffer();
    const nomeArquivo = mp.filename;
    const path = nomeArquivo; // pode customizar path se quiser subpastas

    // Upload para o Supabase Storage
    const bucketName = bucket ?? '';
    const { data, error } = await supabase.storage.from(bucketName).upload(path, fileBuffer, {
      upsert: true,
      contentType: mp.mimetype,
    });
    if (error) {
      return reply.status(500).send({ message: 'Erro ao fazer upload no Storage', error: error.message });
    }

    // Obter URL pública
    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(path);
    const url = publicUrlData.publicUrl;

    const useCase = container.resolve(CreateAnexoUseCase);
    const anexo = await useCase.execute({
      entidadeId,
      bucket,
      nomeArquivo,
      descricao,
      criadoPor,
      url,
    });
    return reply.status(201).send(anexo);
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
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    // Buscar anexo antes de deletar
    const listUseCase = container.resolve(ListAnexosUseCase);
    const anexos = await listUseCase.execute({});
    const anexo = anexos.find((a: any) => a.id === id);
    if (!anexo) {
      return reply.status(404).send({ message: 'Anexo não encontrado.' });
    }
    // Tentar remover do bucket
    if (anexo.bucket && anexo.nomeArquivo) {
      const bucketName = typeof anexo.bucket === 'string' ? anexo.bucket : '';
      const nomeArquivo = typeof anexo.nomeArquivo === 'string' ? anexo.nomeArquivo : '';
      const { error } = await supabase.storage.from(bucketName).remove([nomeArquivo]);
      if (error) {
        return reply.status(500).send({ message: 'Erro ao remover arquivo do bucket', error: error.message });
      }
    }
    // Remover do banco
    const useCase = container.resolve(DeleteAnexoUseCase);
    await useCase.execute(id);
    return reply.status(204).send();
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);

    // @ts-ignore
    const mp = await request.file();
    if (!mp) {
      return reply.status(400).send({ message: 'Arquivo não enviado.' });
    }
    const getFieldValue = (field: any) => (field && typeof field.value === 'string' ? field.value : undefined);
    const fields = {
      descricao: getFieldValue(mp.fields.descricao),
      bucket: getFieldValue(mp.fields.bucket),
    };
    const descricao = fields.descricao;
    const bucket = fields.bucket;

    // Buscar anexo atual
    const useCase = container.resolve(UpdateAnexoUseCase);
    const listUseCase = container.resolve(ListAnexosUseCase);
    const anexos = await listUseCase.execute({});
    const anexoAtual = anexos.find((a: any) => a.id === id);
    if (!anexoAtual) {
      return reply.status(404).send({ message: 'Anexo não encontrado.' });
    }

    let nomeArquivo = anexoAtual.nomeArquivo;
    let url = anexoAtual.url;

    // Se veio novo arquivo, faz upload e remove o antigo
    if (mp && mp.filename) {
      // Remove arquivo antigo
      if (anexoAtual.bucket && anexoAtual.nomeArquivo) {
        await supabase.storage.from(anexoAtual.bucket).remove([anexoAtual.nomeArquivo]);
      }
      // Upload novo arquivo
      const fileBuffer = await mp.toBuffer();
      nomeArquivo = mp.filename;
      const path = nomeArquivo;
      const bucketName = bucket ?? '';
      const { error } = await supabase.storage.from(bucketName).upload(path, fileBuffer, {
        upsert: true,
        contentType: mp.mimetype,
      });
      if (error) {
        return reply.status(500).send({ message: 'Erro ao fazer upload no Storage', error: error.message });
      }
      const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(path);
      url = publicUrlData.publicUrl;
    }

    const updated = await useCase.execute({
      id,
      descricao,
      nomeArquivo,
      url,
    });
    return reply.status(200).send(updated);
  }
} 