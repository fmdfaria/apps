import { injectable, inject } from 'tsyringe';
import { Empresa } from '../../../domain/entities/Empresa';
import { IEmpresasRepository } from '../../../domain/repositories/IEmpresasRepository';

interface UpdateEmpresaRequest {
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  site?: string;
  ativo?: boolean;
  empresaPrincipal?: boolean;
}

@injectable()
export class UpdateEmpresaUseCase {
  constructor(
    @inject('EmpresasRepository')
    private empresasRepository: IEmpresasRepository
  ) {}

  async execute(id: string, data: UpdateEmpresaRequest): Promise<Empresa> {
    const empresa = await this.empresasRepository.findById(id);
    if (!empresa) {
      throw new Error('Empresa não encontrada');
    }

    // Verificar CNPJ duplicado se estiver sendo alterado
    if (data.cnpj && data.cnpj !== empresa.cnpj) {
      const empresaExistente = await this.empresasRepository.findByCnpj(data.cnpj);
      if (empresaExistente) {
        throw new Error('CNPJ já cadastrado');
      }
    }

    // Verificar empresa principal se estiver sendo alterado
    if (data.empresaPrincipal && !empresa.empresaPrincipal) {
      const empresaPrincipalExistente = await this.empresasRepository.findEmpresaPrincipal();
      if (empresaPrincipalExistente) {
        throw new Error('Já existe uma empresa principal cadastrada');
      }
    }

    return this.empresasRepository.update(id, data);
  }
}