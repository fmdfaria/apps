# 📱 Planejamento de Responsividade e Performance

## 🎯 Objetivo
Transformar todas as páginas da aplicação em interfaces responsivas e otimizadas para múltiplos dispositivos, implementando dois formatos de visualização: **Tabela** (atual) e **Cards** (novo).

## 📐 Breakpoints Tailwind CSS

| Nome | Largura mínima | Dispositivo | Uso |
|------|----------------|-------------|-----|
| `sm` | 640px | Celulares maiores | Layout mobile otimizado |
| `md` | 768px | Tablets | Layout tablet híbrido |
| `lg` | 1024px | Laptops pequenos | Layout desktop compacto |
| `xl` | 1280px | Laptops médios | Layout desktop padrão |
| `2xl` | 1536px | Monitores grandes | Layout desktop ampliado |

### ⚠️ **IMPORTANTE: Preenchimento da Tela Cheia**

**Sempre utilizar `flex` e `w-full` para preencher toda a largura disponível, independente do tamanho do monitor:**

- **Monitor 1920px:** Usar breakpoint `2xl` (1536px) mas preencher toda a tela
- **Notebook 1360px:** Usar breakpoint `xl` (1280px) mas preencher toda a tela
- **Laptop 1200px:** Usar breakpoint `lg` (1024px) mas preencher toda a tela

**Exemplo de implementação:**
```tsx
// Container principal sempre full-width
<div className="w-full min-h-screen flex flex-col">
  {/* Conteúdo responsivo que se adapta mas preenche a tela */}
  <div className="flex-1 w-full px-4 sm:px-6 lg:px-8">
    <div className="max-w-7xl mx-auto w-full">
      {/* Conteúdo da página */}
    </div>
  </div>
</div>
```

## 🎨 Estratégia de Layout

### 📊 Formato Tabela (Responsivo)
- **Desktop 2xl (1536px+):** Tabela completa com todas as colunas + responsiva
- **Desktop xl (1280px+):** Tabela completa com todas as colunas + responsiva
- **Desktop lg (1024px+):** Tabela completa com todas as colunas + responsiva
- **Tablet (md):** Tabela compacta com colunas essenciais
- **Mobile (sm):** Lista vertical com cards inline

### 🃏 Formato Cards (Novo)
- **Desktop 2xl (1536px+):** Grid 6 colunas
- **Desktop xl (1280px+):** Grid 5 colunas
- **Desktop lg (1024px+):** Grid 4 colunas
- **Tablet (md):** Grid 3 colunas  
- **Mobile (sm):** Grid 1-2 colunas

## 📋 Ordem de Prioridade das Páginas

### 1. 🏥 Serviços (Alta Prioridade)
**Arquivo:** `src/pages/servicos/ServicosPage.tsx`
- CRUD completo de serviços
- Formulários complexos
- Integração com profissionais

### 2. 🏥 Convênios (Alta Prioridade)
**Arquivo:** `src/pages/convenios/ConveniosPage.tsx`
- Gestão de convênios médicos
- Formulários de dados bancários
- Relacionamentos complexos

### 3. 🏥 Recursos (Alta Prioridade)
**Arquivo:** `src/pages/recursos/RecursosPage.tsx`
- Gestão de recursos da clínica
- Formulários de configuração
- Integração com agendamentos

### 4. 🏥 Especialidades (Média Prioridade)
**Arquivo:** `src/pages/especialidades/EspecialidadesPage.tsx`
- CRUD de especialidades médicas
- Relacionamento com profissionais
- Formulários simples

### 5. 🏥 Conselhos (Média Prioridade)
**Arquivo:** `src/pages/conselhos/ConselhosPage.tsx`
- Gestão de conselhos profissionais
- Formulários de validação
- Relacionamentos com profissionais

### 6. 👨‍⚕️ Profissionais (Média Prioridade)
**Arquivo:** `src/pages/profissionais/ProfissionaisPage.tsx`
- CRUD complexo de profissionais
- Múltiplos modais e formulários
- Relacionamentos com serviços e especialidades

