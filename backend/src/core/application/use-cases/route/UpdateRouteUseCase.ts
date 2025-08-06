import { injectable, inject } from 'tsyringe';
import { Route } from '../../../domain/entities/Route';
import { IRoutesRepository } from '../../../domain/repositories/IRoutesRepository';
import { AppError } from '../../../../shared/errors/AppError';

interface IRequest {
  id: string;
  path?: string;
  method?: string;
  nome?: string;
  descricao?: string;
  modulo?: string;
  ativo?: boolean;
}

@injectable()
export class UpdateRouteUseCase {
  constructor(
    @inject('RoutesRepository')
    private routesRepository: IRoutesRepository
  ) {}

  async execute({ id, path, method, nome, descricao, modulo, ativo }: IRequest): Promise<Route> {
    const route = await this.routesRepository.findById(id);

    if (!route) {
      throw new AppError('Rota não encontrada', 404);
    }

    const newPath = path ?? route.path;
    const newMethod = method ?? route.method;

    if ((path && path !== route.path) || (method && method !== route.method)) {
      const existingRoute = await this.routesRepository.findByPath(newPath, newMethod);
      if (existingRoute && existingRoute.id !== id) {
        throw new AppError('Já existe uma rota com este path e método', 409);
      }
    }

    if (path) route.path = path;
    if (method) route.method = method;
    if (nome) route.nome = nome;
    if (descricao !== undefined) route.descricao = descricao;
    if (modulo !== undefined) route.modulo = modulo;
    if (ativo !== undefined) route.ativo = ativo;

    route.updatedAt = new Date();

    return await this.routesRepository.update(route);
  }
}