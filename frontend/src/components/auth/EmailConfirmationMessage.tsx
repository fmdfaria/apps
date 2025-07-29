import React from 'react';
import { Button } from '@/components/ui/button';

interface EmailConfirmationMessageProps {
  success?: boolean;
  error?: string;
  loading?: boolean;
}

export default function EmailConfirmationMessage({ success, error, loading }: EmailConfirmationMessageProps) {
  return (
    <div className="bg-white p-8 rounded shadow-md w-full max-w-sm space-y-6 text-center">
      <h1 className="text-2xl font-bold">Confirmação de E-mail</h1>
      {success ? (
        <div className="text-green-600 text-sm">E-mail confirmado com sucesso! Redirecionando...</div>
      ) : error ? (
        <div className="text-red-600 text-sm">{error}</div>
      ) : (
        <div className="text-gray-600 text-sm">{loading ? 'Confirmando e-mail...' : 'Aguardando confirmação...'}</div>
      )}
      <Button asChild className="w-full mt-4" variant="outline">
        <a href="/auth/login">Ir para Login</a>
      </Button>
    </div>
  );
} 