### 7. 👥 Pacientes (Baixa Prioridade)
**Arquivo:** `src/pages/pacientes/PacientesPage.tsx`
- Gestão de pacientes
- Formulários de dados pessoais
- Relacionamentos com convênios

### 8. 📅 Agendamentos (Baixa Prioridade)
**Arquivo:** `src/pages/agendamentos/`
- Sistema complexo de agendamentos
- Múltiplas páginas e modais
- Integração com calendário

## 🏗️ Estruturação do Projeto

### 📁 Organização de Arquivos

```
src/
├── components/
│   ├── ui/
│   │   ├── view-toggle.tsx          # Toggle entre Tabela/Cards
│   │   ├── responsive-table.tsx      # Tabela responsiva
│   │   ├── responsive-cards.tsx      # Cards responsivos
│   │   ├── responsive-search.tsx     # Busca responsiva
│   │   └── responsive-pagination.tsx # Paginação responsiva
│   └── shared/
│       ├── table-view/               # Componentes para visão tabela
│       │   ├── TableHeader.tsx
│       │   ├── TableRow.tsx
│       │   ├── TableActions.tsx
│       │   └── TableFilters.tsx
│       └── card-view/                # Componentes para visão cards
│           ├── CardItem.tsx
│           ├── CardGrid.tsx
│           ├── CardActions.tsx
│           └── CardFilters.tsx
├── hooks/
│   ├── useViewMode.ts                # Hook para gerenciar modo de visualização
│   ├── useResponsiveTable.ts         # Hook para tabela responsiva
│   └── useResponsiveCards.ts         # Hook para cards responsivos
└── utils/
    ├── responsive-utils.ts            # Utilitários responsivos
    └── view-mode-utils.ts            # Utilitários para modo de visualização
```

### 🎯 Componentes Base

#### ViewToggle Component
```tsx
// src/components/ui/view-toggle.tsx
interface ViewToggleProps {
  viewMode: 'table' | 'cards';
  onViewModeChange: (mode: 'table' | 'cards') => void;
}

export const ViewToggle = ({ viewMode, onViewModeChange }: ViewToggleProps) => (
  <div className="flex items-center gap-2 mb-4">
    <Button
      variant={viewMode === 'table' ? 'default' : 'outline'}
      onClick={() => onViewModeChange('table')}
      size="sm"
      className="flex items-center gap-2"
    >
      <Table className="w-4 h-4" />
      <span className="hidden sm:inline">Tabela</span>
    </Button>
    <Button
      variant={viewMode === 'cards' ? 'default' : 'outline'}
      onClick={() => onViewModeChange('cards')}
      size="sm"
      className="flex items-center gap-2"
    >
      <Grid className="w-4 h-4" />
      <span className="hidden sm:inline">Cards</span>
    </Button>
  </div>
);
```

#### ResponsiveTable Component
```tsx
// src/components/ui/responsive-table.tsx
interface ResponsiveTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  className?: string;
}

export const ResponsiveTable = <T extends Record<string, any>>({
  data,
  columns,
  className
}: ResponsiveTableProps<T>) => (
  <div className="w-full">
    {/* Desktop: Tabela completa responsiva */}
    <div className="hidden lg:block">
      <Table className={cn("w-full", className)}>
        <TableHeader>
          {columns.map((column) => (
            <TableHead key={column.key} className={column.className}>
              {column.header}
            </TableHead>
          ))}
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index}>
              {columns.map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {column.render ? column.render(item) : item[column.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

    {/* Tablet: Tabela compacta */}
    <div className="hidden md:block lg:hidden">
      <Table className={cn("w-full", className)}>
        <TableHeader>
          {columns.filter(col => col.essential).map((column) => (
            <TableHead key={column.key} className={column.className}>
              {column.header}
            </TableHead>
          ))}
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index}>
              {columns.filter(col => col.essential).map((column) => (
                <TableCell key={column.key} className={column.className}>
                  {column.render ? column.render(item) : item[column.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

    {/* Mobile: Cards inline */}
    <div className="block md:hidden">
      <div className="space-y-4">
        {data.map((item, index) => (
          <Card key={index} className="p-4">
            <div className="space-y-2">
              {columns.map((column) => (
                <div key={column.key} className="flex justify-between">
                  <span className="font-medium text-sm text-muted-foreground">
                    {column.header}:
                  </span>
                  <span className="text-sm">
                    {column.render ? column.render(item) : item[column.key]}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  </div>
);
```

