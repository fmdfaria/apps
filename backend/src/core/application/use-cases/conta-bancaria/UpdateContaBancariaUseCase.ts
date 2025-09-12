import { injectable, inject } from 'tsyringe';
import { ContaBancaria } from '../../../domain/entities/ContaBancaria';
import { IContasBancariasRepository } from '../../../domain/repositories/IContasBancariasRepository';

interface UpdateContaBancariaRequest {
  nome?: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  digito?: string;
  tipoConta?: string;
  pixPrincipal?: string;
  tipoPix?: string;
  contaPrincipal?: boolean;
  ativo?: boolean;
  saldoInicial?: number;
  saldoAtual?: number;
  observacoes?: string;
}

@injectable()
export class UpdateContaBancariaUseCase {
  constructor(
    @inject('ContasBancariasRepository')
    private contasBancariasRepository: IContasBancariasRepository
  ) {}

  async execute(id: string, data: UpdateContaBancariaRequest): Promise<ContaBancaria> {
    // Verificar se conta existe
    const contaExistente = await this.contasBancariasRepository.findById(id);
    if (!contaExistente) {
      throw new Error('Conta bancária não encontrada');
    }

    // Se estiver definindo como conta principal, verificar se já existe uma para a empresa
    if (data.contaPrincipal && !contaExistente.contaPrincipal) {
      const contaPrincipalExistente = await this.contasBancariasRepository.findContaPrincipalByEmpresa(contaExistente.empresaId);
      if (contaPrincipalExistente) {
        throw new Error('Já existe uma conta principal para esta empresa');
      }
    }

    return this.contasBancariasRepository.update(id, data);
  }
}