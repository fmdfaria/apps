import { injectable, inject } from 'tsyringe';
import { IRoleRoutesRepository } from '../../../domain/repositories/IRoleRoutesRepository';

interface IRequest {
  userId: string;
}

@injectable()
export class ListUserAllowedRoutesUseCase {
  constructor(
    @inject('RoleRoutesRepository')
    private roleRoutesRepository: IRoleRoutesRepository
  ) {}

  async execute({ userId }: IRequest): Promise<{ id: string; path: string; method: string; nome: string; modulo?: string }[]> {
    return await this.roleRoutesRepository.findRoutesByUserId(userId);
  }
}