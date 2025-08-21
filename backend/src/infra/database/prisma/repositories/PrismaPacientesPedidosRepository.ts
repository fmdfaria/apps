import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { PacientePedido } from '../../../../core/domain/entities/PacientePedido';
import { IPacientesPedidosRepository } from '../../../../core/domain/repositories/IPacientesPedidosRepository';

@injectable()
export class PrismaPacientesPedidosRepository implements IPacientesPedidosRepository {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  async create(pedido: PacientePedido): Promise<PacientePedido> {
    const createdPedido = await this.prisma.pacientePedido.create({
      data: {
        dataPedidoMedico: pedido.dataPedidoMedico,
        crm: pedido.crm,
        cbo: pedido.cbo,
        cid: pedido.cid,
        autoPedidos: pedido.autoPedidos,
        descricao: pedido.descricao,
        servicoId: pedido.servicoId,
        pacienteId: pedido.pacienteId,
      },
      include: {
        servico: true,
        paciente: true,
      },
    });

    const domainPedido = new PacientePedido();
    domainPedido.id = createdPedido.id;
    domainPedido.dataPedidoMedico = createdPedido.dataPedidoMedico;
    domainPedido.crm = createdPedido.crm;
    domainPedido.cbo = createdPedido.cbo;
    domainPedido.cid = createdPedido.cid;
    domainPedido.autoPedidos = createdPedido.autoPedidos;
    domainPedido.descricao = createdPedido.descricao;
    domainPedido.servicoId = createdPedido.servicoId;
    domainPedido.pacienteId = createdPedido.pacienteId;
    domainPedido.createdAt = createdPedido.createdAt;
    domainPedido.updatedAt = createdPedido.updatedAt;

    return domainPedido;
  }

  async findById(id: string): Promise<PacientePedido | null> {
    const pedido = await this.prisma.pacientePedido.findUnique({
      where: { id },
      include: {
        servico: true,
        paciente: true,
      },
    });

    if (!pedido) {
      return null;
    }

    const domainPedido = new PacientePedido();
    domainPedido.id = pedido.id;
    domainPedido.dataPedidoMedico = pedido.dataPedidoMedico;
    domainPedido.crm = pedido.crm;
    domainPedido.cbo = pedido.cbo;
    domainPedido.cid = pedido.cid;
    domainPedido.autoPedidos = pedido.autoPedidos;
    domainPedido.descricao = pedido.descricao;
    domainPedido.servicoId = pedido.servicoId;
    domainPedido.pacienteId = pedido.pacienteId;
    domainPedido.createdAt = pedido.createdAt;
    domainPedido.updatedAt = pedido.updatedAt;

    return domainPedido;
  }

  async findByPacienteId(pacienteId: string): Promise<PacientePedido[]> {
    const pedidos = await this.prisma.pacientePedido.findMany({
      where: { pacienteId },
      include: {
        servico: true,
        paciente: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return pedidos.map((pedido) => {
      const domainPedido = new PacientePedido();
      domainPedido.id = pedido.id;
      domainPedido.dataPedidoMedico = pedido.dataPedidoMedico;
      domainPedido.crm = pedido.crm;
      domainPedido.cbo = pedido.cbo;
      domainPedido.cid = pedido.cid;
      domainPedido.autoPedidos = pedido.autoPedidos;
      domainPedido.descricao = pedido.descricao;
      domainPedido.servicoId = pedido.servicoId;
      domainPedido.pacienteId = pedido.pacienteId;
      domainPedido.createdAt = pedido.createdAt;
      domainPedido.updatedAt = pedido.updatedAt;
      return domainPedido;
    });
  }

  async save(pedido: PacientePedido): Promise<PacientePedido> {
    const updatedPedido = await this.prisma.pacientePedido.update({
      where: { id: pedido.id },
      data: {
        dataPedidoMedico: pedido.dataPedidoMedico,
        crm: pedido.crm,
        cbo: pedido.cbo,
        cid: pedido.cid,
        autoPedidos: pedido.autoPedidos,
        descricao: pedido.descricao,
        servicoId: pedido.servicoId,
      },
      include: {
        servico: true,
        paciente: true,
      },
    });

    const domainPedido = new PacientePedido();
    domainPedido.id = updatedPedido.id;
    domainPedido.dataPedidoMedico = updatedPedido.dataPedidoMedico;
    domainPedido.crm = updatedPedido.crm;
    domainPedido.cbo = updatedPedido.cbo;
    domainPedido.cid = updatedPedido.cid;
    domainPedido.autoPedidos = updatedPedido.autoPedidos;
    domainPedido.descricao = updatedPedido.descricao;
    domainPedido.servicoId = updatedPedido.servicoId;
    domainPedido.pacienteId = updatedPedido.pacienteId;
    domainPedido.createdAt = updatedPedido.createdAt;
    domainPedido.updatedAt = updatedPedido.updatedAt;

    return domainPedido;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.pacientePedido.delete({
      where: { id },
    });
  }
}