import { PrismaClient } from '@prisma/client';
import { inject, injectable } from 'tsyringe';
import { Configuracao } from '../../../../core/domain/entities/Configuracao';
import { 
  IConfiguracoesRepository, 
  ICreateConfiguracaoDTO,
  IGetByEntityDTO 
} from '../../../../core/domain/repositories/IConfiguracoesRepository';

@injectable()
export class PrismaConfiguracoesRepository implements IConfiguracoesRepository {
  constructor(
    @inject('PrismaClient')
    private prisma: PrismaClient
  ) {}

  async create(data: ICreateConfiguracaoDTO): Promise<Configuracao> {
    const configuracao = await this.prisma.configuracao.create({
      data: {
        entidadeTipo: data.entidadeTipo,
        entidadeId: data.entidadeId,
        contexto: data.contexto,
        chave: data.chave,
        valor: data.valor,
        tipoValor: data.tipoValor || 'string',
        descricao: data.descricao,
        ativo: data.ativo ?? true,
      },
    });

    return this.toDomain(configuracao);
  }

  async findById(id: string): Promise<Configuracao | null> {
    const configuracao = await this.prisma.configuracao.findUnique({
      where: { id },
    });

    return configuracao ? this.toDomain(configuracao) : null;
  }

  async findByKey(
    entidadeTipo: string, 
    entidadeId: string | null, 
    contexto: string, 
    chave: string
  ): Promise<Configuracao | null> {
    const configuracao = await this.prisma.configuracao.findUnique({
      where: {
        entidadeTipo_entidadeId_contexto_chave: {
          entidadeTipo,
          entidadeId,
          contexto,
          chave
        }
      },
    });

    return configuracao ? this.toDomain(configuracao) : null;
  }

  async findByEntity(params: IGetByEntityDTO): Promise<Configuracao[]> {
    const where: any = {
      entidadeTipo: params.entidadeTipo,
      ativo: true,
    };

    if (params.entidadeId !== undefined) {
      where.entidadeId = params.entidadeId;
    }

    if (params.contexto) {
      where.contexto = params.contexto;
    }

    const configuracoes = await this.prisma.configuracao.findMany({
      where,
      orderBy: [
        { contexto: 'asc' },
        { chave: 'asc' }
      ],
    });

    return configuracoes.map(this.toDomain);
  }

  async findAll(): Promise<Configuracao[]> {
    const configuracoes = await this.prisma.configuracao.findMany({
      orderBy: [
        { entidadeTipo: 'asc' },
        { contexto: 'asc' },
        { chave: 'asc' }
      ],
    });

    return configuracoes.map(this.toDomain);
  }

  async save(configuracao: Configuracao): Promise<Configuracao> {
    const updated = await this.prisma.configuracao.update({
      where: { id: configuracao.id },
      data: {
        entidadeTipo: configuracao.entidadeTipo,
        entidadeId: configuracao.entidadeId,
        contexto: configuracao.contexto,
        chave: configuracao.chave,
        valor: configuracao.valor,
        tipoValor: configuracao.tipoValor,
        descricao: configuracao.descricao,
        ativo: configuracao.ativo,
        updatedAt: new Date(),
      },
    });

    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.configuracao.delete({
      where: { id },
    });
  }

  private toDomain(raw: any): Configuracao {
    const configuracao = new Configuracao();
    configuracao.id = raw.id;
    configuracao.entidadeTipo = raw.entidadeTipo;
    configuracao.entidadeId = raw.entidadeId;
    configuracao.contexto = raw.contexto;
    configuracao.chave = raw.chave;
    configuracao.valor = raw.valor;
    configuracao.tipoValor = raw.tipoValor;
    configuracao.descricao = raw.descricao;
    configuracao.ativo = raw.ativo;
    configuracao.createdAt = raw.createdAt;
    configuracao.updatedAt = raw.updatedAt;
    
    return configuracao;
  }
}