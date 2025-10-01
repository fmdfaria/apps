export class PacientePedido {
  id: string;
  dataPedidoMedico?: Date | null;
  crm?: string | null;
  cbo?: string | null;
  cid?: string | null;
  autoPedidos?: boolean | null;
  descricao?: string | null;
  servicoId?: string | null;
  pacienteId: string;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  servico?: any; // Relação com serviço
  paciente?: any; // Relação com paciente (inclui dados como convenio, carteirinha, whatsapp)

  constructor() {
    this.id = '';
    this.pacienteId = '';
  }
}