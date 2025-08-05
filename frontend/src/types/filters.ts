// Tipos centralizados para sistema de filtros dinâmicos

export type FilterType = 'text' | 'number' | 'date' | 'select' | 'range' | 'currency' | 'percentage';

// Configuração de um filtro individual
export interface FilterConfig {
  type: FilterType;
  placeholder?: string;
  options?: { value: string; label: string }[]; // Para tipo 'select'
  min?: number; // Para tipos numéricos
  max?: number; // Para tipos numéricos
  step?: number; // Para tipos numéricos
  currency?: string; // Para tipo 'currency' (default: 'BRL')
  label?: string; // Label personalizado (senão usa o header da coluna)
}

// Valor de um filtro (pode ter diferentes formatos)
export interface FilterValue {
  text?: string;
  number?: number;
  date?: string;
  select?: string;
  range?: {
    min?: number | string;
    max?: number | string;
  };
}

// Estado completo dos filtros ativos
export interface ActiveFilters {
  [columnKey: string]: FilterValue;
}

// Configuração de filtros extraída das colunas
export interface ExtractedFilterConfig {
  key: string;
  config: FilterConfig;
  header: string;
}

// Props para componentes de filtro específicos
export interface BaseFilterProps {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  config: FilterConfig;
  className?: string;
}

// Resultado do hook useTableFilters
export interface TableFiltersResult {
  // Estado
  activeFilters: ActiveFilters;
  filterConfigs: ExtractedFilterConfig[];
  
  // Contadores
  activeFiltersCount: number;
  
  // Handlers
  setFilter: (columnKey: string, value: FilterValue) => void;
  clearFilter: (columnKey: string) => void;
  clearAllFilters: () => void;
  
  // Função para aplicar filtros aos dados
  applyFilters: <T>(data: T[]) => T[];
}

// Função utilitária para extrair valor de filtro de um item
export type FilterExtractor<T = any> = (item: T, columnKey: string) => any;

// Configurações para diferentes tipos de dado
export const DEFAULT_FILTER_CONFIGS: Record<string, Partial<FilterConfig>> = {
  // Texto
  nome: { type: 'text', placeholder: 'Buscar por nome...' },
  descricao: { type: 'text', placeholder: 'Buscar na descrição...' },
  
  // Numéricos
  duracao: { type: 'number', placeholder: 'Duração em minutos', min: 0 },
  duracaoMinutos: { type: 'number', placeholder: 'Duração em minutos', min: 0 },
  
  // Monetários
  preco: { type: 'currency', placeholder: 'Valor em R$', currency: 'BRL' },
  valor: { type: 'currency', placeholder: 'Valor em R$', currency: 'BRL' },
  valorClinica: { type: 'currency', placeholder: 'Valor clínica', currency: 'BRL' },
  valorProfissional: { type: 'currency', placeholder: 'Valor profissional', currency: 'BRL' },
  
  // Percentuais
  percentual: { type: 'percentage', placeholder: 'Percentual', min: 0, max: 100 },
  percentualClinica: { type: 'percentage', placeholder: 'Percentual clínica', min: 0, max: 100 },
  percentualProfissional: { type: 'percentage', placeholder: 'Percentual profissional', min: 0, max: 100 },
  
  // Seleção
  convenio: { type: 'text', placeholder: 'Nome do convênio...' }, // Pode ser convertido para select
  status: { type: 'select', placeholder: 'Selecione um status...' },
  tipo: { type: 'select', placeholder: 'Selecione um tipo...' },
  
  // Datas
  data: { type: 'date', placeholder: 'Selecione uma data' },
  dataInicio: { type: 'date', placeholder: 'Data inicial' },
  dataFim: { type: 'date', placeholder: 'Data final' },
};