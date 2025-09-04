# Google Calendar/Meet Integration

Esta documentação descreve como configurar e usar a integração com Google Calendar/Meet no sistema de gestão da clínica.

## Visão Geral

A integração permite:
- Criação automática de eventos no Google Calendar para atendimentos online
- Geração de links do Google Meet para consultas virtuais
- Sincronização bidirecional entre o sistema e o calendário
- Templates customizáveis para título e descrição dos eventos
- Suporte a agendamentos únicos e recorrentes

## Configuração

### 1. Configuração do Google Cloud Console

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a Google Calendar API:
   - Navegue para "APIs & Services" > "Library"
   - Busque por "Google Calendar API"
   - Clique em "Enable"

4. Configure as credenciais OAuth 2.0:
   - Vá para "APIs & Services" > "Credentials"
   - Clique em "Create Credentials" > "OAuth 2.0 Client IDs"
   - Escolha "Web application"
   - Configure as URLs de redirecionamento autorizadas

### 2. Variáveis de Ambiente

Configure as seguintes variáveis no arquivo `.env` do backend:

```env
# Google Calendar Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3333/auth/google/callback
GOOGLE_REFRESH_TOKEN=your_refresh_token_here
GOOGLE_CALENDAR_ID=primary
GOOGLE_TIMEZONE=America/Sao_Paulo

# Integration Control
ONLINE_ATIVO=true

# Event Templates (Optional - defaults provided)
GOOGLE_EVENT_TITLE_TEMPLATE={{servicoNome}} - {{pacienteNome}}
GOOGLE_EVENT_DESCRIPTION_TEMPLATE=**Atendimento:** {{tipoAtendimento}}
**Paciente:** {{pacienteNome}}
**WhatsApp:** {{pacienteWhatsapp}}
**Profissional:** {{profissionalNome}}
**Serviço:** {{servicoNome}}
**Convênio:** {{convenioNome}}
**Recurso:** {{recursoNome}}
**ID Agendamento:** {{agendamentoId}}

{{observacoes}}
```

### 3. Obter Token de Atualização

Para obter o `GOOGLE_REFRESH_TOKEN`:

1. Implemente um endpoint temporário no backend:

```typescript
// Adicione esta rota temporariamente para configuração inicial
app.get('/auth/google', async (request, reply) => {
  const googleCalendarService = container.resolve(GoogleCalendarService);
  const authUrl = googleCalendarService.getAuthUrl();
  
  if (!authUrl) {
    return reply.code(500).send({ error: 'Google Calendar not configured' });
  }
  
  reply.redirect(authUrl);
});

app.get('/auth/google/callback', async (request, reply) => {
  const { code } = request.query as { code: string };
  
  if (!code) {
    return reply.code(400).send({ error: 'Authorization code not provided' });
  }
  
  const googleCalendarService = container.resolve(GoogleCalendarService);
  
  try {
    const tokens = await googleCalendarService.handleAuthCallback(code);
    
    // IMPORTANTE: Salve o refresh_token no seu arquivo .env
    console.log('Refresh Token:', tokens.refresh_token);
    
    reply.send({ 
      success: true, 
      message: 'Authentication successful. Check console for refresh token.' 
    });
  } catch (error) {
    reply.code(500).send({ error: 'Authentication failed' });
  }
});
```

2. Acesse `http://localhost:3333/auth/google`
3. Complete o fluxo de autenticação do Google
4. Copie o `refresh_token` exibido no console
5. Adicione ao `.env` como `GOOGLE_REFRESH_TOKEN`
6. Remova os endpoints temporários

## Funcionalidades

### Criação de Eventos

- **Agendamentos únicos**: Um evento é criado automaticamente no Google Calendar
- **Agendamentos recorrentes**: Uma série de eventos é criada baseada na regra de recorrência
- **Somente online**: Links do Google Meet são gerados apenas para `tipoAtendimento: "online"`

### Templates Personalizáveis

Use as seguintes variáveis nos templates:

- `{{agendamentoId}}` - ID do agendamento
- `{{pacienteNome}}` - Nome do paciente
- `{{pacienteWhatsapp}}` - WhatsApp do paciente
- `{{pacienteEmail}}` - Email do paciente
- `{{profissionalNome}}` - Nome do profissional
- `{{convenioNome}}` - Nome do convênio
- `{{servicoNome}}` - Nome do serviço
- `{{recursoNome}}` - Nome do recurso
- `{{tipoAtendimento}}` - Tipo de atendimento
- `{{observacoes}}` - Observações adicionais

### Controle da Integração

- **ONLINE_ATIVO=false**: Desativa completamente a integração
- **ONLINE_ATIVO=true**: Ativa a integração para atendimentos online

## Estrutura de Arquivos

### Backend

#### Novos Arquivos
- `src/shared/services/GoogleCalendarService.ts` - Serviço principal da integração

