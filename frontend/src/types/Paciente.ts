export interface Paciente {
  id: string;
  nomeCompleto: string;
  whatsapp: string;
  tipoServico: string;
  nomeResponsavel?: string | null;
  email?: string | null;
  cpf?: string | null;
  dataNascimento?: string | null;
  convenioId?: string | null;
  numeroCarteirinha?: string | null;
  dataPedidoMedico?: string | null;
  crm?: string | null;
  cbo?: string | null;
  cid?: string | null;
  userId?: string | null;
} 