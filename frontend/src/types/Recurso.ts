export interface Recurso {
  id: string;
  nome: string;
  descricao?: string;
  tipo?: string; // Campo usado na ocupação
  ativo?: boolean; // Campo opcional para compatibilidade futura
} 