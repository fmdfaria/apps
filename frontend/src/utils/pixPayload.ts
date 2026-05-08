const GUI_PIX = 'BR.GOV.BCB.PIX';

const formatField = (id: string, value: string): string => {
  const size = value.length.toString().padStart(2, '0');
  return `${id}${size}${value}`;
};

const crc16Ccitt = (input: string): string => {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i += 1) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

const normalizePixKey = (tipoPix: string, pix: string): string => {
  if (!pix) return '';
  const key = pix.trim();
  const tipo = (tipoPix || '').toUpperCase();

  if (tipo === 'CPF' || tipo === 'CNPJ') {
    return key.replace(/\D/g, '');
  }
  if (tipo === 'TELEFONE') {
    return key.replace(/\D/g, '');
  }
  return key;
};

export const buildPixPayload = ({
  tipoPix,
  pix,
  nomeProfissional,
  valorOriginal
}: {
  tipoPix: string;
  pix: string;
  nomeProfissional: string;
  valorOriginal?: number;
}): string => {
  const chave = normalizePixKey(tipoPix, pix);
  if (!chave) {
    return '';
  }

  const merchantAccountInfo = formatField(
    '26',
    `${formatField('00', GUI_PIX)}${formatField('01', chave)}`
  );
  const merchantCategoryCode = formatField('52', '0000');
  const transactionCurrency = formatField('53', '986');
  const transactionAmount =
    typeof valorOriginal === 'number' && valorOriginal > 0
      ? formatField('54', valorOriginal.toFixed(2))
      : '';
  const countryCode = formatField('58', 'BR');
  const merchantName = formatField('59', (nomeProfissional || 'PROFISSIONAL').toUpperCase().slice(0, 25));
  const merchantCity = formatField('60', 'SAO PAULO');
  const additionalDataField = formatField('62', formatField('05', '***'));
  const payloadSemCrc =
    formatField('00', '01') +
    formatField('01', '11') +
    merchantAccountInfo +
    merchantCategoryCode +
    transactionCurrency +
    transactionAmount +
    countryCode +
    merchantName +
    merchantCity +
    additionalDataField +
    '6304';

  return `${payloadSemCrc}${crc16Ccitt(payloadSemCrc)}`;
};
