import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import EmailConfirmationMessage from '@/components/auth/EmailConfirmationMessage';

export default function EmailConfirmation() {
  const [searchParams] = useSearchParams();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    const confirmEmail = async () => {
      setLoading(true);
      try {
        await api.post('/email/confirm', { token });
        setSuccess(true);
        setTimeout(() => navigate('/auth/login'), 2000);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Erro ao confirmar e-mail');
      } finally {
        setLoading(false);
      }
    };
    if (token) confirmEmail();
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <EmailConfirmationMessage
        success={success}
        error={error || undefined}
        loading={loading}
      />
    </div>
  );
} 