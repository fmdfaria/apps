import { injectable, inject } from 'tsyringe';
import { IRoutesRepository } from '../../../domain/repositories/IRoutesRepository';
import { IRoleRoutesRepository } from '../../../domain/repositories/IRoleRoutesRepository';
import { AppError } from '../../../../shared/errors/AppError';

interface IRequest {
  id: string;
}

@injectable()
export class DeleteRouteUseCase {
  constructor(
    @inject('RoutesRepository')
    private routesRepository: IRoutesRepository,
    @inject('RoleRoutesRepository')
    private roleRoutesRepository: IRoleRoutesRepository
  ) {}

  async execute({ id }: IRequest): Promise<void> {
    const route = await this.routesRepository.findById(id);

    if (!route) {
      throw new AppError('Rota não encontrada', 404);
    }

    const roleRoutes = await this.roleRoutesRepository.findByRouteId(id);
    
    if (roleRoutes.length > 0) {
      throw new AppError('Não é possível deletar a rota pois existem roles associadas a ela', 409);
    }

    await this.routesRepository.delete(id);
  }
}