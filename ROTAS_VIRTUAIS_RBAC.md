# Rotas Virtuais para RBAC - Granularidade Menu vs API

## **Objetivo:**
Permitir acesso a APIs específicas sem expor páginas administrativas desnecessárias para determinados roles.

## **Implementação:**
Sistema de rotas virtuais que controlam o acesso às **páginas** separadamente do acesso às **APIs**.

## **Novas Rotas Virtuais a Cadastrar:**

### **1. Serviços - Controle de Página**
```
Rota: /servicos-page
Método: GET
Descrição: Controla acesso à ServicosPage e menu Serviços no sidebar
Permissão Original: GET /servicos (controla API)
```

### **2. Convênios - Controle de Página**
```
Rota: /convenios-page  
Método: GET
Descrição: Controla acesso à ConveniosPage e menu Convênios no sidebar
Permissão Original: GET /convenios (controla API)
```

## **Configuração de Permissões por Role:**

### **PROFISSIONAL:**
```
✅ GET /servicos          (API funciona para PacientesPage)
✅ GET /convenios         (API funciona para PacientesPage)
❌ GET /servicos-page     (menu e página ocultos)
❌ GET /convenios-page    (menu e página ocultos)
```

### **ADMIN/RECEPCIONISTA:**
```
✅ GET /servicos          (API funciona)
✅ GET /convenios         (API funciona)
✅ GET /servicos-page     (menu e página visíveis)
✅ GET /convenios-page    (menu e página visíveis)
```

## **Resultado:**
- **PacientesPage** funciona para PROFISSIONAL (APIs disponíveis)
- **Menu** Serviços/Convênios oculto para PROFISSIONAL
- **Páginas** ServicosPage/ConveniosPage bloqueadas para PROFISSIONAL
- **ADMIN/RECEPCIONISTA** mantém acesso total

## **Arquivos Modificados:**

### **Frontend:**
1. **useMenuPermissions.ts** - Atualizado para usar rotas `-page`
2. **ServicosPage.tsx** - Verificação de `/servicos-page`
3. **ConveniosPage.tsx** - Verificação de `/convenios-page`

### **Backend/RBAC:**
4. **Cadastrar rotas virtuais** `/servicos-page` e `/convenios-page`
5. **Configurar permissões** por role conforme especificado

## **Status da Implementação:**
- ✅ Frontend atualizado
- ⏳ Cadastro de rotas virtuais no RBAC (pendente)
- ⏳ Configuração de permissões por role (pendente)

---
**Data:** $(date)
**Implementado por:** Claude Code Assistant