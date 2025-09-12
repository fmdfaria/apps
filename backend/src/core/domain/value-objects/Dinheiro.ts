export class Dinheiro {
  private constructor(private readonly valor: number) {
    if (valor < 0) {
      throw new Error('Valor monetário não pode ser negativo');
    }
  }

  static criar(valor: number): Dinheiro {
    return new Dinheiro(Number(parseFloat(valor.toString()).toFixed(2)));
  }

  get valor(): number {
    return this.valor;
  }

  somar(outro: Dinheiro): Dinheiro {
    return Dinheiro.criar(this.valor + outro.valor);
  }

  subtrair(outro: Dinheiro): Dinheiro {
    if (this.valor < outro.valor) {
      throw new Error('Resultado da subtração não pode ser negativo');
    }
    return Dinheiro.criar(this.valor - outro.valor);
  }

  multiplicar(fator: number): Dinheiro {
    return Dinheiro.criar(this.valor * fator);
  }

  dividir(divisor: number): Dinheiro {
    if (divisor === 0) {
      throw new Error('Não é possível dividir por zero');
    }
    return Dinheiro.criar(this.valor / divisor);
  }

  ehZero(): boolean {
    return this.valor === 0;
  }

  ehMaiorQue(outro: Dinheiro): boolean {
    return this.valor > outro.valor;
  }

  ehMenorQue(outro: Dinheiro): boolean {
    return this.valor < outro.valor;
  }

  ehIgual(outro: Dinheiro): boolean {
    return this.valor === outro.valor;
  }

  toString(): string {
    return this.valor.toFixed(2);
  }

  toNumber(): number {
    return this.valor;
  }
}