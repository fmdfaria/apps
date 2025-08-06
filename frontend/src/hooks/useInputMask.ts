
export const useInputMask = (mask: string, maxLength?: number) => {
  return (value: string) => {
    if (!value) return '';
    
    // Remove caracteres não numéricos
    const numericValue = value.replace(/\D/g, '');
    
    // Se há um maxLength definido, limita o valor numérico
    const limitedNumericValue = maxLength 
      ? numericValue.slice(0, maxLength) 
      : numericValue;
    
    let maskedValue = '';
    let numericIndex = 0;

    for (let i = 0; i < mask.length && numericIndex < limitedNumericValue.length; i++) {
      if (mask[i] === '9') {
        maskedValue += limitedNumericValue[numericIndex];
        numericIndex++;
      } else {
        maskedValue += mask[i];
      }
    }

    return maskedValue;
  };
};