#### ResponsiveCards Component
```tsx
// src/components/ui/responsive-cards.tsx
interface ResponsiveCardsProps<T> {
  data: T[];
  renderCard: (item: T) => React.ReactNode;
  className?: string;
}

export const ResponsiveCards = <T extends Record<string, any>>({
  data,
  renderCard,
  className
}: ResponsiveCardsProps<T>) => (
  <div className={cn(
    "grid gap-4 w-full",
    "grid-cols-1",           // Mobile: 1 coluna
    "sm:grid-cols-2",        // Mobile grande: 2 colunas
    "md:grid-cols-3",        // Tablet: 3 colunas
    "lg:grid-cols-4",        // Desktop: 4 colunas
    "xl:grid-cols-5",        // Desktop grande: 5 colunas
    "2xl:grid-cols-6",       // Monitor grande: 6 colunas
    className
  )}>
    {data.map((item, index) => (
      <div key={index} className="h-full">
        {renderCard(item)}
      </div>
    ))}
  </div>
);
```

### 📝 Tipos e Interfaces

#### TableColumn Interface
```tsx
// src/types/table.ts
export interface TableColumn<T> {
  key: keyof T | string;
  header: string;
  essential?: boolean; // Se deve aparecer na versão tablet
  className?: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  [key: string]: string;
}

export interface PaginationConfig {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}
```

#### ViewMode Types
```tsx
// src/types/view-mode.ts
export type ViewMode = 'table' | 'cards';

export interface ViewModeConfig {
  defaultMode: ViewMode;
  persistMode?: boolean; // Se deve persistir a escolha do usuário
  localStorageKey?: string;
}
```

### 🎣 Hooks Personalizados

#### useViewMode Hook
```tsx
// src/hooks/useViewMode.ts
export const useViewMode = () => {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'table' ? 'cards' : 'table');
  };

  return {
    viewMode,
    setViewMode,
    toggleViewMode,
    isTable: viewMode === 'table',
    isCards: viewMode === 'cards'
  };
};
```

#### useResponsiveTable Hook
```tsx
// src/hooks/useResponsiveTable.ts
export const useResponsiveTable = <T>(data: T[]) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [data, sortConfig]);

  const filteredData = useMemo(() => {
    return sortedData.filter(item => {
      return Object.entries(filterConfig).every(([key, value]) => {
        if (!value) return true;
        return String(item[key]).toLowerCase().includes(value.toLowerCase());
      });
    });
  }, [sortedData, filterConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  return {
    data: paginatedData,
    totalItems: filteredData.length,
    currentPage,
    itemsPerPage,
    sortConfig,
    filterConfig,
    setSortConfig,
    setFilterConfig,
    setCurrentPage,
    setItemsPerPage
  };
};
```

## 🛠️ Implementação por Página

### 📊 Estrutura Padrão para Cada Página

