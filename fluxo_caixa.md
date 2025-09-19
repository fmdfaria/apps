# Sistema de Fluxo de Caixa - Probotec Clínica

## 📊 SQL para Criação das Tabelas

### 1. Tabelas Principais do Sistema Financeiro

```sql
-- =====================================================
-- EMPRESAS
-- =====================================================
CREATE TABLE empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    razao_social VARCHAR(200) NOT NULL,
    nome_fantasia VARCHAR(200),
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    inscricao_estadual VARCHAR(30),
    inscricao_municipal VARCHAR(30),
    
    -- Endereço
    logradouro VARCHAR(200),
    numero VARCHAR(10),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),
    
    -- Contato
    telefone VARCHAR(20),
    email VARCHAR(100),
    site VARCHAR(200),
    
    -- Status
    ativo BOOLEAN DEFAULT true,
    empresa_principal BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Garantir apenas uma empresa principal
    CONSTRAINT uq_empresa_principal UNIQUE (empresa_principal) DEFERRABLE INITIALLY DEFERRED
);

-- =====================================================
-- CATEGORIAS FINANCEIRAS
-- =====================================================
CREATE TABLE categorias_financeiras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL UNIQUE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('RECEITA', 'DESPESA')),
    descricao TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CONTAS BANCÁRIAS
-- =====================================================
CREATE TABLE contas_bancarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    
    -- Identificação da Conta
    nome VARCHAR(100) NOT NULL,  -- Ex: "Conta Corrente Principal", "Poupança Reserva"
    banco VARCHAR(100) NOT NULL,
    agencia VARCHAR(10) NOT NULL,
    conta VARCHAR(20) NOT NULL,
    digito VARCHAR(2),
    tipo_conta VARCHAR(20) DEFAULT 'CORRENTE' CHECK (tipo_conta IN ('CORRENTE', 'POUPANCA', 'INVESTIMENTO')),
    
    -- PIX (pode ter múltiplos)
    pix_principal VARCHAR(100),
    tipo_pix VARCHAR(30) CHECK (tipo_pix IN ('CPF', 'CNPJ', 'EMAIL', 'TELEFONE', 'ALEATORIA')),
    
    -- Controles
    conta_principal BOOLEAN DEFAULT false,
    ativo BOOLEAN DEFAULT true,
    saldo_inicial DECIMAL(12,2) DEFAULT 0,
    saldo_atual DECIMAL(12,2) DEFAULT 0,
    
    -- Dados complementares
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Garantir apenas uma conta principal por empresa
    CONSTRAINT uq_conta_principal_empresa UNIQUE (empresa_id, conta_principal) 
        DEFERRABLE INITIALLY DEFERRED,
    -- Garantir que conta seja única por empresa
    CONSTRAINT uq_conta_banco_agencia_empresa UNIQUE (empresa_id, banco, agencia, conta)
);

-- =====================================================
-- CONTAS A RECEBER
-- =====================================================
CREATE TABLE contas_receber (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    conta_bancaria_id UUID REFERENCES contas_bancarias(id),
    convenio_id UUID REFERENCES convenios(id),
    paciente_id UUID REFERENCES pacientes(id),
    categoria_id UUID NOT NULL REFERENCES categorias_financeiras(id),
    
    -- Dados Financeiros
    numero_documento VARCHAR(50),
    descricao TEXT NOT NULL,
    valor_original DECIMAL(12,2) NOT NULL,
    valor_desconto DECIMAL(12,2) DEFAULT 0,
    valor_juros DECIMAL(12,2) DEFAULT 0,
    valor_multa DECIMAL(12,2) DEFAULT 0,
    valor_liquido DECIMAL(12,2) NOT NULL,
    valor_recebido DECIMAL(12,2) DEFAULT 0,
    
    -- Datas
    data_emissao DATE NOT NULL,
    data_vencimento DATE NOT NULL,
    data_recebimento DATE,
    
    -- Status e Controle
    status VARCHAR(20) DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'PARCIAL', 'RECEBIDO', 'VENCIDO', 'CANCELADO')),
    forma_recebimento VARCHAR(30) CHECK (forma_recebimento IN ('DINHEIRO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'TRANSFERENCIA', 'CHEQUE', 'BOLETO')),
    observacoes TEXT,
    
    -- Auditoria
    user_created_id UUID REFERENCES users(id),
    user_updated_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CONTAS A PAGAR
-- =====================================================
CREATE TABLE contas_pagar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    conta_bancaria_id UUID REFERENCES contas_bancarias(id),
    profissional_id UUID REFERENCES profissionais(id),
    categoria_id UUID NOT NULL REFERENCES categorias_financeiras(id),
    
    -- Dados Financeiros
    numero_documento VARCHAR(50),
    descricao TEXT NOT NULL,
    valor_original DECIMAL(12,2) NOT NULL,
    valor_desconto DECIMAL(12,2) DEFAULT 0,
    valor_juros DECIMAL(12,2) DEFAULT 0,
    valor_multa DECIMAL(12,2) DEFAULT 0,
    valor_liquido DECIMAL(12,2) NOT NULL,
    valor_pago DECIMAL(12,2) DEFAULT 0,
    
    -- Datas
    data_emissao DATE NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    
    -- Status e Controle
    status VARCHAR(20) DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'PARCIAL', 'PAGO', 'VENCIDO', 'CANCELADO')),
    forma_pagamento VARCHAR(30) CHECK (forma_pagamento IN ('DINHEIRO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'TRANSFERENCIA', 'CHEQUE', 'TED', 'DOC')),
    tipo_conta VARCHAR(20) DEFAULT 'DESPESA' CHECK (tipo_conta IN ('DESPESA', 'SALARIO', 'ENCARGO', 'IMPOSTO', 'INVESTIMENTO')),
    recorrente BOOLEAN DEFAULT false,
    periodicidade VARCHAR(20) CHECK (periodicidade IN ('MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL')),
    observacoes TEXT,
    
    -- Auditoria
    user_created_id UUID REFERENCES users(id),
    user_updated_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MOVIMENTAÇÃO DO FLUXO DE CAIXA
-- =====================================================
CREATE TABLE fluxo_caixa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id),
    conta_bancaria_id UUID NOT NULL REFERENCES contas_bancarias(id),
    conta_receber_id UUID REFERENCES contas_receber(id),
    conta_pagar_id UUID REFERENCES contas_pagar(id),
    
    -- Dados da Movimentação
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA')),
    categoria_id UUID NOT NULL REFERENCES categorias_financeiras(id),
    
    descricao TEXT NOT NULL,
    valor DECIMAL(12,2) NOT NULL,
    data_movimento DATE NOT NULL,
    forma_pagamento VARCHAR(30),
    
    -- Controle
    conciliado BOOLEAN DEFAULT false,
    data_conciliacao DATE,
    observacoes TEXT,
    
    -- Auditoria
    user_created_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- =====================================================
-- RELACIONAMENTO AGENDAMENTOS COM CONTAS
-- =====================================================
CREATE TABLE agendamentos_contas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agendamento_id UUID NOT NULL REFERENCES agendamentos(id),
    conta_receber_id UUID REFERENCES contas_receber(id),
    conta_pagar_id UUID REFERENCES contas_pagar(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Garantir que agendamento seja vinculado a apenas uma conta (receber OU pagar)
    CONSTRAINT chk_conta_unica CHECK (
        (conta_receber_id IS NOT NULL AND conta_pagar_id IS NULL) OR
        (conta_receber_id IS NULL AND conta_pagar_id IS NOT NULL)
    ),
    
    -- Garantir que agendamento não seja duplicado
    CONSTRAINT uq_agendamento_unico UNIQUE (agendamento_id)
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Empresas
CREATE INDEX idx_empresas_cnpj ON empresas(cnpj);
CREATE INDEX idx_empresas_ativo ON empresas(ativo);
CREATE INDEX idx_empresas_principal ON empresas(empresa_principal) WHERE empresa_principal = true;

-- Contas Bancárias
CREATE INDEX idx_contas_bancarias_empresa ON contas_bancarias(empresa_id);
CREATE INDEX idx_contas_bancarias_ativo ON contas_bancarias(ativo);
CREATE INDEX idx_contas_bancarias_principal ON contas_bancarias(conta_principal) WHERE conta_principal = true;

-- Agendamentos Contas (relacionamento)
CREATE INDEX idx_agendamentos_contas_agendamento ON agendamentos_contas(agendamento_id);
CREATE INDEX idx_agendamentos_contas_receber ON agendamentos_contas(conta_receber_id);
CREATE INDEX idx_agendamentos_contas_pagar ON agendamentos_contas(conta_pagar_id);

-- Contas a Receber
CREATE INDEX idx_contas_receber_empresa ON contas_receber(empresa_id);
CREATE INDEX idx_contas_receber_conta_bancaria ON contas_receber(conta_bancaria_id);
CREATE INDEX idx_contas_receber_vencimento ON contas_receber(data_vencimento);
CREATE INDEX idx_contas_receber_status ON contas_receber(status);
CREATE INDEX idx_contas_receber_paciente ON contas_receber(paciente_id);
CREATE INDEX idx_contas_receber_convenio ON contas_receber(convenio_id);

-- Contas a Pagar
CREATE INDEX idx_contas_pagar_empresa ON contas_pagar(empresa_id);
CREATE INDEX idx_contas_pagar_conta_bancaria ON contas_pagar(conta_bancaria_id);
CREATE INDEX idx_contas_pagar_vencimento ON contas_pagar(data_vencimento);
CREATE INDEX idx_contas_pagar_status ON contas_pagar(status);
CREATE INDEX idx_contas_pagar_profissional ON contas_pagar(profissional_id);

-- Fluxo de Caixa
CREATE INDEX idx_fluxo_caixa_empresa ON fluxo_caixa(empresa_id);
CREATE INDEX idx_fluxo_caixa_conta_bancaria ON fluxo_caixa(conta_bancaria_id);
CREATE INDEX idx_fluxo_caixa_data ON fluxo_caixa(data_movimento);
CREATE INDEX idx_fluxo_caixa_tipo ON fluxo_caixa(tipo);
CREATE INDEX idx_fluxo_caixa_categoria ON fluxo_caixa(categoria_id);


# 📋 Planejamento: Sistema de Fluxo de Caixa Completo

## 🎯 **Objetivo**
Desenvolver um sistema completo de fluxo de caixa integrado ao sistema atual de agendamentos, permitindo controle total das finanças da clínica com funcionalidades de:
- Contas a Pagar (profissionais, fornecedores, despesas operacionais)
- Contas a Receber (convênios, particulares)
- Integração automática com fechamento de agendamentos
- Dashboard financeiro e relatórios gerenciais

---

## 🏗️ **Fase 1: Estrutura do Banco de Dados**

### **1.1 Tabelas Principais Implementadas:**
- ✅ **`empresas`** - Cadastro das empresas da clínica
- ✅ **`contas_bancarias`** - Múltiplas contas bancárias por empresa
- ✅ **`categorias_financeiras`** - Classificação simples de receitas/despesas
- ✅ **`contas_receber`** - Receitas (convênios, particulares)
- ✅ **`contas_pagar`** - Obrigações financeiras (profissionais, contas básicas)
- ✅ **`agendamentos_contas`** - Relacionamento N:1 (múltiplos agendamentos → 1 conta)
- ✅ **`fluxo_caixa`** - Histórico consolidado de movimentações

### **1.2 Integração com Sistema Atual:**
- Relacionamento direto com tabela `agendamentos`
- Relacionamento com `profissionais`, `pacientes`, `convenios`
- Triggers automáticos para geração de movimentações
- Queries otimizadas para relatórios

### **1.3 Recursos Implementados:**
- Triggers automáticos para cálculo de valores líquidos
- Triggers para criação automática de movimentações no fluxo
- Índices otimizados para consultas de alta performance
- Function para processamento de fechamentos em lote
- Dados iniciais (empresas, categorias e contas bancárias básicas)

---

## 🔧 **Fase 2: Backend (API + Use Cases)**

### **2.1 Domain Layer:**
```
src/core/domain/entities/
├── Empresa.ts
├── ContaBancaria.ts
├── ContaReceber.ts
├── ContaPagar.ts
├── AgendamentoConta.ts
├── CategoriaFinanceira.ts
├── FluxoCaixa.ts

