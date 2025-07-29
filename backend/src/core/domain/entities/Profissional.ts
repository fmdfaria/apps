import { randomUUID } from 'crypto';
import { ConselhoProfissional } from './ConselhoProfissional';
import { Especialidade } from './Especialidade';
import { Servico } from './Servico';

export class Profissional {
  id!: string;
  nome!: string;
  cpf!: string;
  cnpj?: string | null;
  razaoSocial?: string | null;
  email!: string;
  whatsapp?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  comprovanteEndereco?: string | null;
  conselhoId?: string | null;
  numeroConselho?: string | null;
  comprovanteRegistro?: string | null;
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  pix?: string | null;
  tipo_pix?: string | null;
  comprovanteBancario?: string | null;
  userId?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  // Relacionamentos
  conselho?: ConselhoProfissional;
  especialidades?: Especialidade[];
  servicos?: Servico[];

  constructor(
    props: Omit<
      Profissional,
      'id' | 'createdAt' | 'updatedAt' | 'conselho' | 'especialidades' | 'servicos'
    >,
    id?: string
  ) {
    Object.assign(this, props);
    if (!id) {
      this.id = randomUUID();
    } else {
      this.id = id;
    }
  }
} 