/**
 * Utilitários para formatação e validação de WhatsApp
 */

/**
 * Formata um número de WhatsApp para exibição visual (DDI + DDD + número)
 * Suporta:
 *  - Brasil (+55): DDD 2 dígitos, número 8 ou 9 dígitos
 *  - EUA/Canadá (+1): DDD 3 dígitos, número 7 dígitos (3-4)
 *  - Outros: tentativa genérica (+CC (AAA) XXX-XXXX)
 * @param whatsapp Número contendo apenas dígitos ou já formatado
 */
export function formatWhatsAppDisplay(whatsapp: string): string {
  if (!whatsapp) return '';

  const cleanNumber = whatsapp.replace(/\D/g, '');
  if (!cleanNumber) return '';

  // Brasil
  if (cleanNumber.startsWith('55')) {
    if (cleanNumber.length < 12) return `+55`;
    const countryCode = '55';
    const areaCode = cleanNumber.substring(2, 4);
    const number = cleanNumber.substring(4);

    if (number.length >= 9) {
      return `+${countryCode} (${areaCode}) ${number.substring(0, 5)}-${number.substring(5, 9)}`;
    }
    if (number.length >= 8) {
      return `+${countryCode} (${areaCode}) ${number.substring(0, 4)}-${number.substring(4, 8)}`;
    }
    // Parcial durante digitação
    if (number.length > 0) {
      return `+${countryCode} (${areaCode}) ${number}`;
    }
    return `+${countryCode} (${areaCode})`;
  }

  // EUA/Canadá (NANP)
  if (cleanNumber.startsWith('1')) {
    const countryCode = '1';
    if (cleanNumber.length <= 1) return `+${countryCode}`;
    const area = cleanNumber.substring(1, Math.min(4, cleanNumber.length));
    const rest = cleanNumber.substring(Math.min(4, cleanNumber.length));

    if (!rest) return `+${countryCode} (${area}` + (area.length === 3 ? ')' : '');

    if (rest.length <= 3) {
      return `+${countryCode} (${area}) ${rest}`;
    }
    const first = rest.substring(0, 3);
    const last = rest.substring(3, 7);
    return `+${countryCode} (${area}) ${first}` + (last ? `-${last}` : '');
  }

  // Genérico: tenta CC de 2-3 dígitos, DDD 3 dígitos, número 3-4
  const ccLen = cleanNumber.length >= 3 ? 2 : Math.min(2, cleanNumber.length);
  const countryCode = cleanNumber.substring(0, ccLen);
  const area = cleanNumber.substring(ccLen, Math.min(ccLen + 3, cleanNumber.length));
  const rest = cleanNumber.substring(ccLen + 3);

  if (!area) return `+${countryCode}`;

  if (!rest) return `+${countryCode} (${area}` + (area.length === 3 ? ')' : '');

  if (rest.length <= 3) {
    return `+${countryCode} (${area}) ${rest}`;
  }
  return `+${countryCode} (${area}) ${rest.substring(0, 3)}-${rest.substring(3, 7)}`;
}

/**
 * Remove formatação do WhatsApp deixando apenas números
 * @param whatsapp Número formatado +55 (11) 99999-9999
 * @returns Número limpo 5511999999999
 */
export function cleanWhatsApp(whatsapp: string): string {
  return whatsapp.replace(/\D/g, '');
}

/**
 * Aplica máscara de formatação enquanto o usuário digita
 * @param value Valor atual do input
 * @returns Valor formatado com máscara
 */
export function applyWhatsAppMask(value: string): string {
  const cleanValue = value.replace(/\D/g, '');
  if (!cleanValue) return '';

  // Brasil
  if (cleanValue.startsWith('55')) {
    const country = '+55';
    if (cleanValue.length <= 2) return country;
    if (cleanValue.length <= 4) return `${country} (${cleanValue.substring(2)}`;

    const area = cleanValue.substring(2, 4);
    const number = cleanValue.substring(4);

    if (number.length <= 4) return `${country} (${area}) ${number}`;
    if (number.length <= 8) return `${country} (${area}) ${number.substring(0, 4)}-${number.substring(4)}`;
    return `${country} (${area}) ${number.substring(0, 5)}-${number.substring(5, 9)}`;
  }

  // EUA/Canadá (NANP)
  if (cleanValue.startsWith('1')) {
    const country = '+1';
    if (cleanValue.length <= 1) return country;
    if (cleanValue.length <= 4) return `${country} (${cleanValue.substring(1)}`;

    const area = cleanValue.substring(1, 4);
    const rest = cleanValue.substring(4);
    if (rest.length <= 3) return `${country} (${area}) ${rest}`;
    return `${country} (${area}) ${rest.substring(0, 3)}-${rest.substring(3, 7)}`;
  }

  // Genérico: CC 2-3, DDD 3, número 3-4
  const ccLen = cleanValue.length >= 3 ? 2 : Math.min(2, cleanValue.length);
  const country = `+${cleanValue.substring(0, ccLen)}`;
  if (cleanValue.length <= ccLen) return country;
  if (cleanValue.length <= ccLen + 3) return `${country} (${cleanValue.substring(ccLen)}`;

  const area = cleanValue.substring(ccLen, ccLen + 3);
  const rest = cleanValue.substring(ccLen + 3);
  if (rest.length <= 3) return `${country} (${area}) ${rest}`;
  return `${country} (${area}) ${rest.substring(0, 3)}-${rest.substring(3, 7)}`;
}

/**
 * Valida se um WhatsApp está no formato correto
 * @param whatsapp Número de WhatsApp
 * @returns true se válido
 */
export function isValidWhatsApp(whatsapp: string): boolean {
  const cleanNumber = cleanWhatsApp(whatsapp);
  if (!cleanNumber) return false;

  // Brasil
  if (cleanNumber.startsWith('55')) {
    if (cleanNumber.length < 12 || cleanNumber.length > 14) return false;
    const areaCode = parseInt(cleanNumber.substring(2, 4));
    if (Number.isNaN(areaCode) || areaCode < 11 || areaCode > 99) return false;
    if (cleanNumber.length === 14) {
      const firstDigit = cleanNumber.charAt(4);
      return firstDigit === '9';
    }
    return true;
  }

  // EUA/Canadá (NANP): 1 + 3 + 7 = 11
  if (cleanNumber.startsWith('1')) {
    return cleanNumber.length === 11;
  }

  // Genérico (E.164): 8 a 15 dígitos
  return cleanNumber.length >= 8 && cleanNumber.length <= 15;
}

/**
 * Converte WhatsApp formatado para o formato de armazenamento
 * @param whatsapp Número formatado +55 (11) 99999-9999
 * @returns Número para armazenar 5511999999999
 */
export function whatsAppToStorage(whatsapp: string): string {
  // Apenas retorna dígitos (E.164 sem "+"). Não adiciona DDI padrão.
  return cleanWhatsApp(whatsapp);
}

/**
 * Converte WhatsApp do formato de armazenamento para exibição
 * @param whatsapp Número armazenado 5511999999999
 * @returns Número formatado +55 (11) 99999-9999
 */
export function whatsAppFromStorage(whatsapp: string): string {
  if (!whatsapp) return '';
  return formatWhatsAppDisplay(whatsapp);
}