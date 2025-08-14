import api from './api';

export interface UploadAvatarResponse {
  message: string;
  avatarUrl: string;
}

export const uploadAvatar = async (file: File): Promise<UploadAvatarResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post<UploadAvatarResponse>('/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data;
};

export interface GetAvatarUrlResponse {
  avatarUrl: string;
}

const AVATAR_CACHE_URL_KEY = 'avatar_url_cache';
const AVATAR_CACHE_EXP_KEY = 'avatar_url_cache_exp';

export const getAvatarUrl = async (): Promise<string | null> => {
  try {
    const cachedUrl = localStorage.getItem(AVATAR_CACHE_URL_KEY) || '';
    const cachedExp = Number(localStorage.getItem(AVATAR_CACHE_EXP_KEY) || 0);
    const now = Date.now();
    if (cachedUrl && cachedExp && now < cachedExp) {
      return cachedUrl;
    }
  } catch {
    // ignore cache errors
  }

  try {
    const { data } = await api.get<GetAvatarUrlResponse>('/avatar');

    // Cache por ~55 minutos (presignado dura 60m no backend)
    try {
      localStorage.setItem(AVATAR_CACHE_URL_KEY, data.avatarUrl);
      localStorage.setItem(AVATAR_CACHE_EXP_KEY, String(Date.now() + 55 * 60 * 1000));
    } catch {
      // ignore cache errors
    }

    return data.avatarUrl;
  } catch (error: any) {
    // Se for 404, significa que o usuário não tem avatar - caso normal
    if (error?.response?.status === 404) {
      return null;
    }
    
    // Para outros erros, propagar o erro
    throw error;
  }
};

export const setCachedAvatarUrl = (url: string) => {
  try {
    localStorage.setItem(AVATAR_CACHE_URL_KEY, url);
    localStorage.setItem(AVATAR_CACHE_EXP_KEY, String(Date.now() + 55 * 60 * 1000));
  } catch {
    // ignore
  }
};