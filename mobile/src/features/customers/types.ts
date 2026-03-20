export type Patient = {
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
  convenio?: {
    id: string;
    nome: string;
  } | null;
};

export type Convenio = {
  id: string;
  nome: string;
};

export type CreatePatientPayload = {
  nomeCompleto: string;
  whatsapp: string;
  tipoServico: string;
  nomeResponsavel?: string | null;
  email?: string | null;
  cpf?: string | null;
  dataNascimento?: string | null;
  convenioId?: string | null;
  numeroCarteirinha?: string | null;
};

export type UpdatePatientPayload = CreatePatientPayload;

export type Anexo = {
  id: string;
  nomeArquivo: string;
  descricao?: string | null;
  modulo?: string | null;
  bucket?: string | null;
};

export type EvolucaoPaciente = {
  id: string;
  pacienteId: string;
  agendamentoId?: string | null;
  profissionalId?: string | null;
  dataEvolucao: string;
  objetivoSessao?: string;
  descricaoEvolucao?: string;
  profissionalNome?: string;
  profissionalEspecialidades?: string[];
};

export type CreateEvolucaoPacientePayload = {
  pacienteId: string;
  agendamentoId?: string | null;
  profissionalId?: string | null;
  dataEvolucao: string;
  objetivoSessao: string;
  descricaoEvolucao: string;
};

export type UpdateEvolucaoPacientePayload = Partial<CreateEvolucaoPacientePayload>;

export type ProfissionalOption = {
  id: string;
  nome: string;
};

export type PacientePedido = {
  id: string;
  pacienteId: string;
  dataPedidoMedico?: string | null;
  crm?: string | null;
  cbo?: string | null;
  cid?: string | null;
  autoPedidos?: boolean | null;
  descricao?: string | null;
  servico?: {
    id: string;
    nome: string;
  } | null;
};
