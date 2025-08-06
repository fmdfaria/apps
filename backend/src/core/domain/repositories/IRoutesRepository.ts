import { Route } from '../entities/Route';

export interface IRoutesRepository {
  create(route: Route): Promise<Route>;
  findById(id: string): Promise<Route | null>;
  findByPath(path: string, method: string): Promise<Route | null>;
  findAll(): Promise<Route[]>;
  findByModulo(modulo: string): Promise<Route[]>;
  update(route: Route): Promise<Route>;
  delete(id: string): Promise<void>;
  findActiveRoutes(): Promise<Route[]>;
}