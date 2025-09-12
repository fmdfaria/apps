import { Empresa } from '../../../../core/domain/entities/Empresa';
import { IEmpresasRepository } from '../../../../core/domain/repositories/IEmpresasRepository';
import { prisma } from '../PrismaService';

export class PrismaEmpresasRepository implements IEmpresasRepository {
  async create(empresa: Empresa): Promise<Empresa> {
    const created = await prisma.empresa.create({
      data: {
        id: empresa.id,
        razaoSocial: empresa.razaoSocial,
        nomeFantasia: empresa.nomeFantasia,
        cnpj: empresa.cnpj,
        inscricaoEstadual: empresa.inscricaoEstadual,
        inscricaoMunicipal: empresa.inscricaoMunicipal,
        logradouro: empresa.logradouro,
        numero: empresa.numero,
        complemento: empresa.complemento,
        bairro: empresa.bairro,
        cidade: empresa.cidade,
        estado: empresa.estado,
        cep: empresa.cep,
        telefone: empresa.telefone,
        email: empresa.email,
        site: empresa.site,
        ativo: empresa.ativo,
        empresaPrincipal: empresa.empresaPrincipal,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return this.mapToDomain(created);
  }

  async findById(id: string): Promise<Empresa | null> {
    const empresa = await prisma.empresa.findUnique({
      where: { id }
    });

    return empresa ? this.mapToDomain(empresa) : null;
  }

  async findByCnpj(cnpj: string): Promise<Empresa | null> {
    const empresa = await prisma.empresa.findUnique({
      where: { cnpj }
    });

    return empresa ? this.mapToDomain(empresa) : null;
  }

  async findAll(filters?: {
    ativo?: boolean;
    empresaPrincipal?: boolean;
  }): Promise<Empresa[]> {
    const empresas = await prisma.empresa.findMany({
      where: {
        ...(filters?.ativo !== undefined && { ativo: filters.ativo }),
        ...(filters?.empresaPrincipal !== undefined && { empresaPrincipal: filters.empresaPrincipal })
      },
      orderBy: [
        { empresaPrincipal: 'desc' },
        { razaoSocial: 'asc' }
      ]
    });

    return empresas.map(this.mapToDomain);
  }

  async update(id: string, data: Partial<Empresa>): Promise<Empresa> {
    const updated = await prisma.empresa.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });

    return this.mapToDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await prisma.empresa.delete({
      where: { id }
    });
  }

  async findEmpresaPrincipal(): Promise<Empresa | null> {
    const empresa = await prisma.empresa.findFirst({
      where: { empresaPrincipal: true }
    });

    return empresa ? this.mapToDomain(empresa) : null;
  }

  private mapToDomain(raw: any): Empresa {
    return new Empresa({
      razaoSocial: raw.razaoSocial,
      nomeFantasia: raw.nomeFantasia,
      cnpj: raw.cnpj,
      inscricaoEstadual: raw.inscricaoEstadual,
      inscricaoMunicipal: raw.inscricaoMunicipal,
      logradouro: raw.logradouro,
      numero: raw.numero,
      complemento: raw.complemento,
      bairro: raw.bairro,
      cidade: raw.cidade,
      estado: raw.estado,
      cep: raw.cep,
      telefone: raw.telefone,
      email: raw.email,
      site: raw.site,
      ativo: raw.ativo,
      empresaPrincipal: raw.empresaPrincipal
    }, raw.id);
  }
}