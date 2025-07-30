# Guia de Referência da API Backend

## Autenticação e Usuários

### Endpoints de Autenticação
- **POST /register** (admin) — Cadastrar novo usuário
- **POST /login** — Login do usuário
- **POST /logout** — Logout (revoga refresh token)
- **POST /refresh** — Gera novo access token a partir do refresh token
- **POST /password/request-reset** — Solicitar recuperação de senha
- **POST /password/reset** — Redefinir senha com token
- **POST /password/change** — Alterar senha (autenticado)
- **POST /email/request-confirmation** — Solicitar confirmação de e-mail (autenticado)
- **POST /email/confirm** — Confirmar e-mail

### Endpoints de Gerenciamento de Usuários (admin)
- **GET /users** — Listar usuários
- **PUT /users/:id** — Atualizar usuário
- **DELETE /users/:id** — Remover/desativar usuário

---

### Exemplos de JSON

**Cadastro de usuário (admin):**
```json
{
  "nome": "Admin Teste",
  "email": "admin@teste.com",
  "senha": "123456",
  "tipo": "ADMIN"
}
```

**Login:**
```json
{
  "email": "admin@teste.com",
  "senha": "123456"
}
```

**Resposta de login:**
```json
{
  "user": {
    "id": "uuid",
    "nome": "Admin Teste",
    "email": "admin@teste.com",
    "tipo": "ADMIN",
    "ativo": true
  },
  "accessToken": "jwt...",
  "refreshToken": "jwt..."
}
```

**Solicitar recuperação de senha:**
```json
{
  "email": "usuario@teste.com"
}
```

**Redefinir senha:**
```json
{
  "token": "token-recebido-por-email",
  "novaSenha": "novaSenha123"
}
```

**Alterar senha (autenticado):**
```json
{
  "senhaAtual": "senhaAntiga",
  "novaSenha": "novaSenha123"
}
```

**Solicitar confirmação de e-mail:** (autenticado, sem body)

**Confirmar e-mail:**
```json
{
  "token": "token-recebido-por-email"
}
```

---

### Observações Gerais de Autenticação
- O login retorna dois tokens: `accessToken` (JWT, curto prazo) e `refreshToken` (JWT, longo prazo).
- O `accessToken` deve ser enviado no header `Authorization: Bearer ...` para acessar rotas protegidas.
- O `refreshToken` deve ser enviado no body para renovar o access token.
- O logout remove o refresh token do banco, invalidando a sessão.
- O cadastro de usuário só pode ser feito por administradores autenticados.
- Para alterar senha ou solicitar confirmação de e-mail, o usuário deve estar autenticado.
- O campo `tipo` define o nível de permissão: `ADMIN`, `RECEPCIONISTA`, `PROFISSIONAL`, `PACIENTE`.
- Endpoints de gerenciamento de usuários exigem autenticação e permissão de admin.
- O sistema implementa **rate limit** (5 tentativas a cada 15 minutos) em login e recuperação de senha para proteção contra brute-force.
- Para redefinir senha ou confirmar e-mail, o usuário recebe um token por e-mail (mock).
- O JWT deve ser validado no backend usando o segredo definido em `process.env.JWT_SECRET`.
- O refresh token é armazenado no banco e pode ser revogado a qualquer momento.

---

## 1. Especialidades
- **POST /especialidades**
- **GET /especialidades**
- **PUT /especialidades/:id**
- **DELETE /especialidades/:id**

**Campos obrigatórios:**
- nome (string)

**Campos opcionais:**
(nenhum)

**Exemplo de JSON:**
```json
{
  "nome": "Fisioterapia"
}
```

**Restrições e Observações:**
- `nome`: mínimo 1 caractere.
- Não há campos opcionais.

---

## 2. Conselhos Profissionais
- **POST /conselhos**
- **GET /conselhos**
- **PUT /conselhos/:id**
- **DELETE /conselhos/:id**

**Campos obrigatórios:**
- sigla (string)
- nome (string)

**Campos opcionais:**
(nenhum)

**Exemplo de JSON:**
```json
{
  "sigla": "CREFITO",
  "nome": "Conselho Regional de Fisioterapia"
}
```

**Restrições e Observações:**
- `sigla`: mínimo 2 caracteres.
- `nome`: mínimo 3 caracteres.

