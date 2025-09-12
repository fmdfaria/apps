import { ContaBancaria } from '../../../../core/domain/entities/ContaBancaria';
import { IContasBancariasRepository } from '../../../../core/domain/repositories/IContasBancariasRepository';
import { prisma } from '../PrismaService';

export class PrismaContasBancariasRepository implements IContasBancariasRepository {
  async create(conta: ContaBancaria): Promise<ContaBancaria> {
    const created = await prisma.contaBancaria.create({
      data: {
        id: conta.id,
        empresaId: conta.empresaId,
        nome: conta.nome,
        banco: conta.banco,
        agencia: conta.agencia,
        conta: conta.conta,
        digito: conta.digito,
        tipoConta: conta.tipoConta,
        pixPrincipal: conta.pixPrincipal,
        tipoPix: conta.tipoPix,
        contaPrincipal: conta.contaPrincipal,
        ativo: conta.ativo,
        saldoInicial: conta.saldoInicial,
        saldoAtual: conta.saldoAtual,
        observacoes: conta.observacoes,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        empresa: true
      }
    });

    return this.mapToDomain(created);
  }

  async findById(id: string): Promise<ContaBancaria | null> {
    const conta = await prisma.contaBancaria.findUnique({
      where: { id },
      include: {
        empresa: true
      }
    });

    return conta ? this.mapToDomain(conta) : null;
  }

  async findAll(filters?: {
    empresaId?: string;
    ativo?: boolean;
    contaPrincipal?: boolean;
  }): Promise<ContaBancaria[]> {
    const contas = await prisma.contaBancaria.findMany({
      where: {
        ...(filters?.empresaId && { empresaId: filters.empresaId }),
        ...(filters?.ativo !== undefined && { ativo: filters.ativo }),
        ...(filters?.contaPrincipal !== undefined && { contaPrincipal: filters.contaPrincipal })
      },
      include: {
        empresa: true
      },
      orderBy: [
        { contaPrincipal: 'desc' },
        { nome: 'asc' }
      ]
    });

    return contas.map(this.mapToDomain);
  }

  async update(id: string, data: Partial<ContaBancaria>): Promise<ContaBancaria> {
    const updated = await prisma.contaBancaria.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        empresa: true
      }
    });

    return this.mapToDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await prisma.contaBancaria.delete({
      where: { id }
    });
  }

  async findByEmpresaId(empresaId: string): Promise<ContaBancaria[]> {
    const contas = await prisma.contaBancaria.findMany({
      where: { empresaId, ativo: true },
      include: {
        empresa: true
      },
      orderBy: [
        { contaPrincipal: 'desc' },
        { nome: 'asc' }
      ]
    });

    return contas.map(this.mapToDomain);
  }

  async findContaPrincipalByEmpresa(empresaId: string): Promise<ContaBancaria | null> {
    const conta = await prisma.contaBancaria.findFirst({
      where: { 
        empresaId,
        contaPrincipal: true,
        ativo: true
      },
      include: {
        empresa: true
      }
    });

    return conta ? this.mapToDomain(conta) : null;
  }

  async atualizarSaldo(id: string, novoSaldo: number): Promise<void> {
    await prisma.contaBancaria.update({
      where: { id },
      data: {
        saldoAtual: novoSaldo,
        updatedAt: new Date()
      }
    });
  }

  private mapToDomain(raw: any): ContaBancaria {
    const conta = new ContaBancaria({
      empresaId: raw.empresaId,
      nome: raw.nome,
      banco: raw.banco,
      agencia: raw.agencia,
      conta: raw.conta,
      digito: raw.digito,
      tipoConta: raw.tipoConta,
      pixPrincipal: raw.pixPrincipal,
      tipoPix: raw.tipoPix,
      contaPrincipal: raw.contaPrincipal,
      ativo: raw.ativo,
      saldoInicial: Number(raw.saldoInicial),
      saldoAtual: Number(raw.saldoAtual),
      observacoes: raw.observacoes
    }, raw.id);

    // Mapear empresa se incluída
    if (raw.empresa) {
      conta.empresa = {
        id: raw.empresa.id,
        razaoSocial: raw.empresa.razaoSocial,
        nomeFantasia: raw.empresa.nomeFantasia,
        cnpj: raw.empresa.cnpj,
        inscricaoEstadual: raw.empresa.inscricaoEstadual,
        inscricaoMunicipal: raw.empresa.inscricaoMunicipal,
        logradouro: raw.empresa.logradouro,
        numero: raw.empresa.numero,
        complemento: raw.empresa.complemento,
        bairro: raw.empresa.bairro,
        cidade: raw.empresa.cidade,
        estado: raw.empresa.estado,
        cep: raw.empresa.cep,
        telefone: raw.empresa.telefone,
        email: raw.empresa.email,
        site: raw.empresa.site,
        ativo: raw.empresa.ativo,
        empresaPrincipal: raw.empresa.empresaPrincipal,
        createdAt: raw.empresa.createdAt,
        updatedAt: raw.empresa.updatedAt
      };
    }

    return conta;
  }
}