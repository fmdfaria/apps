import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface PasswordResetFormProps {
  novaSenha: string;
  confirmarSenha: string;
  loading: boolean;
  error?: string;
  success?: boolean;
  onNovaSenhaChange: (v: string) => void;
  onConfirmarSenhaChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function PasswordResetForm({ novaSenha, confirmarSenha, loading, error, success, onNovaSenhaChange, onConfirmarSenhaChange, onSubmit }: PasswordResetFormProps) {
  return (
    <form onSubmit={onSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-sm space-y-6">
      <h1 className="text-2xl font-bold text-center">Redefinir Senha</h1>
      {success ? (
        <div className="text-green-600 text-sm text-center">Senha redefinida com sucesso! Redirecionando...</div>
      ) : (
        <>
          {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          <div>
            <Label htmlFor="novaSenha">Nova Senha</Label>
            <Input id="novaSenha" type="password" value={novaSenha} onChange={e => onNovaSenhaChange(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="confirmarSenha">Confirmar Senha</Label>
            <Input id="confirmarSenha" type="password" value={confirmarSenha} onChange={e => onConfirmarSenhaChange(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>Redefinir</Button>
        </>
      )}
    </form>
  );
} 