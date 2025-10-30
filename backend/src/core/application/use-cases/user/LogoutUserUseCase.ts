import { injectable } from 'tsyringe';

@injectable()
export class LogoutUserUseCase {
  constructor() {}

  async execute(): Promise<void> {
    // Logout is now handled entirely on the frontend by clearing localStorage
    // No server-side cleanup needed since we removed refresh tokens
    return;
  }
} 