---

## 3. Serviços
- **POST /servicos**
- **GET /servicos**
- **PUT /servicos/:id**
- **DELETE /servicos/:id**

**Campos obrigatórios:**
- nome (string)
- duracaoMinutos (number)
- preco (number)
- conveniosIds (array de UUIDs)

**Campos opcionais:**
- descricao (string ou null)
- percentualClinica (number ou null)
- percentualProfissional (number ou null)
- procedimentoPrimeiroAtendimento (string ou null)
- procedimentoDemaisAtendimentos (string ou null)

**Exemplo de JSON:**
```json
{
  "nome": "Consulta",
  "descricao": "Primeira consulta do paciente",
  "duracaoMinutos": 60,
  "preco": 150.0,
  "percentualClinica": 60,
  "percentualProfissional": 40,
  "procedimentoPrimeiroAtendimento": "Avaliação inicial",
  "procedimentoDemaisAtendimentos": "Sessão de acompanhamento",
  "conveniosIds": ["uuid-convenio-1", "uuid-convenio-2"]
}
```

**Restrições e Observações:**
- `nome`: mínimo 3 caracteres.
- `duracaoMinutos`: inteiro positivo.
- `preco`: número positivo.
- `percentualClinica` e `percentualProfissional`: 0 a 100.
- `conveniosIds`: array de UUIDs, mínimo 1 item.
- Campos opcionais podem ser omitidos ou enviados como null.

---

## 4. Convênios
- **POST /convenios**
- **GET /convenios**
- **PUT /convenios/:id**
- **DELETE /convenios/:id**

**Campos obrigatórios:**
- nome (string)

**Campos opcionais:**
(nenhum)

**Exemplo de JSON:**
```json
{
  "nome": "Unimed"
}
```

**Restrições e Observações:**
- `nome`: mínimo 3 caracteres.

---

## 5. Pacientes
- **POST /pacientes**
- **GET /pacientes**
- **PUT /pacientes/:id**
- **DELETE /pacientes/:id**

**Campos obrigatórios:**
- nomeCompleto (string)
- tipoServico (string)

**Campos opcionais:**
- email (string ou null)
- whatsapp (string ou null)
- cpf (string ou null)
- dataNascimento (Date ou null)
- convenioId (UUID ou null)
- numeroCarteirinha (string ou null)
- dataPedidoMedico (Date ou null)
- crm (string ou null)
- cbo (string ou null)
- cid (string ou null)
- pedidoMedicoArquivo (string ou null)
- userId (UUID ou null)

**Exemplo de JSON:**
```json
{
  "nomeCompleto": "Maria da Silva",
  "tipoServico": "Fisioterapia",
  "email": "maria@email.com",
  "whatsapp": "11999999999",
  "cpf": "123.456.789-00",
  "dataNascimento": "1990-01-01",
  "convenioId": "uuid-convenio",
  "numeroCarteirinha": "123456",
  "dataPedidoMedico": "2024-05-01",
  "crm": "12345-SP",
  "cbo": "2236-05",
  "cid": "M54",
  "pedidoMedicoArquivo": null,
  "userId": null
}
```

**Restrições e Observações:**
- `nomeCompleto`: mínimo 3 caracteres.
- `email`: deve ser e-mail válido.
- `cpf`: string, formato brasileiro (não validado no backend, apenas string).
- `dataNascimento`, `dataPedidoMedico`: formato ISO ou "YYYY-MM-DD".
- `convenioId`, `userId`: UUID válido.
- Campos opcionais podem ser omitidos ou enviados como null.

---

## 6. Recursos
- **POST /recursos**
- **GET /recursos**
- **PUT /recursos/:id**
- **DELETE /recursos/:id**

**Campos obrigatórios:**
- nome (string)

**Campos opcionais:**
- descricao (string)

**Exemplo de JSON:**
```json
{
  "nome": "Sala 1",
  "descricao": "Sala de atendimento com equipamentos"
}
```

**Restrições e Observações:**
- `nome`: mínimo 1 caractere.
- `descricao`: opcional.

---

## 7. Profissionais
- **POST /profissionais**
- **GET /profissionais**
- **PUT /profissionais/:id**
- **DELETE /profissionais/:id**
- **GET /profissionais/:id** — Buscar profissional por ID

