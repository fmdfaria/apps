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