import type { Convenio } from './Convenio';

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
  userId?: string | null;
  ativo?: boolean;
  convenio?: Convenio | null;
} 