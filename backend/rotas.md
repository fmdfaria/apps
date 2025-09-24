## Health Check
GET /

### Auth
POST /register
POST /login
POST /logout
POST /refresh
POST /password/request-reset
POST /password/reset
POST /password/change
POST /first-login
POST /email/request-confirmation
POST /email/confirm

### Users
GET /users/me
GET /users/me/permissions
GET /users
GET /users/:id
PUT /users/:id
DELETE /users/:id

### Roles
POST /roles
GET /roles
PUT /roles/:id
DELETE /roles/:id

### Routes (RBAC)
POST /routes
GET /routes
GET /routes/find-by-path
PUT /routes/:id
DELETE /routes/:id

### User-Roles (vínculo usuário ↔ perfil)
POST /user-roles
GET /user-roles
PUT /user-roles/:id
DELETE /user-roles/:userId/:roleId
GET /users/:userId/roles
GET /users/:userId/allowed-routes

### Role-Routes (vínculo perfil ↔ rota)
POST /role-routes
GET /role-routes
PUT /role-routes/:id
DELETE /role-routes/:id
DELETE /role-routes/:roleId/:routeId

### Especialidades
POST /especialidades
GET /especialidades
PUT /especialidades/:id
DELETE /especialidades/:id

### Conselhos Profissionais
POST /conselhos
GET /conselhos
PUT /conselhos/:id
DELETE /conselhos/:id

### Serviços
POST /servicos
GET /servicos
PUT /servicos/:id
DELETE /servicos/:id
PATCH /servicos/:id/status

### Convênios
POST /convenios
GET /convenios
PUT /convenios/:id
DELETE /convenios/:id

### Pacientes
POST /pacientes
GET /pacientes
GET /pacientes/:id
PUT /pacientes/:id
DELETE /pacientes/:id
PATCH /pacientes/:id/status

### Pacientes – Pedidos Médicos (prefixo /pacientes)
POST /pacientes/:pacienteId/pedidos
GET /pacientes/:pacienteId/pedidos
PUT /pacientes/:pacienteId/pedidos/:id
DELETE /pacientes/:pacienteId/pedidos/:id

### Recursos
GET /recursos
GET /recursos/by-date
POST /recursos
PUT /recursos/:id
DELETE /recursos/:id

### Profissionais
POST /profissionais
GET /profissionais
GET /profissionais/me
GET /profissionais/:id
PUT /profissionais/:id
DELETE /profissionais/:id
PUT /profissionais/:id/endereco
PUT /profissionais/:id/informacao-profissional
PUT /profissionais/:id/dados-bancarios
PUT /profissionais/:id/empresa-contrato
PUT /profissionais/:id/servicos
PATCH /profissionais/:id/status
DELETE /profissionais/:id/comprovante-endereco
DELETE /profissionais/:id/comprovante-registro
DELETE /profissionais/:id/comprovante-bancario

### Profissionais – Serviços
GET /profissionais-servicos
GET /profissionais-servicos/:id
GET /profissionais/:profissionalId/servicos-convenios

### Preços – Serviços por Profissionais
POST /precos-servicos-profissionais
PUT /precos-servicos-profissionais/:id
GET /precos-servicos-profissionais
DELETE /precos-servicos-profissionais/:id

### Preços Particulares
POST /precos-particulares
PUT /precos-particulares/:id
GET /precos-particulares
DELETE /precos-particulares/:id

### Disponibilidades de Profissionais
GET /disponibilidades-profissionais
POST /disponibilidades-profissionais
PUT /disponibilidades-profissionais/:id
DELETE /disponibilidades-profissionais/:id

### Contratos de Profissionais
POST /contratos-profissionais
GET /contratos-profissionais
PUT /contratos-profissionais/:id
DELETE /contratos-profissionais/:id

### Adendos de Contratos
POST /adendos-contratos
GET /adendos-contratos
PUT /adendos-contratos/:id
DELETE /adendos-contratos/:id

### Anexos e Arquivos
POST /anexos
GET /anexos
GET /anexos/:id/download
PUT /anexos/:id
DELETE /anexos/:id
GET /logo
GET /favicon
POST /avatar
GET /avatar

### Agendamentos
GET /agendamentos
GET /agendamentos/form-data
GET /agendamentos/:id/series-info
POST /agendamentos
PUT /agendamentos/:id
DELETE /agendamentos/:id
PUT /agendamentos-liberar/:id
PUT /agendamentos-liberar-particular/:id
PUT /agendamentos-liberar-particular-mensal
PUT /agendamentos-atender/:id
PUT /agendamentos-concluir/:id
PUT /agendamentos-pendencias/:id
POST /agendamentos/fechamento-pagamento

### Evoluções de Pacientes
POST /evolucoes
GET /evolucoes
POST /evolucoes/status-por-agendamentos
GET /evolucoes/agendamento/:agendamentoId
PUT /evolucoes/:id
DELETE /evolucoes/:id

### Fila de Espera
POST /fila-de-espera
GET /fila-de-espera
GET /fila-de-espera/:id
PUT /fila-de-espera/:id
DELETE /fila-de-espera/:id
PATCH /fila-de-espera/:id/status

### Configurações
POST /configuracoes
GET /configuracoes
GET /configuracoes/entity
PUT /configuracoes/:id
DELETE /configuracoes/:id

### Dashboard (prefixo /dashboard)
GET /dashboard/ocupacao

### Empresas
GET /empresas
POST /empresas
GET /empresas/:id
PUT /empresas/:id
DELETE /empresas/:id
PATCH /empresas/:id/status

### Bancos
GET /bancos
POST /bancos
PUT /bancos/:id
DELETE /bancos/:id

### Contas Bancárias
GET /contas-bancarias
POST /contas-bancarias
GET /contas-bancarias/:id
PUT /contas-bancarias/:id
DELETE /contas-bancarias/:id
GET /contas-bancarias/empresa/:empresaId
PATCH /contas-bancarias/:id/saldo

### Categorias Financeiras
GET /categorias-financeiras
POST /categorias-financeiras
GET /categorias-financeiras/:id
PUT /categorias-financeiras/:id
DELETE /categorias-financeiras/:id
GET /categorias-financeiras/tipo/:tipo

### Contas a Pagar
GET /contas-pagar
POST /contas-pagar
GET /contas-pagar/:id
PUT /contas-pagar/:id
DELETE /contas-pagar/:id
POST /contas-pagar/:id/pagar
PATCH /contas-pagar/:id/cancelar
GET /contas-pagar/pendentes
GET /contas-pagar/vencidas
GET /contas-pagar/recorrentes

### Contas a Receber
GET /contas-receber
POST /contas-receber
GET /contas-receber/:id
PUT /contas-receber/:id
DELETE /contas-receber/:id
POST /contas-receber/:id/receber
PATCH /contas-receber/:id/cancelar
GET /contas-receber/pendentes
GET /contas-receber/vencidas

### Fluxo de Caixa
GET /fluxo-caixa
POST /fluxo-caixa
GET /fluxo-caixa/:id
PUT /fluxo-caixa/:id
DELETE /fluxo-caixa/:id
POST /fluxo-caixa/:id/conciliar
GET /fluxo-caixa/dashboard
GET /fluxo-caixa/periodo

### Agendamentos ↔ Contas (Relacionamentos)
GET /agendamentos-contas
POST /agendamentos-contas
GET /agendamentos-contas/agendamento/:id
GET /agendamentos-contas/conta-receber/:id
GET /agendamentos-contas/conta-pagar/:id
DELETE /agendamentos-contas/:id
