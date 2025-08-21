# Padrão RBAC - Sistema de Controle de Acesso

Este documento descreve os padrões de controle de acesso (RBAC) utilizados no sistema Probotec Clínica.

## Dois Sistemas Distintos de Controle

### 1. Controle de Menu (Navigation RBAC)
**Arquivo**: `frontend/src/hooks/useMenuPermissions.ts`
**Propósito**: Controlar visibilidade de páginas inteiras no menu sidebar

```typescript
// routePermissionMap - APENAS para menu sidebar
const routePermissionMap: Record<string, { path: string; method: string }> = {
  'pacientes': { path: '/pacientes', method: 'GET' },
  'agendamentos': { path: '/agendamentos', method: 'GET' },
  // ... outras rotas
};
```

**Uso**: Verificar se o usuário pode ver/acessar uma página inteira no menu de navegação.

### 2. Controle de Funcionalidades (Feature RBAC)
**Propósito**: Controlar botões, modais e ações específicas dentro de cada página
**Implementação**: Cada página faz sua própria verificação de permissões

## Padrão Feature RBAC (Recomendado)

### Estrutura Base

```typescript
// 1. Estados locais para cada permissão
const [canCreate, setCanCreate] = useState(true);
const [canUpdate, setCanUpdate] = useState(true);
const [canDelete, setCanDelete] = useState(true);
const [canViewSpecialAction, setCanViewSpecialAction] = useState(true);

// 2. Função de verificação de permissões
const checkPermissions = async () => {
  try {
    const response = await api.get('/users/me/permissions');
    const allowedRoutes = response.data;
    
    // Verificar cada permissão específica
    const canCreate = allowedRoutes.some((route: any) => {
      return route.path === '/endpoint' && route.method.toLowerCase() === 'post';
    });
    
    const canUpdate = allowedRoutes.some((route: any) => {
      return route.path === '/endpoint/:id' && route.method.toLowerCase() === 'put';
    });
    
    const canDelete = allowedRoutes.some((route: any) => {
      return route.path === '/endpoint/:id' && route.method.toLowerCase() === 'delete';
    });
    
    // Aplicar os estados
    setCanCreate(canCreate);
    setCanUpdate(canUpdate);
    setCanDelete(canDelete);
    
  } catch (error) {
    // Em caso de erro, desabilitar tudo por segurança
    setCanCreate(false);
    setCanUpdate(false);
    setCanDelete(false);
  }
};

// 3. Chamar no useEffect
useEffect(() => {
  checkPermissions();
}, []);
```

### Renderização Condicional

#### Padrão para Botões Principais (ex: "Novo")

```typescript
{canCreate ? (
  <Button 
    onClick={handleCreate}
    className="bg-blue-600 hover:bg-blue-700"
  >
    <Plus className="w-4 h-4 mr-2" />
    Novo Item
  </Button>
) : (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-block">
          <Button 
            disabled={true}
            className="bg-gray-400 cursor-not-allowed opacity-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Item
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Você não tem permissão para criar itens</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)}
```

#### Padrão para Botões de Ação (tabelas/cards)

```typescript
{canEdit ? (
  <ActionButton
    variant="edit"
    module="moduleName"
    onClick={() => handleEdit(item)}
    title="Editar item"
  >
    <Edit className="w-4 h-4" />
  </ActionButton>
) : (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-block">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 w-8 p-0 border-gray-300 text-gray-400 opacity-50 cursor-not-allowed"
            disabled={true}
          >
            <Edit className="w-4 h-4" />
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Você não tem permissão para editar itens</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)}
```

## Mapeamento de Permissões por Ação

### Operações CRUD Padrão
- **CREATE**: `POST /endpoint`
- **READ**: `GET /endpoint` 
- **UPDATE**: `PUT /endpoint/:id`
- **DELETE**: `DELETE /endpoint/:id`

### Operações Especiais
- **STATUS Toggle**: `PATCH /endpoint/:id/status`
- **BULK Actions**: `POST /endpoint/bulk`
- **Custom Actions**: Definir rota específica

