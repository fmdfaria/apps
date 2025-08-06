import { injectable, inject } from 'tsyringe';
import { Route } from '../../../domain/entities/Route';
import { IRoutesRepository } from '../../../domain/repositories/IRoutesRepository';
import { AppError } from '../../../../shared/errors/AppError';

interface IRequest {
  path: string;
  method: string;
  nome: string;
  descricao?: string;
  modulo?: string;
}

@injectable()
export class CreateRouteUseCase {
  constructor(
    @inject('RoutesRepository')
    private routesRepository: IRoutesRepository
  ) {}

  async execute({ path, method, nome, descricao, modulo }: IRequest): Promise<Route> {
    const existingRoute = await this.routesRepository.findByPath(path, method);

    if (existingRoute) {
      throw new AppError('Já existe uma rota com este path e método', 409);
    }

    const route = new Route({
      path,
      method,
      nome,
      descricao,
      modulo,
      ativo: true,
    });

    return await this.routesRepository.create(route);
  }
}