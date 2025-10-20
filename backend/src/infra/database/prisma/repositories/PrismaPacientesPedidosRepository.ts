import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { PacientePedido } from '../../../../core/domain/entities/PacientePedido';
import { IPacientesPedidosRepository, TipoNotificacao } from '../../../../core/domain/repositories/IPacientesPedidosRepository';

@injectable()
export class PrismaPacientesPedidosRepository implements IPacientesPedidosRepository {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  async create(pedido: PacientePedido): Promise<PacientePedido> {
    const createdPedido = await this.prisma.pacientePedido.create({
      data: {
        dataPedidoMedico: pedido.dataPedidoMedico,
        dataVencimentoPedido: pedido.dataVencimentoPedido,
        enviado30dias: pedido.enviado30dias,
        enviado10dias: pedido.enviado10dias,
        enviadoVencido: pedido.enviadoVencido,
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
    domainPedido.dataVencimentoPedido = createdPedido.dataVencimentoPedido;
    domainPedido.enviado30dias = createdPedido.enviado30dias;
    domainPedido.enviado10dias = createdPedido.enviado10dias;
    domainPedido.enviadoVencido = createdPedido.enviadoVencido;
    domainPedido.crm = createdPedido.crm;
    domainPedido.cbo = createdPedido.cbo;
    domainPedido.cid = createdPedido.cid;
    domainPedido.autoPedidos = createdPedido.autoPedidos;
    domainPedido.descricao = createdPedido.descricao;
    domainPedido.servicoId = createdPedido.servicoId;
    domainPedido.pacienteId = createdPedido.pacienteId;
    domainPedido.createdAt = createdPedido.createdAt;
    domainPedido.updatedAt = createdPedido.updatedAt;

    // Incluir dados do serviço se estiver disponível
    if (createdPedido.servico) {
      domainPedido.servico = createdPedido.servico;
    }

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
    domainPedido.dataVencimentoPedido = pedido.dataVencimentoPedido;
    domainPedido.enviado30dias = pedido.enviado30dias;
    domainPedido.enviado10dias = pedido.enviado10dias;
    domainPedido.enviadoVencido = pedido.enviadoVencido;
    domainPedido.crm = pedido.crm;
    domainPedido.cbo = pedido.cbo;
    domainPedido.cid = pedido.cid;
    domainPedido.autoPedidos = pedido.autoPedidos;
    domainPedido.descricao = pedido.descricao;
    domainPedido.servicoId = pedido.servicoId;
    domainPedido.pacienteId = pedido.pacienteId;
    domainPedido.createdAt = pedido.createdAt;
    domainPedido.updatedAt = pedido.updatedAt;

    // Incluir dados do serviço se estiver disponível
    if (pedido.servico) {
      domainPedido.servico = pedido.servico;
    }

    return domainPedido;
  }

  async findByPacienteId(pacienteId: string): Promise<PacientePedido[]> {
    // Primeiro vamos verificar se o serviço existe
    const servicoTest = await this.prisma.servico.findUnique({
      where: { id: "0e49ec64-330d-45c5-a63b-d0c0c4a5f736" }
    });
    console.log('Teste serviço existe:', servicoTest);

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

    console.log('Pedidos do Prisma (completos):', JSON.stringify(pedidos, null, 2));

    return pedidos.map((pedido) => {
      const domainPedido = new PacientePedido();
      domainPedido.id = pedido.id;
      domainPedido.dataPedidoMedico = pedido.dataPedidoMedico;
      domainPedido.dataVencimentoPedido = pedido.dataVencimentoPedido;
      domainPedido.enviado30dias = pedido.enviado30dias;
      domainPedido.enviado10dias = pedido.enviado10dias;
      domainPedido.enviadoVencido = pedido.enviadoVencido;
      domainPedido.crm = pedido.crm;
      domainPedido.cbo = pedido.cbo;
      domainPedido.cid = pedido.cid;
      domainPedido.autoPedidos = pedido.autoPedidos;
      domainPedido.descricao = pedido.descricao;
      domainPedido.servicoId = pedido.servicoId;
      domainPedido.pacienteId = pedido.pacienteId;
      domainPedido.createdAt = pedido.createdAt;
      domainPedido.updatedAt = pedido.updatedAt;

      // Incluir dados do serviço se estiver disponível
      if (pedido.servico) {
        console.log('Mapeando serviço:', pedido.servico);
        domainPedido.servico = pedido.servico;
      } else {
        console.log('Serviço não encontrado para pedido:', pedido.id, 'servicoId:', pedido.servicoId);
      }

      return domainPedido;
    });
  }

  async findAll(): Promise<PacientePedido[]> {
    const pedidos = await this.prisma.pacientePedido.findMany({
      where: {
        paciente: {
          ativo: true,
        },
      },
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
      domainPedido.dataVencimentoPedido = pedido.dataVencimentoPedido;
      domainPedido.enviado30dias = pedido.enviado30dias;
      domainPedido.enviado10dias = pedido.enviado10dias;
      domainPedido.enviadoVencido = pedido.enviadoVencido;
      domainPedido.crm = pedido.crm;
      domainPedido.cbo = pedido.cbo;
      domainPedido.cid = pedido.cid;
      domainPedido.autoPedidos = pedido.autoPedidos;
      domainPedido.descricao = pedido.descricao;
      domainPedido.servicoId = pedido.servicoId;
      domainPedido.pacienteId = pedido.pacienteId;
      domainPedido.createdAt = pedido.createdAt;
      domainPedido.updatedAt = pedido.updatedAt;
      if (pedido.servico) domainPedido.servico = pedido.servico;
      if (pedido.paciente) domainPedido.paciente = pedido.paciente;
      return domainPedido;
    });
  }

  async save(pedido: PacientePedido): Promise<PacientePedido> {
    const updatedPedido = await this.prisma.pacientePedido.update({
      where: { id: pedido.id },
      data: {
        dataPedidoMedico: pedido.dataPedidoMedico,
        dataVencimentoPedido: pedido.dataVencimentoPedido,
        enviado30dias: pedido.enviado30dias,
        enviado10dias: pedido.enviado10dias,
        enviadoVencido: pedido.enviadoVencido,
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
    domainPedido.dataVencimentoPedido = updatedPedido.dataVencimentoPedido;
    domainPedido.enviado30dias = updatedPedido.enviado30dias;
    domainPedido.enviado10dias = updatedPedido.enviado10dias;
    domainPedido.enviadoVencido = updatedPedido.enviadoVencido;
    domainPedido.crm = updatedPedido.crm;
    domainPedido.cbo = updatedPedido.cbo;
    domainPedido.cid = updatedPedido.cid;
    domainPedido.autoPedidos = updatedPedido.autoPedidos;
    domainPedido.descricao = updatedPedido.descricao;
    domainPedido.servicoId = updatedPedido.servicoId;
    domainPedido.pacienteId = updatedPedido.pacienteId;
    domainPedido.createdAt = updatedPedido.createdAt;
    domainPedido.updatedAt = updatedPedido.updatedAt;

    // Incluir dados do serviço se estiver disponível
    if (updatedPedido.servico) {
      domainPedido.servico = updatedPedido.servico;
    }

    return domainPedido;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.pacientePedido.delete({
      where: { id },
    });
  }

  async findPedidosPorVencimento(tipo: TipoNotificacao): Promise<PacientePedido[]> {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Calcular datas de referência
    const data30Dias = new Date(hoje);
    data30Dias.setDate(data30Dias.getDate() + 30);

    const data10Dias = new Date(hoje);
    data10Dias.setDate(data10Dias.getDate() + 10);

    // Construir condições WHERE baseadas no tipo
    let whereConditions: any = {
      autoPedidos: true,
      dataVencimentoPedido: { not: null },
      paciente: { ativo: true },
    };

    if (tipo === '30dias') {
      whereConditions.enviado30dias = false;
      whereConditions.dataVencimentoPedido = {
        gte: data30Dias,
        lt: new Date(data30Dias.getTime() + 24 * 60 * 60 * 1000), // +1 dia
      };
    } else if (tipo === '10dias') {
      whereConditions.enviado10dias = false;
      whereConditions.dataVencimentoPedido = {
        gte: data10Dias,
        lt: new Date(data10Dias.getTime() + 24 * 60 * 60 * 1000), // +1 dia
      };
    } else if (tipo === 'vencido') {
      whereConditions.enviadoVencido = false;
      whereConditions.dataVencimentoPedido = {
        gte: hoje,
        lt: new Date(hoje.getTime() + 24 * 60 * 60 * 1000), // +1 dia (hoje)
      };
    }
    // Se tipo === 'todos', não adiciona filtros de data e enviado

    const pedidos = await this.prisma.pacientePedido.findMany({
      where: whereConditions,
      include: {
        servico: {
          select: {
            id: true,
            nome: true,
            descricao: true,
          },
        },
        paciente: {
          select: {
            id: true,
            nomeCompleto: true,
            email: true,
            whatsapp: true,
            convenio: {
              select: {
                id: true,
                nome: true,
              },
            },
            numeroCarteirinha: true,
          },
        },
      },
      orderBy: {
        dataVencimentoPedido: 'asc',
      },
    });

    return pedidos.map((pedido) => {
      const domainPedido = new PacientePedido();
      domainPedido.id = pedido.id;
      domainPedido.dataPedidoMedico = pedido.dataPedidoMedico;
      domainPedido.dataVencimentoPedido = pedido.dataVencimentoPedido;
      domainPedido.enviado30dias = pedido.enviado30dias;
      domainPedido.enviado10dias = pedido.enviado10dias;
      domainPedido.enviadoVencido = pedido.enviadoVencido;
      domainPedido.crm = pedido.crm;
      domainPedido.cbo = pedido.cbo;
      domainPedido.cid = pedido.cid;
      domainPedido.autoPedidos = pedido.autoPedidos;
      domainPedido.descricao = pedido.descricao;
      domainPedido.servicoId = pedido.servicoId;
      domainPedido.pacienteId = pedido.pacienteId;
      domainPedido.createdAt = pedido.createdAt;
      domainPedido.updatedAt = pedido.updatedAt;
      if (pedido.servico) domainPedido.servico = pedido.servico;
      if (pedido.paciente) domainPedido.paciente = pedido.paciente;
      return domainPedido;
    });
  }
}