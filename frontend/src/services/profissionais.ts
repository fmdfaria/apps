import api from './api';
import type { Profissional } from '@/types/Profissional';

const allowedFields = [
  'nome', 'cpf', 'email', 'cnpj', 'razaoSocial', 'logradouro', 'numero', 'complemento',
  'bairro', 'cidade', 'estado', 'cep', 'comprovanteEndereco', 'conselhoId', 'numeroConselho',
  'comprovanteRegistro', 'banco', 'tipoConta', 'agencia', 'contaNumero', 'contaDigito', 'pix', 'tipo_pix', 'comprovanteBancario',
  'userId', 'especialidadesIds', 'whatsapp'
];

export async function getProfissionais(): Promise<Profissional[]> {
  const { data } = await api.get('/profissionais');
  return data;
}

export async function getProfissionaisAtivos(): Promise<Profissional[]> {
  const { data } = await api.get('/profissionais/ativos');
  return data;
}

export async function getProfissional(id: string): Promise<Profissional> {
  const { data } = await api.get(`/profissionais/${id}`);
  return data;
}

export async function createProfissional(payload: any): Promise<Profissional> {
  // ✅ REFATORAÇÃO: Criação simples com JSON - apenas campos essenciais
  const profissionalPayload = {
    nome: payload.nome,
    cpf: payload.cpf,
    email: payload.email,
    whatsapp: payload.whatsapp || null,
  };

  const { data } = await api.post('/profissionais', profissionalPayload, {
    headers: { 'Content-Type': 'application/json' },
  });
  return data;
}

export async function updateProfissional(id: string, payload: any): Promise<Profissional> {
  const formData = new FormData();
  
  Object.entries(payload).forEach(([key, value]) => {
    if (!allowedFields.includes(key)) return;
    
    if (key === 'especialidadesIds' && Array.isArray(value)) {
      formData.append(key, JSON.stringify(value));
    } else if (key === 'conselhoId') {
      // ✅ CORREÇÃO: Só enviar conselhoId se tiver valor
      if (value && String(value).trim() !== '') {
        formData.append(key, String(value));
      }
    } else if (value instanceof File) {
      formData.append(key, value);
    } else if (Array.isArray(value)) {
      // Ignora arrays que não são especialidadesIds
      return;
    } else if (value !== undefined && value !== null && value !== '') {
      formData.append(key, String(value));
    }
  });

  // ✅ CORREÇÃO CRÍTICA: Remover Content-Type manual - deixar o navegador definir automaticamente
  const { data } = await api.put(`/profissionais/${id}`, formData);
  return data;
}

export async function deleteProfissional(id: string): Promise<void> {
  await api.delete(`/profissionais/${id}`);
}

// ✅ NOVOS ENDPOINTS ESPECIALIZADOS
export async function updateProfissionalEndereco(id: string, payload: any): Promise<Profissional> {
  const formData = new FormData();
  
  // Campos de endereço
  const enderecoFields = ['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado'];
  
  enderecoFields.forEach(field => {
    if (payload[field] !== undefined && payload[field] !== null && payload[field] !== '') {
      formData.append(field, String(payload[field]));
    }
  });

  // Arquivo de comprovante
  if (payload.file && payload.file instanceof File) {
    formData.append('file', payload.file);
  }

  const { data } = await api.put(`/profissionais/${id}/endereco`, formData);
  return data;
}

export async function updateProfissionalInfoProfissional(id: string, payload: any): Promise<Profissional> {
  const formData = new FormData();
  
  // Campos profissionais
  if (payload.conselhoId && String(payload.conselhoId).trim() !== '') {
    formData.append('conselhoId', String(payload.conselhoId));
  }
  if (payload.numeroConselho !== undefined && payload.numeroConselho !== null && payload.numeroConselho !== '') {
    formData.append('numeroConselho', String(payload.numeroConselho));
  }
  if (Array.isArray(payload.especialidadesIds)) {
    formData.append('especialidadesIds', JSON.stringify(payload.especialidadesIds));
  }

  // Múltiplos arquivos de comprovante
  if (Array.isArray(payload.files)) {
    payload.files.forEach((file: File, index: number) => {
      if (file instanceof File) {
        formData.append(`files`, file);
      }
    });
  }
  // Backward compatibility: single file
  else if (payload.file && payload.file instanceof File) {
    formData.append('files', payload.file);
  }

  const { data } = await api.put(`/profissionais/${id}/informacao-profissional`, formData);
  return data;
}

export async function updateProfissionalDadosBancarios(id: string, payload: any): Promise<Profissional> {
  const formData = new FormData();
  
  // Campos bancários - usando snake_case para compatibilidade com backend
  const bancarioFields = ['banco', 'tipo_conta', 'agencia', 'conta_numero', 'conta_digito', 'tipo_pix', 'pix'];
  
  bancarioFields.forEach(field => {
    if (payload[field] !== undefined && payload[field] !== null && payload[field] !== '') {
      formData.append(field, String(payload[field]));
    }
  });

  // Arquivo de comprovante
  if (payload.file && payload.file instanceof File) {
    formData.append('file', payload.file);
  }

  const { data } = await api.put(`/profissionais/${id}/dados-bancarios`, formData);
  return data;
}

export async function updateProfissionalEmpresaContrato(id: string, payload: any): Promise<Profissional> {
  const empresaPayload = {
    cnpj: payload.cnpj || null,
    razaoSocial: payload.razaoSocial || null,
  };

  const { data } = await api.put(`/profissionais/${id}/empresa-contrato`, empresaPayload, {
    headers: { 'Content-Type': 'application/json' },
  });
  return data;
} 

// ✅ NOVAS FUNÇÕES PARA DELETAR COMPROVANTES
export async function deleteProfissionalComprovanteEndereco(id: string): Promise<Profissional> {
  const { data } = await api.delete(`/profissionais/${id}/comprovante-endereco`);
  return data;
}

export async function deleteProfissionalComprovanteRegistro(id: string): Promise<Profissional> {
  const { data } = await api.delete(`/profissionais/${id}/comprovante-registro`);
  return data;
}

export async function deleteProfissionalComprovanteBancario(id: string): Promise<Profissional> {
  const { data } = await api.delete(`/profissionais/${id}/comprovante-bancario`);
  return data;
}

// ✅ NOVA FUNÇÃO PARA ATRIBUIR SERVIÇOS
export async function updateProfissionalServicos(id: string, servicosIds: string[]): Promise<Profissional> {
  const { data } = await api.put(`/profissionais/${id}/servicos`, { servicosIds }, {
    headers: { 'Content-Type': 'application/json' },
  });
  return data;
}

export const toggleProfissionalStatus = async (id: string, ativo: boolean): Promise<Profissional> => {
  const { data } = await api.patch(`/profissionais/${id}/status`, { ativo });
  return data;
}; 