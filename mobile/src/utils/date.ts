function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function applyDateMask(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

export function isValidDateBr(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
  if (!match) return false;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function dateBrToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!isValidDateBr(trimmed)) return null;

  const [day, month, year] = trimmed.split('-');
  return `${year}-${month}-${day}`;
}

export function isoToDateBr(value?: string | null): string {
  if (!value) return '';

  const normalized = value.substring(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!match) return '';

  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
}