### Endpoints de Edição por Seção
- **PUT /profissionais/:id/endereco** — Editar endereço do profissional
- **PUT /profissionais/:id/informacao-profissional** — Editar informações profissionais
- **PUT /profissionais/:id/dados-bancarios** — Editar dados bancários
- **PUT /profissionais/:id/empresa-contrato** — Editar dados da empresa/contrato
- **PUT /profissionais/:id/servicos** — Editar serviços do profissional

### Endpoints de Deleção de Comprovantes
- **DELETE /profissionais/:id/comprovante-endereco** — Deletar comprovante de endereço
- **DELETE /profissionais/:id/comprovante-registro** — Deletar comprovante de registro profissional
- **DELETE /profissionais/:id/comprovante-bancario** — Deletar comprovante bancário

**Campos obrigatórios:**
- nome (string)
- cpf (string)
- email (string)
- especialidadesIds (array de UUIDs)
- servicosIds (array de UUIDs)

**Campos opcionais:**
- cnpj (string ou null)
- razaoSocial (string ou null)
- whatsapp (string ou null)
- logradouro (string ou null)
- numero (string ou null)
- complemento (string ou null)
- bairro (string ou null)
- cidade (string ou null)
- estado (string ou null)
- cep (string ou null)
- comprovanteEndereco (string ou null)
- conselhoId (UUID ou null)
- numeroConselho (string ou null)
- comprovanteRegistro (string ou null)
- banco (string ou null)
- agencia (string ou null)
- conta (string ou null)
- pix (string ou null)
- comprovanteBancario (string ou null)
- userId (UUID ou null)

**Exemplo de JSON:**
```json
{
  "nome": "João Souza",
  "cpf": "123.456.789-00",
  "email": "joao@email.com",
  "especialidadesIds": ["uuid-especialidade-1"],
  "servicosIds": ["uuid-servico-1", "uuid-servico-2"],
  "whatsapp": "11988887777",
  "conselhoId": "uuid-conselho",
  "numeroConselho": "12345",
  "userId": null
}
```

**Restrições e Observações:**
- `email`: deve ser e-mail válido.
- `cpf`: string, formato brasileiro.
- `especialidadesIds`, `servicosIds`: arrays de UUIDs, podem ser vazios.
- `conselhoId`, `userId`: UUID válido.
- Campos opcionais podem ser omitidos ou enviados como null.

### Exemplos dos Endpoints de Edição por Seção

**Editar endereço (multipart/form-data ou JSON):**
```json
{
  "cep": "12345-678",
  "logradouro": "Rua das Flores",
  "numero": "123",
  "complemento": "Apto 45",
  "bairro": "Centro",
  "cidade": "São Paulo",
  "estado": "SP"
}
```
*Também aceita arquivo com fieldname 'file' para comprovante de endereço*

**Editar informações profissionais (multipart/form-data ou JSON):**
```json
{
  "conselhoId": "uuid-conselho",
  "numeroConselho": "12345-SP",
  "especialidadesIds": ["uuid-especialidade-1", "uuid-especialidade-2"]
}
```
*Também aceita arquivo com fieldname 'file' para comprovante de registro*

**Editar dados bancários (multipart/form-data ou JSON):**
```json
{
  "banco": "Banco do Brasil",
  "agencia": "1234",
  "conta": "56789-0",
  "tipo_pix": "cpf",
  "pix": "123.456.789-00"
}
```
*Também aceita arquivo com fieldname 'file' para comprovante bancário*

**Editar empresa/contrato (JSON):**
```json
{
  "cnpj": "12.345.678/0001-90",
  "razaoSocial": "Empresa Médica LTDA"
}
```

**Editar serviços (JSON):**
```json
{
  "servicosIds": ["uuid-servico-1", "uuid-servico-2", "uuid-servico-3"]
}
```

### Observações sobre Deleção de Comprovantes
- Os endpoints de deleção de comprovantes retornam o profissional atualizado
- Removem tanto o arquivo do storage quanto a URL do banco de dados
- Retornam erro 404 se o profissional não for encontrado ou se não houver comprovante
- Não requerem body na requisição

---

