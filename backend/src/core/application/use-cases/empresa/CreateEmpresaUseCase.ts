import { injectable, inject } from 'tsyringe';
import { Empresa } from '../../../domain/entities/Empresa';
import { IEmpresasRepository } from '../../../domain/repositories/IEmpresasRepository';

interface CreateEmpresaRequest {
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
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
export class CreateEmpresaUseCase {
  constructor(
    @inject('EmpresasRepository')
    private empresasRepository: IEmpresasRepository
  ) {}

  async execute(data: CreateEmpresaRequest): Promise<Empresa> {
    // Verificar se CNPJ já existe
    const empresaExistente = await this.empresasRepository.findByCnpj(data.cnpj);
    if (empresaExistente) {
      throw new Error('CNPJ já cadastrado');
    }

    // Se for empresa principal, verificar se já existe uma
    if (data.empresaPrincipal) {
      const empresaPrincipalExistente = await this.empresasRepository.findEmpresaPrincipal();
      if (empresaPrincipalExistente) {
        throw new Error('Já existe uma empresa principal cadastrada');
      }
    }

    const empresa = new Empresa({
      razaoSocial: data.razaoSocial,
      nomeFantasia: data.nomeFantasia,
      cnpj: data.cnpj,
      inscricaoEstadual: data.inscricaoEstadual,
      inscricaoMunicipal: data.inscricaoMunicipal,
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      cidade: data.cidade,
      estado: data.estado,
      cep: data.cep,
      telefone: data.telefone,
      email: data.email,
      site: data.site,
      ativo: data.ativo ?? true,
      empresaPrincipal: data.empresaPrincipal ?? false
    });

    return this.empresasRepository.create(empresa);
  }
}