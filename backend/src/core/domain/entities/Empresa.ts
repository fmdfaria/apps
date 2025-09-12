import { randomUUID } from 'crypto';

export class Empresa {
  id!: string;
  razaoSocial!: string;
  nomeFantasia?: string | null;
  cnpj!: string;
  inscricaoEstadual?: string | null;
  inscricaoMunicipal?: string | null;
  
  // Endereço
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  
  // Contato
  telefone?: string | null;
  email?: string | null;
  site?: string | null;
  
  // Status
  ativo!: boolean;
  empresaPrincipal!: boolean;
  
  createdAt!: Date;
  updatedAt!: Date;

  constructor(
    props: Omit<Empresa, 'id' | 'createdAt' | 'updatedAt'>,
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