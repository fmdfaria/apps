import { useState, useEffect } from 'react';
import api from '@/services/api';

export const useLogo = () => {
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        setLoading(true);
        const response = await api.get('/logo');
        setLogoUrl(response.data.logoUrl);
        setError(null);
      } catch (err) {
        console.error('Erro ao carregar logo:', err);
        setError('Erro ao carregar logo');
        // Fallback para uma imagem padrão ou vazia
        setLogoUrl('');
      } finally {
        setLoading(false);
      }
    };

    fetchLogo();
  }, []);

  return { logoUrl, loading, error };
};