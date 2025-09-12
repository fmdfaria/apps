export enum StatusPagamento {
  PENDENTE = 'PENDENTE',
  PARCIAL = 'PARCIAL',
  PAGO = 'PAGO',
  RECEBIDO = 'RECEBIDO',
  VENCIDO = 'VENCIDO',
  CANCELADO = 'CANCELADO'
}

export enum TipoMovimentacao {
  ENTRADA = 'ENTRADA',
  SAIDA = 'SAIDA'
}

export enum TipoCategoriaFinanceira {
  RECEITA = 'RECEITA',
  DESPESA = 'DESPESA'
}

export enum FormaPagamento {
  DINHEIRO = 'DINHEIRO',
  PIX = 'PIX',
  CARTAO_CREDITO = 'CARTAO_CREDITO',
  CARTAO_DEBITO = 'CARTAO_DEBITO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  CHEQUE = 'CHEQUE',
  BOLETO = 'BOLETO',
  TED = 'TED',
  DOC = 'DOC'
}

export enum TipoConta {
  CORRENTE = 'CORRENTE',
  POUPANCA = 'POUPANCA',
  INVESTIMENTO = 'INVESTIMENTO'
}

export enum TipoContaPagar {
  DESPESA = 'DESPESA',
  SALARIO = 'SALARIO',
  ENCARGO = 'ENCARGO',
  IMPOSTO = 'IMPOSTO',
  INVESTIMENTO = 'INVESTIMENTO'
}

export enum Periodicidade {
  MENSAL = 'MENSAL',
  TRIMESTRAL = 'TRIMESTRAL',
  SEMESTRAL = 'SEMESTRAL',
  ANUAL = 'ANUAL'
}

export enum TipoPix {
  CPF = 'CPF',
  CNPJ = 'CNPJ',
  EMAIL = 'EMAIL',
  TELEFONE = 'TELEFONE',
  ALEATORIA = 'ALEATORIA'
}