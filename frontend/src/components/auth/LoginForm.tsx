import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface LoginFormProps {
  email: string;
  senha: string;
  loading: boolean;
  error?: string;
  onEmailChange: (v: string) => void;
  onSenhaChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function LoginForm({ email, senha, loading, error, onEmailChange, onSenhaChange, onSubmit }: LoginFormProps) {
  return (
    <form onSubmit={onSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-sm space-y-6">
      <h1 className="text-2xl font-bold text-center">Login</h1>
      {error && <div className="text-red-600 text-sm text-center">{error}</div>}
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" value={email} onChange={e => onEmailChange(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="senha">Senha</Label>
        <Input id="senha" type="password" value={senha} onChange={e => onSenhaChange(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Entrando...' : 'Entrar'}
      </Button>
      <div className="text-center">
        <a href="/auth/password-reset-request" className="text-blue-600 text-sm hover:underline">Esqueci minha senha</a>
      </div>
    </form>
  );
} 