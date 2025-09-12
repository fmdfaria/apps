export interface Empresa {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  
  // Endereço
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  
  // Contato
  telefone?: string;
  email?: string;
  site?: string;
  
  // Status
  ativo: boolean;
  empresaPrincipal: boolean;
  
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmpresaData {
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  site?: string;
  ativo?: boolean;
  empresaPrincipal?: boolean;
}

export interface UpdateEmpresaData extends Partial<CreateEmpresaData> {}

export interface EmpresaFilters {
  ativo?: boolean;
  empresaPrincipal?: boolean;
}