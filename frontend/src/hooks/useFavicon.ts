import { useEffect } from 'react';
import api from '@/services/api';

export const useFavicon = () => {
  useEffect(() => {
    const updateFavicon = async () => {
      try {
        // Buscar URL presignada do favicon
        const response = await api.get('/favicon');
        const faviconUrl = response.data.faviconUrl;
        
        // Remover favicon existente
        const existingFavicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
        if (existingFavicon) {
          existingFavicon.remove();
        }
        
        // Criar novo elemento de favicon
        const link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/png';
        link.href = faviconUrl;
        
        // Adicionar ao head
        document.head.appendChild(link);
        
        console.log('Favicon atualizado com sucesso');
      } catch (error) {
        console.error('Erro ao carregar favicon:', error);
        // Em caso de erro, manter o favicon padrão
      }
    };

    updateFavicon();
  }, []);
};