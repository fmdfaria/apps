export interface AdendoContrato {
  id: string;
  contratoId: string;
  dataAdendo: string;
  arquivoAdendo?: string | null;
  descricao?: string | null;
} 