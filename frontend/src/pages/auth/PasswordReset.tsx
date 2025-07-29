import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import PasswordResetForm from '@/components/auth/PasswordResetForm';

export default function PasswordReset() {
  const [searchParams] = useSearchParams();
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (novaSenha !== confirmarSenha) {
      setError('As senhas não coincidem');
      return;
    }
    setLoading(true);
    try {
      await api.post('/password/reset', { token, novaSenha });
      setSuccess(true);
      setTimeout(() => navigate('/auth/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao redefinir senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <PasswordResetForm
        novaSenha={novaSenha}
        confirmarSenha={confirmarSenha}
        loading={loading}
        error={error || undefined}
        success={success}
        onNovaSenhaChange={setNovaSenha}
        onConfirmarSenhaChange={setConfirmarSenha}
        onSubmit={handleSubmit}
      />
    </div>
  );
} 