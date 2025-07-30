export interface Servico {
  id: string;
  nome: string;
  descricao?: string | null;
  duracaoMinutos: number;
  preco: number;
  percentualClinica?: number | null;
  percentualProfissional?: number | null;
  procedimentoPrimeiroAtendimento?: string | null;
  procedimentoDemaisAtendimentos?: string | null;
  convenioId?: string | null;
  convenio?: { id: string; nome: string } | null;
} 