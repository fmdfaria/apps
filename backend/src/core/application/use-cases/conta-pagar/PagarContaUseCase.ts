import { injectable, inject } from 'tsyringe';
import { ContaPagar } from '../../../domain/entities/ContaPagar';
import { FluxoCaixa } from '../../../domain/entities/FluxoCaixa';
import { IContasPagarRepository } from '../../../domain/repositories/IContasPagarRepository';
import { IFluxoCaixaRepository } from '../../../domain/repositories/IFluxoCaixaRepository';
import { IContasBancariasRepository } from '../../../domain/repositories/IContasBancariasRepository';

interface PagarContaRequest {
  contaId: string;
  valorPago: number;
  dataPagamento: Date;
  formaPagamento: string;
  contaBancariaId: string;
  observacoes?: string;
  userUpdatedId?: string;
}

@injectable()
export class PagarContaUseCase {
  constructor(
    @inject('ContasPagarRepository')
    private contasPagarRepository: IContasPagarRepository,
    @inject('FluxoCaixaRepository')
    private fluxoCaixaRepository: IFluxoCaixaRepository,
    @inject('ContasBancariasRepository')
    private contasBancariasRepository: IContasBancariasRepository
  ) {}

  async execute(data: PagarContaRequest): Promise<ContaPagar> {
    // Buscar a conta
    const conta = await this.contasPagarRepository.findById(data.contaId);
    if (!conta) {
      throw new Error('Conta não encontrada');
    }

    if (conta.status === 'PAGO') {
      throw new Error('Conta já foi totalmente paga');
    }

    if (conta.status === 'CANCELADO') {
      throw new Error('Conta cancelada não pode ser paga');
    }

    // Validar valor
    const novoValorPago = conta.valorPago + data.valorPago;
    if (novoValorPago > conta.valorLiquido) {
      throw new Error('Valor pago não pode ser maior que o valor líquido da conta');
    }

    // Verificar conta bancária
    const contaBancaria = await this.contasBancariasRepository.findById(data.contaBancariaId);
    if (!contaBancaria) {
      throw new Error('Conta bancária não encontrada');
    }

    // Determinar novo status
    let novoStatus = 'PARCIAL';
    if (novoValorPago >= conta.valorLiquido) {
      novoStatus = 'PAGO';
    }

    // Atualizar conta
    const contaAtualizada = await this.contasPagarRepository.update(data.contaId, {
      valorPago: novoValorPago,
      dataPagamento: data.dataPagamento,
      formaPagamento: data.formaPagamento,
      status: novoStatus,
      observacoes: data.observacoes,
      userUpdatedId: data.userUpdatedId
    });

    // Criar movimentação no fluxo de caixa
    const movimento = new FluxoCaixa({
      empresaId: conta.empresaId,
      contaBancariaId: data.contaBancariaId,
      contaPagarId: conta.id,
      tipo: 'SAIDA',
      categoriaId: conta.categoriaId,
      descricao: `Pagamento: ${conta.descricao}`,
      valor: data.valorPago,
      dataMovimento: data.dataPagamento,
      formaPagamento: data.formaPagamento,
      conciliado: false,
      userCreatedId: data.userUpdatedId
    });

    await this.fluxoCaixaRepository.create(movimento);

    // Atualizar saldo da conta bancária
    const novoSaldo = contaBancaria.saldoAtual - data.valorPago;
    await this.contasBancariasRepository.atualizarSaldo(data.contaBancariaId, novoSaldo);

    return contaAtualizada;
  }
}