import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface PasswordResetRequestFormProps {
  email: string;
  loading: boolean;
  error?: string;
  success?: boolean;
  onEmailChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function PasswordResetRequestForm({ email, loading, error, success, onEmailChange, onSubmit }: PasswordResetRequestFormProps) {
  return (
    <form onSubmit={onSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-sm space-y-6">
      <h1 className="text-2xl font-bold text-center">Recuperar Senha</h1>
      {success ? (
        <div className="text-green-600 text-sm text-center">Verifique seu e-mail para redefinir a senha.</div>
      ) : (
        <>
          {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={e => onEmailChange(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>Enviar</Button>
        </>
      )}
    </form>
  );
} 