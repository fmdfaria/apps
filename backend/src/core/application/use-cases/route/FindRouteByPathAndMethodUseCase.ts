import { injectable, inject } from 'tsyringe';
import { IRoutesRepository } from '../../../domain/repositories/IRoutesRepository';
import { Route } from '../../../domain/entities/Route';

interface IRequest {
  path: string;
  method: string;
}

@injectable()
export class FindRouteByPathAndMethodUseCase {
  constructor(
    @inject('RoutesRepository')
    private routesRepository: IRoutesRepository
  ) {}

  async execute({ path, method }: IRequest): Promise<Route | null> {
    return await this.routesRepository.findByPath(path, method);
  }
}