#### Arquivos Modificados
- `prisma/schema.prisma` - Adicionado campo `urlMeet` na tabela `agendamentos`
- `src/core/domain/entities/Agendamento.ts` - Adicionado campo `urlMeet`
- `src/core/domain/repositories/IAgendamentosRepository.ts` - DTOs atualizados
- `src/core/application/use-cases/agendamento/CreateAgendamentoUseCase.ts` - Integração na criação
- `src/core/application/use-cases/agendamento/UpdateAgendamentoUseCase.ts` - Integração na atualização
- `src/shared/container/index.ts` - Registro do GoogleCalendarService

### Frontend

#### Arquivos Modificados
- `src/types/Agendamento.ts` - Adicionado campo `urlMeet`
- `src/components/agendamentos/DetalhesAgendamentoModal.tsx` - Exibe links do Meet
- `src/components/agendamentos/AtenderAgendamentoModal.tsx` - Exibe links do Meet
- `src/pages/agendamentos/AgendamentosPage.tsx` - Exibe links do Meet na tabela e cards

## Migração do Banco de Dados

Execute a migração para adicionar o campo `urlMeet`:

```sql
-- Migração para adicionar campo urlMeet
ALTER TABLE agendamentos ADD COLUMN url_meet VARCHAR(500);
```

Ou usando Prisma:

```bash
npx prisma db push
# ou
npx prisma migrate dev --name add_url_meet_to_agendamentos
```

## Teste da Integração

Use o método `testIntegration()` do `GoogleCalendarService` para verificar se a configuração está correta:

```typescript
const googleCalendarService = container.resolve(GoogleCalendarService);
const result = await googleCalendarService.testIntegration();
console.log(result);
```

## Fluxo de Funcionamento

### Criação de Agendamento Online

1. Usuário cria um agendamento com `tipoAtendimento: "online"`
2. Sistema cria o agendamento no banco de dados
3. `GoogleCalendarService` cria evento no Google Calendar com Google Meet
4. URL do Meet é salva no campo `urlMeet` do agendamento
5. Frontend exibe o link para acesso à reunião

### Atualização de Agendamento

1. Usuário atualiza dados do agendamento (data, horário, etc.)
2. Sistema atualiza o agendamento no banco
3. Se era online e continua online: atualiza evento no Google Calendar
4. Se mudou de presencial para online: cria novo evento com Meet
5. Se mudou de online para presencial: remove URL do Meet

### Tratamento de Erros

- Falhas na integração com Google Calendar **não impedem** a criação/atualização de agendamentos
- Erros são logados no console para debugging
- Sistema continua funcionando mesmo se a API do Google estiver indisponível

## Segurança

- Credenciais nunca são expostas no frontend
- Tokens são gerenciados automaticamente pelo serviço
- Apenas URLs públicas do Meet são armazenadas no banco
- Notificações automáticas são desabilitadas para preservar privacidade

## Troubleshooting

### Problemas Comuns

1. **Authentication failed (401)**
   - Verifique se o `GOOGLE_REFRESH_TOKEN` está correto
   - Refaça o fluxo de autenticação OAuth

2. **Calendar not found**
   - Verifique se o `GOOGLE_CALENDAR_ID` está correto
   - Use "primary" para o calendário principal

3. **API access denied (403)**
   - Verifique se a Google Calendar API está habilitada
   - Confirme as permissões do OAuth scope

4. **Meet links not generating**
   - Confirme que `tipoAtendimento` está como "online"
   - Verifique se a conta Google tem acesso ao Google Meet

### Debug

Para debugging detalhado, monitore os logs do console que incluem:
- Status de configuração da integração
- Tentativas de criação/atualização de eventos
- Mensagens de erro específicas da API do Google

### Status da Configuração

Verifique o status da integração:

```typescript
const googleCalendarService = container.resolve(GoogleCalendarService);
const status = googleCalendarService.getConfigStatus();
console.log(status);
```

## Limitações

- Suporte apenas a Google Calendar/Meet (não outros provedores)
- Não envia lembretes/notificações automáticas
- Requer configuração manual inicial com OAuth
- URLs de Meet expiram conforme políticas do Google

## Exemplo de Uso

```typescript
// Criar agendamento online que automaticamente gera Meet
const agendamento = await createAgendamentoUseCase.execute({
  pacienteId: "uuid-do-paciente",
  profissionalId: "uuid-do-profissional", 
  tipoAtendimento: "online", // Isto irá gerar um link do Meet
  servicoId: "uuid-do-servico",
  convenioId: "uuid-do-convenio",
  recursoId: "uuid-do-recurso",
  dataHoraInicio: new Date("2024-01-15T10:00:00.000Z")
});

// O agendamento retornado terá o campo urlMeet preenchido
console.log(agendamento.urlMeet); // https://meet.google.com/abc-defg-hij
```

---

**Nota**: Esta integração foi implementada seguindo as melhores práticas de segurança e não expõe credenciais sensíveis. Mantenha sempre suas credenciais do Google Cloud seguras e não as versione no código.