import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converte uma data ISO string para data local, corrigindo problemas de fuso horário
 * Útil quando o backend salva datas como ISO mas queremos interpretar como data local
 */
export function parseDataLocal(dataIso: string): Date {
  const data = new Date(dataIso);
  return new Date(data.getTime() + data.getTimezoneOffset() * 60000);
}

/**
 * Formata uma data ISO string diretamente para o formato brasileiro
 * Já aplicando a correção de fuso horário
 */
export function formatarDataLocal(dataIso: string, opcoes?: Intl.DateTimeFormatOptions): string {
  const dataLocal = parseDataLocal(dataIso);
  return dataLocal.toLocaleDateString('pt-BR', opcoes);
}
