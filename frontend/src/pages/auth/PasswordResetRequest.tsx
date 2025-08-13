import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import PasswordResetRequestForm from '@/components/auth/PasswordResetRequestForm';

export default function PasswordResetRequest() {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/password/request-reset', { email });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao solicitar recuperação');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 px-4">
      <PasswordResetRequestForm
        email={email}
        loading={loading}
        error={error || undefined}
        success={success}
        onEmailChange={setEmail}
        onSubmit={handleSubmit}
        onBackToLogin={handleBackToLogin}
      />
    </div>
  );
} 