## 8. Agendamentos
- **POST /agendamentos**
- **GET /agendamentos?profissionalId=...&pacienteId=...&dataHoraInicio=...&status=...**
- **PUT /agendamentos/:id**
- **DELETE /agendamentos/:id**

**Campos obrigatórios:**
- pacienteId (UUID)
- profissionalId (UUID)
- tipoAtendimento (string)
- recursoId (UUID)
- convenioId (UUID)
- servicoId (UUID)
- dataHoraInicio (Date)

**Campos opcionais:**
- dataHoraFim (Date, calculado automaticamente se não enviado)
- codLiberacao (string ou null)
- statusCodLiberacao (string ou null)
- dataCodLiberacao (Date ou null)
- status (string)
- recorrencia (objeto de recorrência)

**Exemplo de JSON:**
```json
{
  "pacienteId": "uuid-paciente",
  "profissionalId": "uuid-profissional",
  "tipoAtendimento": "presencial",
  "recursoId": "uuid-recurso",
  "convenioId": "uuid-convenio",
  "servicoId": "uuid-servico",
  "dataHoraInicio": "2024-06-01T09:00:00.000Z",
  "recorrencia": {
    "tipo": "semanal",
    "ate": "2024-07-01",
    "repeticoes": 4
  }
}
```

**Restrições e Observações:**
- Todos os campos de ID devem ser UUIDs válidos.
- `dataHoraInicio`, `dataHoraFim`, `dataCodLiberacao`: formato ISO ou "YYYY-MM-DD".
- `recorrencia.tipo`: "semanal", "quinzenal" ou "mensal".
- `recorrencia.ate`: data final da recorrência (opcional).
- `recorrencia.repeticoes`: número de repetições (opcional, inteiro positivo).
- Se houver recorrência, todos os agendamentos só serão criados se não houver conflito de horário.
- Campos opcionais podem ser omitidos ou enviados como null.

---

## 9. Evoluções de Pacientes
- **POST /evolucoes**
- **GET /evolucoes?pacienteId=uuid-do-paciente**
- **PUT /evolucoes/:id**
- **DELETE /evolucoes/:id**

**Campos obrigatórios:**
- pacienteId (UUID)
- agendamentoId (UUID)
- dataEvolucao (Date)
- objetivoSessao (string)
- descricaoEvolucao (string)

**Campos opcionais:**
(nenhum)

**Exemplo de JSON:**
```json
{
  "pacienteId": "uuid-paciente",
  "agendamentoId": "uuid-agendamento",
  "dataEvolucao": "2024-06-01T10:00:00.000Z",
  "objetivoSessao": "Alívio da dor lombar",
  "descricaoEvolucao": "Paciente apresentou melhora significativa."
}
```

**Restrições e Observações:**
- Todos os campos de ID devem ser UUIDs válidos.
- `dataEvolucao`: formato ISO ou "YYYY-MM-DD".

---

## 10. Disponibilidades Profissionais
- **POST /disponibilidades-profissionais**
- **GET /disponibilidades-profissionais**
- **PUT /disponibilidades-profissionais/:id**
- **DELETE /disponibilidades-profissionais/:id**

**Campos obrigatórios:**
- profissionalId (UUID)
- horaInicio (Date)
- horaFim (Date)
- tipo (string)

**Campos opcionais:**
- diaSemana (number ou null)
- dataEspecifica (Date ou null)
- observacao (string ou null)

**Exemplo de JSON:**
```json
{
  "profissionalId": "uuid-profissional",
  "horaInicio": "2024-06-01T08:00:00.000Z",
  "horaFim": "2024-06-01T12:00:00.000Z",
  "tipo": "disponivel",
  "diaSemana": 1,
  "observacao": "Atendimento apenas pela manhã"
}
```

**Restrições e Observações:**
- `profissionalId`: UUID válido.
- `horaInicio`, `horaFim`, `dataEspecifica`: formato ISO ou "YYYY-MM-DD".
- `diaSemana`: 0 (domingo) a 6 (sábado).
- `tipo`: string, ex: "disponivel".
- Campos opcionais podem ser omitidos ou enviados como null.

---

## 11. Contratos Profissionais
- **POST /contratos-profissionais**
- **GET /contratos-profissionais**
- **PUT /contratos-profissionais/:id**
- **DELETE /contratos-profissionais/:id**

