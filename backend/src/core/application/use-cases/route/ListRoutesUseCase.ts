import { injectable, inject } from 'tsyringe';
import { Route } from '../../../domain/entities/Route';
import { IRoutesRepository } from '../../../domain/repositories/IRoutesRepository';

interface IRequest {
  onlyActive?: boolean;
  modulo?: string;
}

@injectable()
export class ListRoutesUseCase {
  constructor(
    @inject('RoutesRepository')
    private routesRepository: IRoutesRepository
  ) {}

  async execute({ onlyActive = false, modulo }: IRequest = {}): Promise<Route[]> {
    if (modulo) {
      return await this.routesRepository.findByModulo(modulo);
    }

    if (onlyActive) {
      return await this.routesRepository.findActiveRoutes();
    }

    return await this.routesRepository.findAll();
  }
}