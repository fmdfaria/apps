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
 * Converte um ISO de horário (ex. "1970-01-01T08:00:00.000Z" ou Date equivalente)
 * para um Date local com a MESMA hora/minuto, ignorando offset do timezone.
 * Mantemos uma data base fixa para evitar efeitos colaterais.
 */
export function parseHoraLocalFromISOTime(iso: string | Date): Date {
  const str = typeof iso === 'string' ? iso : iso.toISOString();
  const match = str.match(/T(\d{2}):(\d{2})(?::(\d{2}))?/);
  const horas = match ? parseInt(match[1], 10) : 0;
  const minutos = match ? parseInt(match[2], 10) : 0;
  const segundos = match && match[3] ? parseInt(match[3], 10) : 0;
  return new Date(1970, 0, 1, horas, minutos, segundos, 0);
}

/**
 * Formata uma Date para string somente data no formato YYYY-MM-DD
 * para enviar ao backend (colunas DATE) sem deslocamento de fuso.
 */
export function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formata uma data ISO string diretamente para o formato brasileiro
 * Já aplicando a correção de fuso horário
 */
export function formatarDataLocal(dataIso: string, opcoes?: Intl.DateTimeFormatOptions): string {
  const dataLocal = parseDataLocal(dataIso);
  return dataLocal.toLocaleDateString('pt-BR', opcoes);
}
