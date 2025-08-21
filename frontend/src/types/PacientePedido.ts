export interface PacientePedido {
  id: string;
  dataPedidoMedico?: string | null;
  crm?: string | null;
  cbo?: string | null;
  cid?: string | null;
  autoPedidos?: boolean | null;
  descricao?: string | null;
  servicoId?: string | null;
  pacienteId: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  // Relacionamentos opcionais
  servico?: {
    id: string;
    nome: string;
    descricao?: string | null;
    duracaoMinutos: number;
    preco: number;
  } | null;
  paciente?: {
    id: string;
    nomeCompleto: string;
  } | null;
}