#### Template de Página com Duas Visões
```tsx
// Template para todas as páginas CRUD
interface PageTemplateProps<T> {
  title: string;
  data: T[];
  columns: TableColumn<T>[];
  renderCard: (item: T) => React.ReactNode;
  onAdd?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
}

const PageTemplate = <T extends Record<string, any>>({
  title,
  data,
  columns,
  renderCard,
  onAdd,
  onEdit,
  onDelete
}: PageTemplateProps<T>) => {
  const { viewMode, setViewMode } = useViewMode();
  const {
    data: processedData,
    totalItems,
    currentPage,
    itemsPerPage,
    setCurrentPage,
    setItemsPerPage
  } = useResponsiveTable(data);

  return (
    <div className="w-full min-h-screen flex flex-col">
      {/* Header da página */}
      <div className="w-full px-4 sm:px-6 lg:px-8 border-b">
        <div className="max-w-7xl mx-auto w-full py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-bold">{title}</h1>
            <div className="flex items-center gap-2">
              <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
              {onAdd && (
                <Button onClick={onAdd} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto w-full py-6">
          {/* Filtros e busca */}
          <ResponsiveSearch 
            onSearch={(term) => console.log('Search:', term)}
            className="mb-6"
          />

          {/* Conteúdo baseado no modo de visualização */}
          {viewMode === 'table' ? (
            <ResponsiveTable 
              data={processedData}
              columns={columns}
              className="mb-6"
            />
          ) : (
            <ResponsiveCards 
              data={processedData}
              renderCard={renderCard}
              className="mb-6"
            />
          )}

          {/* Paginação */}
          <ResponsivePagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
      </div>
    </div>
  );
};
```

#### Exemplo de Implementação - Página de Serviços
```tsx
// src/pages/servicos/ServicosPage.tsx
const ServicosPage = () => {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar dados
  useEffect(() => {
    const loadServicos = async () => {
      try {
        const data = await servicosService.getAll();
        setServicos(data);
      } catch (error) {
        console.error('Erro ao carregar serviços:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadServicos();
  }, []);

  // Configuração das colunas da tabela
  const columns: TableColumn<Servico>[] = [
    {
      key: 'nome',
      header: 'Nome',
      essential: true,
      className: 'font-medium'
    },
    {
      key: 'descricao',
      header: 'Descrição',
      essential: false,
      className: 'hidden lg:table-cell'
    },
    {
      key: 'preco',
      header: 'Preço',
      essential: true,
      render: (item) => `R$ ${item.preco.toFixed(2)}`,
      className: 'text-right'
    },
    {
      key: 'ativo',
      header: 'Status',
      essential: true,
      render: (item) => (
        <Badge variant={item.ativo ? 'default' : 'secondary'}>
          {item.ativo ? 'Ativo' : 'Inativo'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Ações',
      essential: true,
      render: (item) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(item)}>
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  // Renderização do card
  const renderCard = (servico: Servico) => (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">{servico.nome}</CardTitle>
        <CardDescription className="line-clamp-2">
          {servico.descricao}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Preço:</span>
            <span className="text-lg font-bold">R$ {servico.preco.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Status:</span>
            <Badge variant={servico.ativo ? 'default' : 'secondary'}>
              {servico.ativo ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex items-center gap-2 w-full">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(servico)}>
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDelete(servico)}>
            <Trash className="w-4 h-4 mr-2" />
            Excluir
          </Button>
        </div>
      </CardFooter>
    </Card>
  );

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">
      <Spinner className="w-8 h-8" />
    </div>;
  }

  return (
    <PageTemplate
      title="Serviços"
      data={servicos}
      columns={columns}
      renderCard={renderCard}
      onAdd={handleAdd}
    />
  );
};
```

### 📱 Componentes Responsivos

