import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LoginForm from '@/components/auth/LoginForm';
import { useToast } from '@/components/ui/use-toast';

export default function Login() {
  const { login, loading, error, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, senha);
  };

  useEffect(() => {
    if (isAuthenticated) {
      toast({
        title: 'Login realizado com sucesso!',
        description: 'Bem-vindo ao painel.',
        variant: 'success',
      });
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate, toast]);

  useEffect(() => {
    if (error) {
      toast({
        title: 'Erro ao fazer login',
        description: error,
        variant: 'destructive',
      });
    }
  }, [error, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <LoginForm
        email={email}
        senha={senha}
        loading={loading}
        error={error || undefined}
        onEmailChange={setEmail}
        onSenhaChange={setSenha}
        onSubmit={handleSubmit}
      />
    </div>
  );
} 