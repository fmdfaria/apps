export class Configuracao {
  id: string;
  entidadeTipo: string;
  entidadeId?: string | null;
  contexto: string;
  chave: string;
  valor: string;
  tipoValor: string;
  descricao?: string | null;
  ativo?: boolean | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;

  constructor() {
    this.id = '';
    this.entidadeTipo = '';
    this.entidadeId = null;
    this.contexto = '';
    this.chave = '';
    this.valor = '';
    this.tipoValor = 'string';
    this.descricao = null;
    this.ativo = true;
    this.createdAt = null;
    this.updatedAt = null;
  }
}