#### Tabela Responsiva Completa
```tsx
// Desktop 2xl (1536px+): Tabela completa responsiva
<div className="hidden 2xl:block">
  <Table className="w-full">
    <TableHeader>
      {columns.map((column) => (
        <TableHead key={column.key} className={column.className}>
          {column.header}
        </TableHead>
      ))}
    </TableHeader>
    <TableBody>
      {data.map((item, index) => (
        <TableRow key={index}>
          {columns.map((column) => (
            <TableCell key={column.key} className={column.className}>
              {column.render ? column.render(item) : item[column.key]}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>

// Desktop xl (1280px+): Tabela completa responsiva
<div className="hidden xl:block 2xl:hidden">
  <Table className="w-full">
    <TableHeader>
      {columns.map((column) => (
        <TableHead key={column.key} className={column.className}>
          {column.header}
        </TableHead>
      ))}
    </TableHeader>
    <TableBody>
      {data.map((item, index) => (
        <TableRow key={index}>
          {columns.map((column) => (
            <TableCell key={column.key} className={column.className}>
              {column.render ? column.render(item) : item[column.key]}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>

// Desktop lg (1024px+): Tabela completa responsiva
<div className="hidden lg:block xl:hidden">
  <Table className="w-full">
    <TableHeader>
      {columns.map((column) => (
        <TableHead key={column.key} className={column.className}>
          {column.header}
        </TableHead>
      ))}
    </TableHeader>
    <TableBody>
      {data.map((item, index) => (
        <TableRow key={index}>
          {columns.map((column) => (
            <TableCell key={column.key} className={column.className}>
              {column.render ? column.render(item) : item[column.key]}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>

// Tablet (768px+): Tabela compacta com colunas essenciais
<div className="hidden md:block lg:hidden">
  <Table className="w-full">
    <TableHeader>
      {columns.filter(col => col.essential).map((column) => (
        <TableHead key={column.key} className={column.className}>
          {column.header}
        </TableHead>
      ))}
    </TableHeader>
    <TableBody>
      {data.map((item, index) => (
        <TableRow key={index}>
          {columns.filter(col => col.essential).map((column) => (
            <TableCell key={column.key} className={column.className}>
              {column.render ? column.render(item) : item[column.key]}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>

// Mobile (<768px): Cards inline
<div className="block md:hidden">
  <div className="space-y-4">
    {data.map((item, index) => (
      <Card key={index} className="p-4">
        <div className="space-y-2">
          {columns.map((column) => (
            <div key={column.key} className="flex justify-between">
              <span className="font-medium text-sm text-muted-foreground">
                {column.header}:
              </span>
              <span className="text-sm">
                {column.render ? column.render(item) : item[column.key]}
              </span>
            </div>
          ))}
        </div>
      </Card>
    ))}
  </div>
</div>
```

#### Responsividade Avançada das Tabelas
```tsx
// Hook para detectar breakpoint ativo
const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState<'sm' | 'md' | 'lg' | 'xl' | '2xl'>('lg');

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1536) setBreakpoint('2xl');
      else if (width >= 1280) setBreakpoint('xl');
      else if (width >= 1024) setBreakpoint('lg');
      else if (width >= 768) setBreakpoint('md');
      else setBreakpoint('sm');
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
};

// Componente de tabela com responsividade inteligente
const SmartResponsiveTable = <T extends Record<string, any>>({
  data,
  columns,
  className
}: ResponsiveTableProps<T>) => {
  const breakpoint = useBreakpoint();
  
  // Filtrar colunas baseado no breakpoint
  const getVisibleColumns = () => {
    switch (breakpoint) {
      case '2xl':
      case 'xl':
      case 'lg':
        return columns; // Todas as colunas
      case 'md':
        return columns.filter(col => col.essential); // Apenas essenciais
      default:
        return []; // Mobile usa cards
    }
  };

  const visibleColumns = getVisibleColumns();

  if (breakpoint === 'sm') {
    // Renderizar cards para mobile
    return (
      <div className="space-y-4">
        {data.map((item, index) => (
          <Card key={index} className="p-4">
            <div className="space-y-2">
              {columns.map((column) => (
                <div key={column.key} className="flex justify-between">
                  <span className="font-medium text-sm text-muted-foreground">
                    {column.header}:
                  </span>
                  <span className="text-sm">
                    {column.render ? column.render(item) : item[column.key]}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // Renderizar tabela para outros breakpoints
  return (
    <Table className={cn("w-full", className)}>
      <TableHeader>
        {visibleColumns.map((column) => (
          <TableHead key={column.key} className={column.className}>
            {column.header}
          </TableHead>
        ))}
      </TableHeader>
      <TableBody>
        {data.map((item, index) => (
          <TableRow key={index}>
            {visibleColumns.map((column) => (
              <TableCell key={column.key} className={column.className}>
                {column.render ? column.render(item) : item[column.key]}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

#### Cards Responsivos
```tsx
// Grid responsivo que preenche toda a tela
<div className={cn(
  "grid gap-4 w-full",
  "grid-cols-1",           // Mobile: 1 coluna
  "sm:grid-cols-2",        // Mobile grande: 2 colunas
  "md:grid-cols-3",        // Tablet: 3 colunas
  "lg:grid-cols-4",        // Desktop: 4 colunas
  "xl:grid-cols-5",        // Desktop grande: 5 colunas
  "2xl:grid-cols-6"        // Monitor grande: 6 colunas
)}>
  {/* Cards */}
