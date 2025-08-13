/**
 * Utilitários para manipulação de tokens JWT
 */

interface JWTPayload {
  sub: string;
  exp: number;
  iat: number;
  [key: string]: any;
}

/**
 * Decodifica um JWT sem verificar a assinatura
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = parts[1];
    // Adiciona padding se necessário
    const paddedPayload = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    const decoded = JSON.parse(atob(paddedPayload));
    
    return decoded;
  } catch (error) {
    console.error('Erro ao decodificar JWT:', error);
    return null;
  }
}

/**
 * Verifica se um token está expirado
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true;
  }

  // exp está em segundos, Date.now() em milissegundos
  return payload.exp * 1000 < Date.now();
}

/**
 * Verifica se um token expira em menos de X minutos
 */
export function isTokenExpiringSoon(token: string, minutesThreshold: number = 5): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true;
  }

  // Calcula o timestamp de X minutos no futuro
  const thresholdTime = Date.now() + (minutesThreshold * 60 * 1000);
  
  // exp está em segundos, thresholdTime em milissegundos
  return payload.exp * 1000 < thresholdTime;
}

/**
 * Obtém o tempo restante até a expiração em minutos
 */
export function getTokenRemainingTime(token: string): number {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return 0;
  }

  const remainingMs = (payload.exp * 1000) - Date.now();
  return Math.max(0, Math.floor(remainingMs / (60 * 1000)));
}