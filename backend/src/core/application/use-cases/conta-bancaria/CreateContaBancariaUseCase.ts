import { injectable, inject } from 'tsyringe';
import { ContaBancaria } from '../../../domain/entities/ContaBancaria';
import { IContasBancariasRepository } from '../../../domain/repositories/IContasBancariasRepository';
import { IEmpresasRepository } from '../../../domain/repositories/IEmpresasRepository';

interface CreateContaBancariaRequest {
  empresaId: string;
  nome: string;
  banco: string;
  agencia: string;
  conta: string;
  digito?: string;
  tipoConta?: string;
  pixPrincipal?: string;
  tipoPix?: string;
  contaPrincipal?: boolean;
  ativo?: boolean;
  saldoInicial?: number;
  observacoes?: string;
}

@injectable()
export class CreateContaBancariaUseCase {
  constructor(
    @inject('ContasBancariasRepository')
    private contasBancariasRepository: IContasBancariasRepository,
    @inject('EmpresasRepository')
    private empresasRepository: IEmpresasRepository
  ) {}

  async execute(data: CreateContaBancariaRequest): Promise<ContaBancaria> {
    // Verificar se empresa existe
    const empresa = await this.empresasRepository.findById(data.empresaId);
    if (!empresa) {
      throw new Error('Empresa não encontrada');
    }

    // Se for conta principal, verificar se já existe uma para a empresa
    if (data.contaPrincipal) {
      const contaPrincipalExistente = await this.contasBancariasRepository.findContaPrincipalByEmpresa(data.empresaId);
      if (contaPrincipalExistente) {
        throw new Error('Já existe uma conta principal para esta empresa');
      }
    }

    const contaBancaria = new ContaBancaria({
      empresaId: data.empresaId,
      nome: data.nome,
      banco: data.banco,
      agencia: data.agencia,
      conta: data.conta,
      digito: data.digito,
      tipoConta: data.tipoConta ?? 'CORRENTE',
      pixPrincipal: data.pixPrincipal,
      tipoPix: data.tipoPix,
      contaPrincipal: data.contaPrincipal ?? false,
      ativo: data.ativo ?? true,
      saldoInicial: data.saldoInicial ?? 0,
      saldoAtual: data.saldoInicial ?? 0,
      observacoes: data.observacoes
    });

    return this.contasBancariasRepository.create(contaBancaria);
  }
}