
export const useInputMask = (mask: string) => {
  return (value: string) => {
    if (!value) return '';
    
    const numericValue = value.replace(/\D/g, '');
    let maskedValue = '';
    let numericIndex = 0;

    for (let i = 0; i < mask.length && numericIndex < numericValue.length; i++) {
      if (mask[i] === '9') {
        maskedValue += numericValue[numericIndex];
        numericIndex++;
      } else {
        maskedValue += mask[i];
      }
    }

    return maskedValue;
  };
};
