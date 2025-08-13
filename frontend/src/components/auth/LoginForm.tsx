import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';

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
  const [showPassword, setShowPassword] = useState(false);
  return (
    <form onSubmit={onSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-sm space-y-6">
      <h1 className="text-2xl font-bold text-center">Login</h1>
      {error && <div className="text-red-600 text-sm text-center">{error}</div>}
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input 
          id="email" 
          type="email" 
          value={email} 
          onChange={e => onEmailChange(e.target.value)} 
          autoComplete="off"
          required 
        />
      </div>
      <div>
        <Label htmlFor="senha">Senha</Label>
        <div className="relative">
          <Input 
            id="senha" 
            type={showPassword ? "text" : "password"} 
            value={senha} 
            onChange={e => onSenhaChange(e.target.value)} 
            autoComplete="new-password"
            className="pr-10"
            required 
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
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