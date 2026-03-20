# Plano de Implementação Mobile

## Contexto atual
- Backend e frontend web já estão em produção.
- Mobile (Expo) está iniciado, mas ainda em formato de template com dados mock.
- Objetivo: portar funcionalidades do frontend para o mobile usando a API já existente.

## Diagnóstico técnico
- Mobile atual ainda sem integração real de autenticação/API.
- Frontend web já possui fluxo completo de sessão: `login`, `refresh`, `logout`, `first-login`.
- Backend já expõe os endpoints necessários:
  - `POST /login`
  - `POST /refresh`
  - `POST /logout`
  - `POST /first-login`
  - `GET /users/me`
  - `GET /users/me/permissions`
- Backend utiliza RBAC por rota; o mobile precisa respeitar isso desde o início.

---

## Fase 0 - Fundação técnica (pré-login)
### Objetivo
Criar base de networking, segurança e sessão para suportar as próximas fases.

### Escopo
- Implementar camada `api` no mobile com `axios`.
- Criar interceptors:
  - Injeção de `Authorization: Bearer <token>`
  - Refresh automático no `401`
- Persistência segura de tokens com `expo-secure-store`.
- Configuração de ambiente:
  - `EXPO_PUBLIC_API_URL` (dev/stage/prd)
- Modelo padrão de erros e tratamento global de falhas.

### Entregáveis
- Serviço de API funcional.
- Armazenamento seguro de sessão.
- Base de tratamento de erros pronta.

### Critérios de aceite
- Requisições autenticadas enviam token corretamente.
- Refresh automático funciona em token expirado.
- Logout força limpeza completa da sessão local.

---

## Fase 1 - Login e sessão (início obrigatório)
### Objetivo
Entregar autenticação real no mobile, com experiência equivalente ao frontend web.

### Escopo
- Integrar tela de login com `POST /login`.
- Tratar `requiresPasswordChange`.
- Implementar fluxo de primeiro acesso com `POST /first-login`.
- Implementar bootstrap de sessão na abertura do app:
  - Ler tokens salvos
  - Tentar `POST /refresh`
  - Redirecionar para login se inválido
- Implementar `POST /logout`.
- Buscar usuário com `GET /users/me`.
- Buscar permissões com `GET /users/me/permissions`.
- Criar `AuthGuard` para alternar entre stack autenticada e não autenticada.

### Entregáveis
- Login real integrado.
- Sessão persistente após fechar/reabrir app.
- Fluxo de primeiro login funcional.

### Critérios de aceite
- Usuário autenticado entra no app com dados reais.
- Sessão é restaurada automaticamente ao reabrir.
- Access token expirado é renovado sem quebrar UX.
- Refresh inválido redireciona para login.

---

## Fase 2 - Navegação e RBAC no mobile
### Objetivo
Substituir a navegação de template por navegação de clínica, orientada por permissões.

### Escopo
- Renomear rotas/telas para domínio real.
- Construir tabs/menus com base em permissões de `GET /users/me/permissions`.
- Bloquear telas/ações sem permissão (com feedback claro ao usuário).

### Entregáveis
- Navegação alinhada ao domínio da clínica.
- Menu dinâmico por perfil (ADMIN, RECEPCIONISTA, PROFISSIONAL etc).

### Critérios de aceite
- Usuário só visualiza módulos permitidos.
- Tentativa de acesso sem permissão é tratada corretamente.

---

## Fase 3 - MVP assistencial (maior valor para mobile)
### Objetivo
Permitir operação clínica diária no celular.

### Escopo
- Minha agenda (dia e próximos atendimentos).
- Ações rápidas de atendimento:
  - atender
  - concluir
  - pendência
- Pacientes (listagem + detalhe essencial).
- Evoluções de paciente vinculadas ao agendamento.

### Entregáveis
- Fluxo principal de atendimento operacional no mobile.

### Critérios de aceite
- Profissional consegue executar ciclo de atendimento pelo app.
- Dados refletidos corretamente no backend.

---

## Fase 4 - Operação recepção
### Objetivo
Cobrir rotinas de recepção no mobile.

### Escopo
- Agendamentos (criar, editar, cancelar, filtrar).
- Fila de espera.
- Liberação de agendamentos (convênio e particular), conforme RBAC.

### Entregáveis
- Rotinas operacionais de recepção disponíveis no mobile.

### Critérios de aceite
- Fluxos de agendamento funcionam com regras de negócio atuais.
- Telas respeitam permissões do usuário.

---

## Fase 5 - Financeiro e módulos administrativos
### Objetivo
Expandir cobertura para financeiro e áreas administrativas quando houver necessidade mobile.

### Escopo
- Contas a receber e contas a pagar (visão operacional).
- Histórico financeiro do profissional.
- Cadastros administrativos essenciais (caso demandado pelo negócio).

### Entregáveis
- Cobertura mobile dos módulos prioritários de gestão.

### Critérios de aceite
- Funcionalidades priorizadas pelo negócio disponíveis e estáveis.

---

## Fase 6 - Hardening para produção
### Objetivo
Garantir estabilidade, observabilidade e distribuição.

### Escopo
- Observabilidade (erros e logs).
- Testes E2E dos fluxos críticos:
  - login
  - refresh
  - agenda/atendimento
- Otimizações de performance.
- Estratégia de cache offline parcial.
- Pipeline de build/distribuição (`EAS Build`).

### Entregáveis
- App pronto para rollout controlado e escala.

### Critérios de aceite
- Fluxos críticos monitorados e testados.
- Processo de build/release reproduzível.

---

## Sequência sugerida
1. Fase 0
2. Fase 1
3. Fase 2
4. Fase 3
5. Fase 4
6. Fase 5
7. Fase 6

## Estimativa inicial (macro)
- Fase 0: 2 a 3 dias
- Fase 1: 3 a 5 dias
- Fase 2: 2 a 3 dias
- Fase 3: 1 a 2 sprints
- Fases 4 a 6: conforme priorização de negócio

## Riscos e pontos de atenção
- Diferenças entre documentação antiga e rotas reais do backend.
- Necessidade de RBAC desde cedo para evitar retrabalho.
- Definição clara de prioridades por perfil para evitar portar telas sem valor mobile.