## Exemplos Práticos

### Pacientes (Funcionando Corretamente)
```typescript
// Verificações
const canCreate = allowedRoutes.some(route => 
  route.path === '/pacientes' && route.method === 'post'
);
const canUpdate = allowedRoutes.some(route => 
  route.path === '/pacientes/:id' && route.method === 'put'
);
const canDelete = allowedRoutes.some(route => 
  route.path === '/pacientes/:id' && route.method === 'delete'
);

// Botão Novo Paciente - mostra desabilitado se não tem permissão
{canCreate ? <Button>Novo</Button> : <DisabledButtonWithTooltip>}
```

### Evoluções (Padrão a ser seguido)
```typescript
// Verificações específicas para evoluções
const canViewEvolucoes = allowedRoutes.some(route => 
  route.path === '/evolucoes' && route.method === 'get'
);
const canCreateEvolucoes = allowedRoutes.some(route => 
  route.path === '/evolucoes' && route.method === 'post'
);
const canUpdateEvolucoes = allowedRoutes.some(route => 
  route.path === '/evolucoes/:id' && route.method === 'put'
);
const canDeleteEvolucoes = allowedRoutes.some(route => 
  route.path === '/evolucoes/:id' && route.method === 'delete'
);
```

## Boas Práticas

### ✅ DO (Fazer)
- Sempre usar verificação local (`checkPermissions`) para controle de botões
- Mostrar botões desabilitados com tooltips explicativos
- Usar estados locais para cada tipo de permissão
- Desabilitar tudo em caso de erro de API
- Seguir o padrão de rotas: `endpoint` para POST/GET, `endpoint/:id` para PUT/DELETE

### ❌ DON'T (Não Fazer)  
- Não usar `routePermissionMap` para controlar botões dentro de páginas
- Não misturar os dois sistemas de controle
- Não esconder completamente botões importantes (usar disabled + tooltip)
- Não assumir permissões como verdadeiras por padrão em produção
- Não esquecer de tratar erros na verificação de permissões

## Debugging

### Logs Úteis para Debug
```typescript
// Temporário - remover em produção
console.log('🔍 Permissões carregadas:', allowedRoutes);
console.log('✅ canCreate:', canCreate);
console.log('📍 Rotas filtradas:', allowedRoutes.filter(r => r.path.includes('endpoint')));
```

### Checklist de Verificação
- [ ] Função `checkPermissions` implementada
- [ ] Estados locais criados para cada permissão
- [ ] Verificação de rotas com path e method corretos
- [ ] Renderização condicional com tooltips
- [ ] Tratamento de erro desabilitando permissões
- [ ] Remoção de logs de debug

## Template para Nova Implementação

```typescript
// 1. Imports necessários
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// 2. Estados
const [canCreate, setCanCreate] = useState(true);
const [canUpdate, setCanUpdate] = useState(true);
const [canDelete, setCanDelete] = useState(true);

// 3. Verificação
const checkPermissions = async () => {
  try {
    const response = await api.get('/users/me/permissions');
    const allowedRoutes = response.data;
    
    const canCreate = allowedRoutes.some((route: any) => {
      return route.path === '/YOUR_ENDPOINT' && route.method.toLowerCase() === 'post';
    });
    
    setCanCreate(canCreate);
    // ... outras verificações
    
  } catch (error) {
    setCanCreate(false);
    // ... desabilitar outras
  }
};

// 4. UseEffect
useEffect(() => {
  checkPermissions();
}, []);

// 5. Renderização
{canCreate ? (
  <Button onClick={handleAction}>Ação</Button>
) : (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-block">
          <Button disabled={true} className="opacity-50 cursor-not-allowed">
            Ação
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Você não tem permissão para esta ação</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)}
```

---
**Importante**: Este padrão garante que o controle de acesso seja granular, seguro e ofereça feedback claro aos usuários sobre suas permissões.