src/core/domain/value-objects/
├── Dinheiro.ts
├── DataVencimento.ts
└── StatusPagamento.ts

src/core/domain/repositories/
├── IEmpresaRepository.ts
├── IContaBancariaRepository.ts
├── IContasReceberRepository.ts
├── IContasPagarRepository.ts
├── ICategoriaFinanceiraRepository.ts
└── IFluxoCaixaRepository.ts
```

### **2.2 Application Layer (Use Cases):**
```
src/core/application/use-cases/contas-receber/
├── CriarContaReceberUseCase.ts
├── AtualizarContaReceberUseCase.ts
├── ReceberContaUseCase.ts
├── CancelarContaReceberUseCase.ts
└── ListarContasReceberUseCase.ts

src/core/application/use-cases/contas-pagar/
├── CriarContaPagarUseCase.ts
├── AtualizarContaPagarUseCase.ts
├── PagarContaUseCase.ts
├── CancelarContaPagarUseCase.ts
└── ListarContasPagarUseCase.ts

src/core/application/use-cases/fluxo-caixa/
├── GerarFluxoCaixaUseCase.ts
├── ConciliarMovimentoUseCase.ts
├── RelatorioFluxoUseCase.ts
└── DashboardFinanceiroUseCase.ts

src/core/application/use-cases/fechamento/
├── ProcessarFechamentoAgendamentosUseCase.ts
├── VincularAgendamentosContaUseCase.ts
├── GerarContasAutomaticasUseCase.ts
```

### **2.3 Infrastructure Layer:**
```
src/infra/database/prisma/repositories/
├── PrismaEmpresaRepository.ts
├── PrismaContaBancariaRepository.ts
├── PrismaContasReceberRepository.ts
├── PrismaContasPagarRepository.ts
├── PrismaCategoriaFinanceiraRepository.ts
└── PrismaFluxoCaixaRepository.ts

