export interface Paciente {
  id: string;
  nomeCompleto: string;
  tipoServico: string;
  email?: string | null;
  whatsapp?: string | null;
  cpf?: string | null;
  dataNascimento?: string | null;
  convenioId?: string | null;
  numeroCarteirinha?: string | null;
  dataPedidoMedico?: string | null;
  crm?: string | null;
  cbo?: string | null;
  cid?: string | null;
  pedidoMedicoArquivo?: string | null;
  userId?: string | null;
} 