</div>
```

#### Layout Flexível para Diferentes Tamanhos
```tsx
// Container que se adapta mas sempre preenche a tela
const ResponsiveContainer = ({ children }) => (
  <div className="w-full min-h-screen flex flex-col">
    {/* Header responsivo */}
    <header className="w-full px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header content */}
      </div>
    </header>
    
    {/* Conteúdo principal que preenche toda a largura */}
    <main className="flex-1 w-full px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto w-full">
        {children}
      </div>
    </main>
    
    {/* Footer responsivo */}
    <footer className="w-full px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto w-full">
        {/* Footer content */}
      </div>
    </footer>
  </div>
);
```

## 🚀 Otimizações de Performance

### 1. 📦 Lazy Loading
```tsx
// Lazy loading de componentes pesados
const LazyModal = lazy(() => import('./HeavyModal'));

// Suspense wrapper
<Suspense fallback={<Skeleton className="h-96" />}>
  <LazyModal />
</Suspense>
```

### 2. 🎯 Virtualização para Listas Grandes
```tsx
// Para tabelas com muitos dados
import { FixedSizeList as List } from 'react-window';

const VirtualizedTable = ({ items }) => (
  <List
    height={600}
    itemCount={items.length}
    itemSize={50}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        <TableRow item={items[index]} />
      </div>
    )}
  </List>
);
```

### 3. 🔍 Debounce para Busca
```tsx
const useDebouncedSearch = (delay = 300) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, delay);

    return () => clearTimeout(timer);
  }, [searchTerm, delay]);

  return [searchTerm, setSearchTerm, debouncedTerm];
};
```

### 4. 📊 Memoização de Componentes
```tsx
// Memoizar componentes pesados
const CardItem = memo(({ item }) => (
  <Card className="h-full">
    {/* Conteúdo do card */}
  </Card>
));