**Campos obrigatórios:**
- profissionalId (UUID)
- dataInicio (Date)

**Campos opcionais:**
- dataFim (Date ou null)
- arquivoContrato (string ou null)
- observacao (string ou null)

**Exemplo de JSON:**
```json
{
  "profissionalId": "uuid-profissional",
  "dataInicio": "2024-06-01",
  "dataFim": null,
  "arquivoContrato": null,
  "observacao": "Contrato temporário"
}
```

**Restrições e Observações:**
- `profissionalId`: UUID válido.
- `dataInicio`, `dataFim`: formato ISO ou "YYYY-MM-DD".
- `arquivoContrato`: URL válida ou null.
- Campos opcionais podem ser omitidos ou enviados como null.

---

## 12. Adendos Contratuais
- **POST /adendos-contratos**
- **GET /adendos-contratos**
- **PUT /adendos-contratos/:id**
- **DELETE /adendos-contratos/:id**

**Campos obrigatórios:**
- contratoId (UUID)
- dataAdendo (Date)

**Campos opcionais:**
- arquivoAdendo (string ou null)
- descricao (string ou null)

**Exemplo de JSON:**
```json
{
  "contratoId": "uuid-contrato",
  "dataAdendo": "2024-06-10",
  "arquivoAdendo": null,
  "descricao": "Prorrogação do contrato"
}
```

**Restrições e Observações:**
- `contratoId`: UUID válido.
- `dataAdendo`: formato ISO ou "YYYY-MM-DD".
- `arquivoAdendo`: URL válida ou null.
- Campos opcionais podem ser omitidos ou enviados como null.

---

## 13. Anexos
- **POST /anexos**
- **GET /anexos?entidadeId=...**
- **PUT /anexos/:id**
- **DELETE /anexos/:id**

**Campos obrigatórios:**
- entidadeId (UUID)
- bucket (string)
- nomeArquivo (string)

**Campos opcionais:**
- descricao (string ou null)
- criadoPor (string ou null)
- url (string ou null)

**Exemplo de JSON (multipart):**
```
(entidadeId: uuid, bucket: string, nomeArquivo: arquivo, descricao: string, criadoPor: uuid)
```

**Restrições e Observações:**
- Envie o arquivo em multipart/form-data.
- `entidadeId`, `criadoPor`: UUID válido.
- `bucket`, `nomeArquivo`, `descricao`: string.
- `url`: preenchido automaticamente pelo backend.

---

## 14. Preços Particulares
- **POST /precos-particulares**
- **GET /precos-particulares**
- **PUT /precos-particulares/:id**
- **DELETE /precos-particulares/:id**

**Campos obrigatórios:**
- pacienteId (UUID)
- servicoId (UUID)
- preco (number)

**Campos opcionais:**
(nenhum)

**Exemplo de JSON:**
```json
{
  "pacienteId": "uuid-paciente",
  "servicoId": "uuid-servico",
  "preco": 120.0
}
```

**Restrições e Observações:**
- `pacienteId`, `servicoId`: UUID válido.
- `preco`: número.

---

## 15. Preços Serviços Profissionais
- **POST /precos-servicos-profissionais**
- **GET /precos-servicos-profissionais**
- **PUT /precos-servicos-profissionais/:id**
- **DELETE /precos-servicos-profissionais/:id**

**Campos obrigatórios:**
- profissionalId (UUID)
- servicoId (UUID)

**Campos opcionais:**
- precoProfissional (number ou null)
- precoClinica (number ou null)

**Exemplo de JSON:**
```json
{
  "profissionalId": "uuid-profissional",
  "servicoId": "uuid-servico",
  "precoProfissional": 80.0,
  "precoClinica": 40.0
}
```

**Restrições e Observações:**
- `profissionalId`, `servicoId`: UUID válido.
- `precoProfissional`, `precoClinica`: número ou null.

---

## Observações Gerais
- Todos os endpoints seguem o padrão REST.
- Os campos `id` são sempre UUIDs.
- Para uploads (anexos), utilize multipart/form-data.
- Para relacionamentos (ex: especialidadesIds, servicosIds), envie arrays de UUIDs.
- Datas podem ser enviadas como "YYYY-MM-DD" ou ISO. 