/**
 * Utilitário para geração de senhas seguras
 */

/**
 * Gera uma senha aleatória segura
 * @param length Comprimento da senha (padrão: 10)
 * @returns Senha aleatória
 */
export function generateSecurePassword(length: number = 10): string {
  // Caracteres permitidos: letras maiúsculas, minúsculas, números e alguns símbolos
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%&*';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  
  // Garante pelo menos um caractere de cada tipo
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Preenche o resto da senha com caracteres aleatórios
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Embaralha a senha para não ter padrão fixo
  return password
    .split('')
    .sort(() => 0.5 - Math.random())
    .join('');
}

/**
 * Valida se uma senha atende aos critérios mínimos de segurança
 * @param password Senha a ser validada
 * @returns true se a senha é válida
 */
export function isPasswordSecure(password: string): boolean {
  // Pelo menos 8 caracteres
  if (password.length < 8) return false;
  
  // Pelo menos uma letra maiúscula
  if (!/[A-Z]/.test(password)) return false;
  
  // Pelo menos uma letra minúscula
  if (!/[a-z]/.test(password)) return false;
  
  // Pelo menos um número
  if (!/\d/.test(password)) return false;
  
  return true;
}