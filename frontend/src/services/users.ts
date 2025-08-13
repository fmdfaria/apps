import api from './api';
import type { User, CreateUserRequest, CreateUserResponse } from '../types/User';
import { formatWhatsAppDisplay } from '../utils/whatsapp';

// Interface para atualizar usuário
export interface UpdateUserData {
  nome?: string;
  email?: string;
  whatsapp?: string;
  ativo?: boolean;
  profissionalId?: string | null;
}

// Interface para dados do webhook
interface WebhookPasswordData {
  nome: string;
  email: string;
  whatsapp: string;
  whatsappFormatted: string;
  senhaTemporaria: string;
  dataEnvio: string;
}

// Função para enviar senha temporária para webhook
async function sendPasswordToWebhook(data: WebhookPasswordData): Promise<void> {
  try {
    const webhookUrl = import.meta.env.VITE_WEBHOOK_PASSWORD_NEW;
    
    if (!webhookUrl) {
      console.warn('VITE_WEBHOOK_PASSWORD_NEW não configurado no .env');
      return;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Webhook falhou: ${response.status} ${response.statusText}`);
    }

    console.log('Senha enviada com sucesso para o webhook');
  } catch (error) {
    console.error('Erro ao enviar senha para webhook:', error);
    // Não propagar o erro para não quebrar o fluxo principal
  }
}

export const usersService = {
  getUsers: async (): Promise<User[]> => {
    const res = await api.get<User[]>('/users');
    return res.data;
  },

  getUserById: async (id: string): Promise<User> => {
    const res = await api.get<User>(`/users/${id}`);
    return res.data;
  },

  getUserRoles: async (userId: string): Promise<string[]> => {
    const response = await api.get(`/users/${userId}/roles?onlyActive=true`);
    
    // Com a modificação no backend, agora devemos receber { roleId: string; roleName: string }[]
    if (Array.isArray(response.data)) {
      return response.data.map((item: any) => {
        console.log('Role item:', item); // Log temporário para debug
        
        // A API deve retornar { roleId, roleName }
        if (item.roleName) return item.roleName;
        
        // Fallbacks para compatibilidade caso ainda use formato antigo
        if (item.role?.nome) return item.role.nome;
        if (item.nome) return item.nome;
        
        // Se nenhum nome foi encontrado, retornar um indicador
        return `ROLE_${item.roleId?.substring(0, 8) || 'UNKNOWN'}`;
      });
    }
    
    return [];
  },

  createUser: async (data: CreateUserRequest): Promise<CreateUserResponse> => {
    const res = await api.post<CreateUserResponse>('/register', data);
    
    // Enviar dados para webhook após criação bem-sucedida
    const webhookData: WebhookPasswordData = {
      nome: res.data.user.nome,
      email: res.data.user.email,
      whatsapp: res.data.user.whatsapp,
      whatsappFormatted: formatWhatsAppDisplay(res.data.user.whatsapp),
      senhaTemporaria: res.data.senhaTemporaria,
      dataEnvio: new Date().toISOString(),
    };
    
    // Enviar para webhook de forma assíncrona (não bloquear o retorno)
    sendPasswordToWebhook(webhookData).catch(error => {
      console.error('Falha ao enviar para webhook:', error);
    });
    
    return res.data;
  },

  updateUser: async (id: string, data: UpdateUserData): Promise<User> => {
    const res = await api.put<User>(`/users/${id}`, data);
    return res.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}?hardDelete=true`);
  }
};

// Exportações individuais para compatibilidade
export async function getUsers(): Promise<User[]> {
  return usersService.getUsers();
}

export async function getUserById(id: string): Promise<User> {
  return usersService.getUserById(id);
}

export async function getUserRoles(userId: string): Promise<string[]> {
  return usersService.getUserRoles(userId);
}

export async function createUser(data: CreateUserRequest): Promise<CreateUserResponse> {
  return usersService.createUser(data);
}

export async function updateUser(id: string, data: UpdateUserData): Promise<User> {
  return usersService.updateUser(id, data);
}

export async function deleteUser(id: string): Promise<void> {
  return usersService.deleteUser(id);
}