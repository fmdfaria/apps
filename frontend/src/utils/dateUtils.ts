/**
 * Utilitários para formatação de datas e horas
 * Respeita timezone local e formatos brasileiros
 */

/**
 * Formatar data e hora respeitando o timezone local
 * @param dataISO - String ISO da data (ex: "2025-08-20T21:00:00.000-03:00")
 * @returns Objeto com data e hora formatadas em pt-BR
 */
export const formatarDataHoraLocal = (dataISO: string) => {
  if (!dataISO) return { data: '-', hora: '-' };
  
  const date = new Date(dataISO);
  
  // Verificar se a data é válida
  if (isNaN(date.getTime())) {
    console.warn('Data inválida:', dataISO);
    return { data: '-', hora: '-' };
  }
  
  return {
    data: date.toLocaleDateString('pt-BR'),
    hora: date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  };
};

/**
 * Formatar apenas a data respeitando o timezone local
 * @param dataISO - String ISO da data
 * @returns Data formatada em pt-BR (ex: "20/08/2025")
 */
export const formatarApenasData = (dataISO: string): string => {
  if (!dataISO) return '-';
  
  // Se for apenas uma data (YYYY-MM-DD), converter diretamente sem timezone
  if (/^\d{4}-\d{2}-\d{2}$/.test(dataISO)) {
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
  }
  
  // Se for uma data ISO com horário meia-noite UTC (ex: 2025-09-21T00:00:00.000Z)
  // extrair apenas a parte da data para evitar problemas de timezone
  const matchData = dataISO.match(/^(\d{4}-\d{2}-\d{2})T00:00:00\.000Z$/);
  if (matchData) {
    const [ano, mes, dia] = matchData[1].split('-');
    return `${dia}/${mes}/${ano}`;
  }
  
  const date = new Date(dataISO);
  
  if (isNaN(date.getTime())) {
    console.warn('Data inválida:', dataISO);
    return '-';
  }
  
  return date.toLocaleDateString('pt-BR');
};

/**
 * Formatar apenas a hora respeitando o timezone local
 * @param dataISO - String ISO da data
 * @returns Hora formatada em pt-BR (ex: "21:00")
 */
export const formatarApenasHora = (dataISO: string): string => {
  if (!dataISO) return '-';
  
  const date = new Date(dataISO);
  
  if (isNaN(date.getTime())) {
    console.warn('Data inválida:', dataISO);
    return '-';
  }
  
  return date.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

/**
 * Formatar data completa com dia da semana
 * @param dataISO - String ISO da data
 * @returns Data formatada completa (ex: "Segunda, 20 de agosto de 2025")
 */
export const formatarDataCompleta = (dataISO: string): string => {
  if (!dataISO) return '-';
  
  const date = new Date(dataISO);
  
  if (isNaN(date.getTime())) {
    console.warn('Data inválida:', dataISO);
    return '-';
  }
  
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Formatar data para input HTML (formato YYYY-MM-DD)
 * @param dataISO - String ISO da data
 * @returns Data no formato para input HTML
 */
export const formatarParaInputDate = (dataISO: string): string => {
  if (!dataISO) return '';
  
  const date = new Date(dataISO);
  
  if (isNaN(date.getTime())) {
    console.warn('Data inválida:', dataISO);
    return '';
  }
  
  // Usar timezone local para evitar problemas de conversão
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Verificar se uma data é hoje
 * @param dataISO - String ISO da data
 * @returns true se a data for hoje
 */
export const ehHoje = (dataISO: string): boolean => {
  if (!dataISO) return false;
  
  const date = new Date(dataISO);
  const hoje = new Date();
  
  if (isNaN(date.getTime())) return false;
  
  return (
    date.getDate() === hoje.getDate() &&
    date.getMonth() === hoje.getMonth() &&
    date.getFullYear() === hoje.getFullYear()
  );
};

/**
 * Verificar se uma data é amanhã
 * @param dataISO - String ISO da data
 * @returns true se a data for amanhã
 */
export const ehAmanha = (dataISO: string): boolean => {
  if (!dataISO) return false;
  
  const date = new Date(dataISO);
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  
  if (isNaN(date.getTime())) return false;
  
  return (
    date.getDate() === amanha.getDate() &&
    date.getMonth() === amanha.getMonth() &&
    date.getFullYear() === amanha.getFullYear()
  );
};

/**
 * Varre uma mensagem e formata quaisquer datas ISO encontradas para o padrão amigável "dd/MM/yyyy - HH:mm".
 * Ex.: "... em 2025-08-27T11:00:00.000Z" -> "... em 27/08/2025 - 08:00" (respeitando timezone local)
 */
export const formatarDatasEmMensagem = (mensagem: string): string => {
  if (!mensagem) return mensagem;
  const isoRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?(?:Z|[+-]\d{2}:\d{2})?/g;
  return mensagem.replace(isoRegex, (iso) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const data = d.toLocaleDateString('pt-BR');
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${data} - ${hora}`;
  });
};