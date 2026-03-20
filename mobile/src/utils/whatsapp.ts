/**
 * Utilitários para formatação e validação de WhatsApp
 */

export function formatWhatsAppDisplay(whatsapp: string): string {
  if (!whatsapp) return '';

  const cleanNumber = whatsapp.replace(/\D/g, '');
  if (!cleanNumber) return '';

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
    if (number.length > 0) {
      return `+${countryCode} (${areaCode}) ${number}`;
    }
    return `+${countryCode} (${areaCode})`;
  }

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

export function cleanWhatsApp(whatsapp: string): string {
  return whatsapp.replace(/\D/g, '');
}

export function applyWhatsAppMask(value: string): string {
  const cleanValue = value.replace(/\D/g, '');
  if (!cleanValue) return '';

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

  if (cleanValue.startsWith('1')) {
    const country = '+1';
    if (cleanValue.length <= 1) return country;
    if (cleanValue.length <= 4) return `${country} (${cleanValue.substring(1)}`;

    const area = cleanValue.substring(1, 4);
    const rest = cleanValue.substring(4);
    if (rest.length <= 3) return `${country} (${area}) ${rest}`;
    return `${country} (${area}) ${rest.substring(0, 3)}-${rest.substring(3, 7)}`;
  }

  const ccLen = cleanValue.length >= 3 ? 2 : Math.min(2, cleanValue.length);
  const country = `+${cleanValue.substring(0, ccLen)}`;
  if (cleanValue.length <= ccLen) return country;
  if (cleanValue.length <= ccLen + 3) return `${country} (${cleanValue.substring(ccLen)}`;

  const area = cleanValue.substring(ccLen, ccLen + 3);
  const rest = cleanValue.substring(ccLen + 3);
  if (rest.length <= 3) return `${country} (${area}) ${rest}`;
  return `${country} (${area}) ${rest.substring(0, 3)}-${rest.substring(3, 7)}`;
}

export function isValidWhatsApp(whatsapp: string): boolean {
  const cleanNumber = cleanWhatsApp(whatsapp);
  if (!cleanNumber) return false;

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

  if (cleanNumber.startsWith('1')) {
    return cleanNumber.length === 11;
  }

  return cleanNumber.length >= 8 && cleanNumber.length <= 15;
}

export function whatsAppToStorage(whatsapp: string): string {
  return cleanWhatsApp(whatsapp);
}