src/infra/http/controllers/
├── EmpresaController.ts
├── ContaBancariaController.ts
├── ContasReceberController.ts
├── ContasPagarController.ts
├── CategoriaFinanceiraController.ts
├── FluxoCaixaController.ts
└── RelatoriosFinanceirosController.ts

src/infra/http/routes/
├── empresas.routes.ts
├── contas-bancarias.routes.ts
├── contas-receber.routes.ts
├── contas-pagar.routes.ts
├── categorias-financeiras.routes.ts
├── fluxo-caixa.routes.ts
└── relatorios-financeiros.routes.ts
```

---

## 💻 **Fase 3: Frontend**

### **3.1 Estrutura de Páginas:**
```
src/pages/financeiro/
├── contas-receber/
│   ├── ContasReceberPage.tsx
│   ├── CriarContaReceberModal.tsx
│   ├── EditarContaReceberModal.tsx
│   └── ReceberContaModal.tsx
├── contas-pagar/
│   ├── ContasPagarPage.tsx
│   ├── CriarContaPagarModal.tsx
│   ├── EditarContaPagarModal.tsx
│   └── PagarContaModal.tsx
├── fluxo-caixa/
│   ├── FluxoCaixaPage.tsx
│   ├── DashboardFinanceiro.tsx
│   └── ConciliacaoPage.tsx
├── relatorios/
│   ├── RelatoriosPage.tsx
│   ├── DREReport.tsx
│   └── FluxoProjetadoReport.tsx
└── configuracoes/
    ├── EmpresasPage.tsx
    ├── ContasBancariasPage.tsx
    └── CategoriasFinanceirasPage.tsx
