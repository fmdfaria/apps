/**
 * Utilitários para formatação e validação de WhatsApp
 */

/**
 * Formata um número de WhatsApp para exibição visual
 * @param whatsapp Número no formato 5511999999999
 * @returns Número formatado +55 (11) 99999-9999
 */
export function formatWhatsAppDisplay(whatsapp: string): string {
  if (!whatsapp) return '';
  
  // Remove qualquer formatação existente
  const cleanNumber = whatsapp.replace(/\D/g, '');
  
  // Verifica se é um número brasileiro válido
  if (cleanNumber.length < 13 || cleanNumber.length > 14 || !cleanNumber.startsWith('55')) {
    return whatsapp; // Retorna original se inválido
  }
  
  // Extrai as partes do número
  const countryCode = cleanNumber.substring(0, 2); // 55
  const areaCode = cleanNumber.substring(2, 4); // 11
  const number = cleanNumber.substring(4); // 999999999
  
  // Formata baseado no tamanho do número
  if (number.length === 9) {
    // Celular com 9 dígitos: +55 (11) 99999-9999
    return `+${countryCode} (${areaCode}) ${number.substring(0, 5)}-${number.substring(5)}`;
  } else if (number.length === 8) {
    // Fixo com 8 dígitos: +55 (11) 9999-9999
    return `+${countryCode} (${areaCode}) ${number.substring(0, 4)}-${number.substring(4)}`;
  }
  
  return whatsapp; // Retorna original se não conseguir formatar
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
  // Remove tudo que não é número
  const cleanValue = value.replace(/\D/g, '');
  
  // Se não tem números, retorna vazio
  if (!cleanValue) return '';
  
  // Sempre começar com +55
  let formatted = '+55';
  
  if (cleanValue.length > 2) {
    // Adiciona parênteses no DDD
    const areaCode = cleanValue.substring(2, 4);
    formatted += ` (${areaCode}`;
    
    if (cleanValue.length > 4) {
      formatted += ')';
      
      const number = cleanValue.substring(4);
      
      if (number.length <= 4) {
        // Primeiros 4 dígitos
        formatted += ` ${number}`;
      } else if (number.length <= 8) {
        // Formato: +55 (11) 9999-9999 (fixo)
        formatted += ` ${number.substring(0, 4)}-${number.substring(4)}`;
      } else {
        // Formato: +55 (11) 99999-9999 (celular)
        formatted += ` ${number.substring(0, 5)}-${number.substring(5, 9)}`;
      }
    }
  }
  
  return formatted;
}

/**
 * Valida se um WhatsApp está no formato correto
 * @param whatsapp Número de WhatsApp
 * @returns true se válido
 */
export function isValidWhatsApp(whatsapp: string): boolean {
  const cleanNumber = cleanWhatsApp(whatsapp);
  
  // Deve ter entre 13 e 14 dígitos e começar com 55
  if (cleanNumber.length < 13 || cleanNumber.length > 14 || !cleanNumber.startsWith('55')) {
    return false;
  }
  
  // Verifica se o código de área é válido (11-99)
  const areaCode = parseInt(cleanNumber.substring(2, 4));
  if (areaCode < 11 || areaCode > 99) {
    return false;
  }
  
  // Para celular, deve ter 9 dígitos no número e começar com 9
  if (cleanNumber.length === 14) {
    const firstDigit = cleanNumber.charAt(4);
    return firstDigit === '9';
  }
  
  // Para fixo, deve ter 8 dígitos
  return cleanNumber.length === 13;
}

/**
 * Converte WhatsApp formatado para o formato de armazenamento
 * @param whatsapp Número formatado +55 (11) 99999-9999
 * @returns Número para armazenar 5511999999999
 */
export function whatsAppToStorage(whatsapp: string): string {
  const cleanNumber = cleanWhatsApp(whatsapp);
  
  // Se não começar com 55, adiciona
  if (cleanNumber && !cleanNumber.startsWith('55')) {
    return `55${cleanNumber}`;
  }
  
  return cleanNumber;
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