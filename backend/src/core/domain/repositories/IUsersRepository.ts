import { User } from '../entities/User';

export interface IUsersRepository {
  create(data: Omit<User, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  update(id: string, data: Partial<Omit<User, 'id' | 'criadoEm' | 'atualizadoEm'>>): Promise<User>;
  delete(id: string): Promise<void>;
  list(filters?: Partial<Pick<User, 'tipo' | 'ativo'>>): Promise<User[]>;
  findByProfissionalId(profissionalId: string): Promise<User | null>;
  findByPacienteId(pacienteId: string): Promise<User | null>;
} 