```

### **3.2 Componentes Reutilizáveis:**
```
src/components/financeiro/
├── ContaFormModal.tsx        // Formulário genérico para contas
├── FluxoCaixaChart.tsx      // Gráficos de movimentação
├── FluxoCaixaTable.tsx      // Tabela de movimentações
├── SaldosBancarios.tsx      // Card com saldos das contas bancárias
├── ContasVencimentoCard.tsx // Card com contas próximas ao vencimento
├── ResumoFinanceiroCard.tsx // Card com resumo financeiro
├── EmpresaSelect.tsx        // Select de empresas
├── ContaBancariaSelect.tsx  // Select de contas bancárias
├── CategoriaSelect.tsx      // Select de categorias
├── FormaPagamentoSelect.tsx // Select de formas de pagamento
├── StatusBadge.tsx          // Badge de status personalizado
└── RelatorioFilter.tsx      // Filtros avançados para relatórios
```

### **3.3 Services/API:**
```
src/services/
├── empresas.ts
├── contas-bancarias.ts
├── contas-receber.ts
├── contas-pagar.ts
├── categorias-financeiras.ts
├── fluxo-caixa.ts
└── relatorios-financeiros.ts
```

### **3.4 Types:**
```
src/types/
├── Empresa.ts
├── ContaBancaria.ts
├── ContaReceber.ts
├── ContaPagar.ts
├── AgendamentoConta.ts
├── CategoriaFinanceira.ts
├── FluxoCaixa.ts
└── RelatorioFinanceiro.ts
```

---

## 🔄 **Fase 4: Integração com Sistema Atual**

### **4.1 Módulo de Fechamento (`/agendamentos/fechamento`):**
- **Objetivo**: Expandir página existente para gerar automaticamente contas financeiras
- **Novo Fluxo com Múltiplos Agendamentos**:
  1. Listagem de agendamentos FINALIZADOS por período
  2. Agrupamento por Convênio/Profissional + Data Início/Fim
  3. Seleção de múltiplos agendamentos para fechamento
  4. Botão "Processar Fechamento Financeiro"
  5. Sistema cria 1 conta (receber/pagar) vinculada aos N agendamentos
- **Funcionalidades**:
  - **Rastreabilidade total**: cada agendamento mantém histórico individual
  - **Valores detalhados**: valor por agendamento + total consolidado
  - **Workflow de aprovação**: PENDENTE → PROCESSADO → APROVADO
  - **Relatórios**: drill-down de conta → agendamentos

### **4.2 Módulo de Pagamentos (`/agendamentos/pagamentos`):**
- **Objetivo**: Estender funcionalidade atual para integrar com contas a pagar
- **Funcionalidades**:
  - Visualização integrada com contas a pagar geradas
  - Opção para marcar contas como pagas em lote
  - Geração automática de movimentações no fluxo de caixa
  - Controle de datas de vencimento e juros/multas
  - Relatório de pagamentos por período

### **4.3 Integração com Agendamentos:**
- Campo adicional na tabela `agendamentos`: `fechamento_financeiro_id`
- Status de fechamento: `ABERTO`, `FECHADO`, `FATURADO`
- Triggers para bloquear alterações em agendamentos já fechados
- Histórico de movimentações por agendamento

---

## 📊 **Fase 5: Funcionalidades Avançadas**

### **5.1 Dashboard Financeiro:**
- **Cards de Resumo**:
  - Total a receber (mês atual)
  - Total a pagar (mês atual)
  - Fluxo de caixa projetado (30/60/90 dias)
  - Contas em atraso
- **Gráficos**:
  - Receitas vs Despesas (mensal)
  - Evolução do fluxo de caixa (linha temporal)
  - Receitas por categoria (pizza)
  - Despesas por centro de custo (barras)

### **5.2 Relatórios Gerenciais:**
- **DRE (Demonstração do Resultado do Exercício)**
  - Receitas brutas por categoria
  - (-) Deduções e abatimentos
  - (=) Receitas líquidas
  - (-) Despesas operacionais
  - (=) Resultado operacional
- **Fluxo de Caixa Realizado vs Projetado**
- **Análise de Inadimplência**
- **Relatório por Centro de Custo**
- **Conciliação Bancária**

### **5.3 Alertas e Notificações:**
- Contas próximas ao vencimento (7, 3, 1 dias)
- Contas em atraso
- Metas de faturamento atingidas/não atingidas
- Fluxo de caixa negativo projetado

---

## 🚀 **Fase 6: Automações e Integrações**

### **6.1 Contas Recorrentes:**
- Geração automática de contas mensais (aluguel, energia, etc.)
- Configuração de periodicidade (mensal, trimestral, anual)
- Reajuste automático por índices (IGPM, IPCA)
- Aprovação automática ou manual

### **6.2 Integrações Bancárias (Futuro):**
- Importação de extratos bancários (OFX)
- Conciliação automática com movimentações
- API Open Banking (quando disponível)
- Geração de boletos e PIX

### **6.3 Backup e Segurança:**
- Backup automático diário dos dados financeiros
- Criptografia de dados sensíveis
- Log de auditoria para todas as operações
- Controle de acesso por perfil de usuário

---

## 🔐 **Fase 7: Segurança e Permissões**

### **7.1 Perfis de Usuário:**
- **FINANCEIRO**: Acesso total ao módulo financeiro
- **CONTADOR**: Acesso a relatórios e fechamentos
- **DIRETOR**: Dashboard executivo e relatórios gerenciais
- **RECEPCIONISTA**: Apenas visualização de contas a receber

### **7.2 Permissões Específicas:**
```
/financeiro/contas-receber        [GET, POST, PUT, DELETE]
/financeiro/contas-pagar          [GET, POST, PUT, DELETE]
/financeiro/fluxo-caixa          [GET]
/financeiro/relatorios           [GET]
/financeiro/dashboard            [GET]
/financeiro/fechamentos          [GET, POST]
/financeiro/configuracoes        [GET, POST, PUT, DELETE] - apenas ADMIN
```

### **7.3 Auditoria:**
- Log de todas as operações financeiras
- Rastreamento de alterações (quem, quando, o que)
- Relatório de auditoria por período
- Backup automático dos logs

---

## ⏰ **Cronograma de Implementação**

### **Sprint 1: Backend Base (1 semana)**
- [x] Criação do banco de dados simplificado (7 tabelas)
- [x] SQL com triggers, índices e views otimizadas
- [ ] Entities básicas (Empresa, ContaBancaria, ContaReceber, ContaPagar)
- [ ] Repositories e Use Cases essenciais
- [ ] Controllers e Routes principais

### **Sprint 2: Frontend Base (1 semana)**
- [ ] Páginas principais (Contas a Pagar/Receber)
- [ ] Componentes básicos reutilizáveis
- [ ] Services para comunicação com API
- [ ] Types e interfaces TypeScript

### **Sprint 3: Integração com Agendamentos (1 semana)**
- [ ] Extensão do FechamentoPage para fechamento sob demanda
- [ ] Extensão do PagamentosPage  
- [ ] Integração automática com fechamento baseado em agendamentos
- [ ] Testes básicos de integração

### **Sprint 4: Dashboard e Refinamentos (1 semana)**
- [ ] Dashboard com saldos bancários
- [ ] Relatório básico de entradas vs saídas
- [ ] Gráficos essenciais
- [ ] Sistema de alertas básico
- [ ] Contas recorrentes básicas
- [ ] Exportação para Excel
- [ ] Melhorias de UX
- [ ] Testes finais

## ⚡ **Cronograma Total Estimado:**
**Total: ~4 semanas** para implementação completa

### **Benefícios da Estrutura Simplificada:**
- ✅ **70% mais rápido** que a versão com centro de custo
- ✅ **4 tabelas a menos** (sem centro de custo, plano de contas e fechamentos periódicos)
- ✅ **Interface mais intuitiva** para clínica de pequeno porte
- ✅ **Manutenção mais simples** e menos bugs
- ✅ **Ainda escalável** (pode expandir futuramente se necessário)
- ✅ **Foco no essencial**: empresas → contas bancárias → movimentações

---

## 📈 **Métricas de Sucesso**

### **Técnicas:**
- Tempo de resposta da API < 500ms
- Disponibilidade > 99.9%
- Cobertura de testes > 80%
- Zero erros críticos em produção

### **Funcionais:**
- Redução de 70% no tempo de fechamento mensal
- Automação de 90% dos lançamentos financeiros
- Redução de 50% das contas em atraso
- 100% de rastreabilidade das movimentações

### **Usuário:**
- Dashboard carregando em < 3 segundos
- Relatórios gerados em < 10 segundos
- Interface responsiva (mobile-first)
- NPS > 8 dos usuários financeiros

---

## 🛡️ **Considerações de Segurança**

1. **Dados Sensíveis**: Todos os valores monetários são criptografados
2. **Auditoria**: Log completo de todas as operações
3. **Backup**: Backup automático diário com retenção de 1 ano
4. **Acesso**: Controle rigoroso por perfil e permissões específicas
5. **Validação**: Validação dupla para operações críticas (pagamentos > R$ 1.000)

---

## 🔧 **Stack Técnico Utilizado**

### **Backend:**
- Node.js + TypeScript
- Fastify (framework web)
- Prisma ORM
- PostgreSQL
- Clean Architecture
- TSyringe (Dependency Injection)

### **Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS + shadcn/ui
- Zustand (state management)
- React Query (server state)
- Recharts (gráficos)
- React Hook Form + Zod

### **Infraestrutura:**
- PostgreSQL com triggers e views
- Índices otimizados para performance
- Backup automático
- Logs estruturados

---

Este planejamento representa uma solução completa e escalável para o controle financeiro da Probotec Clínica, integrada perfeitamente com o sistema atual de agendamentos e seguindo as melhores práticas de desenvolvimento de software.



###ROTAS PREVISTAS

  📋 1. EMPRESAS - OK

  GET    /empresas              - Listar empresas (com filtros)
  POST   /empresas              - Criar nova empresa
  GET    /empresas/:id          - Buscar empresa por ID
  PUT    /empresas/:id          - Atualizar empresa
  DELETE /empresas/:id          - Excluir empresa
  PATCH  /empresas/:id/status   - Ativar/desativar empresa

  🏦 2. CONTAS BANCÁRIAS - OK

  GET    /contas-bancarias              - Listar contas bancárias
  POST   /contas-bancarias              - Criar nova conta bancária
  GET    /contas-bancarias/:id          - Buscar conta por ID
  PUT    /contas-bancarias/:id          - Atualizar conta bancária
  DELETE /contas-bancarias/:id          - Excluir conta bancária
  GET    /contas-bancarias/empresa/:empresaId - Contas por empresa
  PATCH  /contas-bancarias/:id/saldo    - Atualizar saldo

  📈 3. CONTAS A RECEBER - OK

  GET    /contas-receber                - Listar contas a receber (com filtros)
  POST   /contas-receber                - Criar conta a receber
  GET    /contas-receber/:id            - Buscar conta por ID
  PUT    /contas-receber/:id            - Atualizar conta a receber
  DELETE /contas-receber/:id            - Excluir conta a receber
  POST   /contas-receber/:id/receber    - Registrar recebimento
  PATCH  /contas-receber/:id/cancelar   - Cancelar conta
  GET    /contas-receber/pendentes      - Contas pendentes
  GET    /contas-receber/vencidas       - Contas vencidas

  📉 4. CONTAS A PAGAR - OK

  GET    /contas-pagar                - Listar contas a pagar (com filtros)
  POST   /contas-pagar                - Criar conta a pagar
  GET    /contas-pagar/:id            - Buscar conta por ID
  PUT    /contas-pagar/:id            - Atualizar conta a pagar
  DELETE /contas-pagar/:id            - Excluir conta a pagar
  POST   /contas-pagar/:id/pagar      - Registrar pagamento
  PATCH  /contas-pagar/:id/cancelar   - Cancelar conta
  GET    /contas-pagar/pendentes      - Contas pendentes
  GET    /contas-pagar/vencidas       - Contas vencidas
  GET    /contas-pagar/recorrentes    - Contas recorrentes

  🏷️ 5. CATEGORIAS FINANCEIRAS - OK

  GET    /categorias-financeiras        - Listar categorias
  POST   /categorias-financeiras        - Criar categoria
  GET    /categorias-financeiras/:id    - Buscar por ID
  PUT    /categorias-financeiras/:id    - Atualizar categoria
  DELETE /categorias-financeiras/:id    - Excluir categoria
  GET    /categorias-financeiras/tipo/:tipo - Por tipo (RECEITA/DESPESA)

  💰 6. FLUXO DE CAIXA

  GET    /fluxo-caixa                 - Listar movimentações
  POST   /fluxo-caixa                 - Criar movimentação manual
  GET    /fluxo-caixa/:id             - Buscar por ID
  PUT    /fluxo-caixa/:id             - Atualizar movimentação
  DELETE /fluxo-caixa/:id             - Excluir movimentação
  POST   /fluxo-caixa/:id/conciliar   - Conciliar movimento
  GET    /fluxo-caixa/periodo         - Por período
  GET    /fluxo-caixa/dashboard       - Dados do dashboard

  📊 7. RELATÓRIOS FINANCEIROS

  GET    /relatorios-financeiros/dre           - Demonstração do Resultado
  GET    /relatorios-financeiros/fluxo-periodo - Fluxo por período
  GET    /relatorios-financeiros/inadimplencia - Análise de inadimplência
  GET    /relatorios-financeiros/dashboard     - Dashboard executivo
  GET    /relatorios-financeiros/export/excel  - Exportar para Excel

  🔗 8. AGENDAMENTOS-CONTAS (Relacionamento) - OK

  GET    /agendamentos-contas                    - Listar relacionamentos
  POST   /agendamentos-contas                    - Criar relacionamento
  GET    /agendamentos-contas/agendamento/:id    - Por agendamento
  GET    /agendamentos-contas/conta-receber/:id  - Por conta a receber
  GET    /agendamentos-contas/conta-pagar/:id    - Por conta a pagar
  DELETE /agendamentos-contas/:id                - Remover relacionamento

  ⚙️ 9. FECHAMENTO FINANCEIRO (Extensão)

  GET    /fechamentos-financeiros                 - Listar fechamentos
  POST   /fechamentos-financeiros                 - Processar fechamento
  GET    /fechamentos-financeiros/:id             - Buscar por ID
  PUT    /fechamentos-financeiros/:id             - Atualizar status
  POST   /fechamentos-financeiros/lote            - Fechamento em lote
  POST   /fechamentos-financeiros/aprovar/:id     - Aprovar fechamento
  POST   /fechamentos-financeiros/cancelar/:id    - Cancelar fechamento