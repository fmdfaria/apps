import { injectable, inject } from 'tsyringe';
import { ContaReceber } from '../../../domain/entities/ContaReceber';
import { FluxoCaixa } from '../../../domain/entities/FluxoCaixa';
import { IContasReceberRepository } from '../../../domain/repositories/IContasReceberRepository';
import { IFluxoCaixaRepository } from '../../../domain/repositories/IFluxoCaixaRepository';
import { IContasBancariasRepository } from '../../../domain/repositories/IContasBancariasRepository';

interface ReceberContaRequest {
  contaId: string;
  valorRecebido: number;
  dataRecebimento: Date;
  formaRecebimento: string;
  contaBancariaId: string;
  observacoes?: string;
  userUpdatedId?: string;
}

@injectable()
export class ReceberContaUseCase {
  constructor(
    @inject('ContasReceberRepository')
    private contasReceberRepository: IContasReceberRepository,
    @inject('FluxoCaixaRepository')
    private fluxoCaixaRepository: IFluxoCaixaRepository,
    @inject('ContasBancariasRepository')
    private contasBancariasRepository: IContasBancariasRepository
  ) {}

  async execute(data: ReceberContaRequest): Promise<ContaReceber> {
    // Buscar a conta
    const conta = await this.contasReceberRepository.findById(data.contaId);
    if (!conta) {
      throw new Error('Conta não encontrada');
    }

    if (conta.status === 'RECEBIDO') {
      throw new Error('Conta já foi totalmente recebida');
    }

    if (conta.status === 'CANCELADO') {
      throw new Error('Conta cancelada não pode ser recebida');
    }

    // Validar valor
    const novoValorRecebido = conta.valorRecebido + data.valorRecebido;
    if (novoValorRecebido > conta.valorLiquido) {
      throw new Error('Valor recebido não pode ser maior que o valor líquido da conta');
    }

    // Verificar conta bancária
    const contaBancaria = await this.contasBancariasRepository.findById(data.contaBancariaId);
    if (!contaBancaria) {
      throw new Error('Conta bancária não encontrada');
    }

    // Determinar novo status
    let novoStatus = 'PARCIAL';
    if (novoValorRecebido >= conta.valorLiquido) {
      novoStatus = 'RECEBIDO';
    }

    // Atualizar conta
    const contaAtualizada = await this.contasReceberRepository.update(data.contaId, {
      valorRecebido: novoValorRecebido,
      dataRecebimento: data.dataRecebimento,
      formaRecebimento: data.formaRecebimento,
      status: novoStatus,
      observacoes: data.observacoes,
      userUpdatedId: data.userUpdatedId
    });

    // Criar movimentação no fluxo de caixa
    const movimento = new FluxoCaixa({
      empresaId: conta.empresaId,
      contaBancariaId: data.contaBancariaId,
      contaReceberId: conta.id,
      tipo: 'ENTRADA',
      categoriaId: conta.categoriaId,
      descricao: `Recebimento: ${conta.descricao}`,
      valor: data.valorRecebido,
      dataMovimento: data.dataRecebimento,
      formaPagamento: data.formaRecebimento,
      conciliado: false,
      userCreatedId: data.userUpdatedId
    });

    await this.fluxoCaixaRepository.create(movimento);

    // Atualizar saldo da conta bancária
    const novoSaldo = contaBancaria.saldoAtual + data.valorRecebido;
    await this.contasBancariasRepository.atualizarSaldo(data.contaBancariaId, novoSaldo);

    return contaAtualizada;
  }
}