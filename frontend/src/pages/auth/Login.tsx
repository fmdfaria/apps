import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import LoginForm from '@/components/auth/LoginForm';
import { AppToast } from '@/services/toast';

export default function Login() {
  const { login, loading, error, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, senha);
  };

  useEffect(() => {
    if (isAuthenticated) {
      AppToast.success('Login realizado com sucesso!', {
        description: 'Bem-vindo ao painel da clínica.'
      });
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (error) {
      AppToast.error('Erro ao fazer login', {
        description: error
      });
    }
  }, [error]);

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