export interface Configuracao {
  id: string;
  entidadeTipo: string;
  entidadeId?: string | null;
  contexto: string;
  chave: string;
  valor: string;
  tipoValor: string;
  descricao?: string | null;
  ativo?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}