// Memoizar cálculos custosos
const filteredItems = useMemo(() => {
  return items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
}, [items, searchTerm]);
```

## 🎨 Componentes UI Responsivos

### 📱 Mobile-First Components

#### SearchBar Responsiva
```tsx
const ResponsiveSearchBar = () => (
  <div className="w-full">
    {/* Desktop: Barra completa */}
    <div className="hidden md:flex items-center gap-4">
      <Input className="flex-1" placeholder="Buscar..." />
      <Button>Filtrar</Button>
    </div>
    
    {/* Mobile: Barra compacta */}
    <div className="flex md:hidden items-center gap-2">
      <Input className="flex-1" placeholder="Buscar..." />
      <Button size="sm">
        <Search className="w-4 h-4" />
      </Button>
    </div>
  </div>
);
```

#### Paginação Responsiva
```tsx
const ResponsivePagination = () => (
  <div className="flex items-center justify-between">
    {/* Desktop: Paginação completa */}
    <div className="hidden md:flex items-center gap-2">
      <Pagination>
        {/* Números de página */}
      </Pagination>
    </div>
    
    {/* Mobile: Paginação simplificada */}
    <div className="flex md:hidden items-center gap-2">
      <Button variant="outline" size="sm">
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-sm">1 de 10</span>
      <Button variant="outline" size="sm">
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  </div>
);
```

## 📱 Testes de Responsividade

### 1. 🧪 Testes Manuais
- [ ] Testar em diferentes resoluções
- [ ] Verificar orientação landscape/portrait
- [ ] Testar em dispositivos reais
- [ ] Validar acessibilidade

### 2. 🔧 Ferramentas de Teste
```bash
# DevTools do navegador
# Chrome DevTools > Toggle device toolbar
# Testar breakpoints: 375px, 768px, 1024px, 1280px, 1536px
```

### 3. 📊 Métricas de Performance
- [ ] Lighthouse Score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Cumulative Layout Shift < 0.1

## 🎯 Checklist de Implementação

### ✅ Fase 1: Estrutura Base
- [ ] Criar componentes responsivos base
- [ ] Implementar toggle entre tabela/cards
- [ ] Configurar breakpoints globais
- [ ] Criar hooks de responsividade

### ✅ Fase 2: Páginas Prioritárias
- [ ] Serviços (responsivo + performance)
- [ ] Convênios (responsivo + performance)
- [ ] Recursos (responsivo + performance)

### ✅ Fase 3: Páginas Secundárias
- [ ] Especialidades
- [ ] Conselhos
- [ ] Profissionais

### ✅ Fase 4: Páginas Complexas
- [ ] Pacientes
- [ ] Agendamentos

### ✅ Fase 5: Otimizações Finais
- [ ] Performance audit
- [ ] Acessibilidade audit
- [ ] Testes em dispositivos reais
- [ ] Documentação

## 📚 Recursos e Referências

### 🛠️ Bibliotecas Recomendadas
- `react-window` - Virtualização de listas
- `react-virtualized-auto-sizer` - Auto-sizing
- `react-intersection-observer` - Lazy loading
- `react-hook-form` - Formulários otimizados

### 🎨 Padrões de Design
- Mobile-first approach
- Progressive enhancement
- Graceful degradation
- Touch-friendly interfaces

### 📱 Considerações Mobile
- Touch targets mínimos de 44px
- Espaçamento adequado entre elementos
- Gestos nativos (swipe, pinch)
- Feedback visual imediato

### 🖥️ Estratégias para Diferentes Tamanhos de Monitor

#### Monitor Grande (1920px+)
```tsx
// Usar breakpoint 2xl mas preencher toda a tela
<div className="w-full flex">
  <div className="flex-1 max-w-7xl mx-auto px-8">
    {/* Conteúdo otimizado para tela grande */}
    <div className="grid grid-cols-6 gap-6">
      {/* 6 colunas para aproveitar o espaço */}
    </div>
  </div>
</div>
```

#### Notebook Médio (1360px)
```tsx
// Usar breakpoint xl mas preencher toda a tela
<div className="w-full flex">
  <div className="flex-1 max-w-7xl mx-auto px-6">
    {/* Conteúdo otimizado para notebook */}
    <div className="grid grid-cols-5 gap-4">
      {/* 5 colunas para aproveitar o espaço */}
    </div>
  </div>
</div>
```

#### Laptop Pequeno (1200px)
```tsx
// Usar breakpoint lg mas preencher toda a tela
<div className="w-full flex">
  <div className="flex-1 max-w-7xl mx-auto px-4">
    {/* Conteúdo otimizado para laptop */}
    <div className="grid grid-cols-4 gap-4">
      {/* 4 colunas para aproveitar o espaço */}
    </div>
  </div>
</div>
```

#### Princípios Gerais
- **Sempre usar `w-full`** para preencher toda a largura disponível
- **Usar `flex` e `flex-1`** para distribuir espaço adequadamente
- **Aplicar `max-w-7xl`** como limite máximo de conteúdo
- **Centralizar com `mx-auto`** para manter alinhamento
- **Adaptar número de colunas** baseado no breakpoint ativo

---

**Nota:** Este planejamento deve ser implementado de forma incremental, testando cada página individualmente antes de prosseguir para a próxima. A priorização garante que as funcionalidades mais críticas sejam otimizadas primeiro. 