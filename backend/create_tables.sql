-- Probotec Clinica Database Creation Script
-- Generated from Prisma Schema (Updated Version)

-- Create enum types
CREATE TYPE user_type AS ENUM ('ADMIN', 'RECEPCIONISTA', 'PROFISSIONAL', 'PACIENTE');

-- Create tables in dependency order

-- 1. Especialidades
CREATE TABLE especialidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);

-- 2. Conselhos Profissionais
CREATE TABLE conselhos_profissionais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sigla VARCHAR(10) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);

-- 3. Convenios
CREATE TABLE convenios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);

-- 4. Servicos (updated with convenio_id)
CREATE TABLE servicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    duracao_minutos INTEGER NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    percentual_clinica DECIMAL(5,2),
    percentual_profissional DECIMAL(5,2),
    procedimento_primeiro_atendimento VARCHAR(100),
    procedimento_demais_atendimentos VARCHAR(100),
    convenio_id UUID REFERENCES convenios(id) ON DELETE NO ACTION,
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW(),
    UNIQUE(nome, duracao_minutos)
);

-- 5. Recursos
CREATE TABLE recursos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);

-- 6. Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    tipo user_type NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    profissional_id UUID,
    paciente_id UUID,
    criado_em TIMESTAMPTZ(6) DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ(6) DEFAULT NOW(),
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMPTZ(6),
    email_confirmation_token VARCHAR(255),
    email_confirmed BOOLEAN DEFAULT FALSE
);

-- 7. Profissionais
CREATE TABLE profissionais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(150) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    cnpj VARCHAR(18),
    razao_social VARCHAR(150),
    email VARCHAR(100) UNIQUE NOT NULL,
    whatsapp VARCHAR(20),
    logradouro VARCHAR(100),
    numero VARCHAR(10),
    complemento VARCHAR(50),
    bairro VARCHAR(50),
    cidade VARCHAR(50),
    estado VARCHAR(2),
    cep VARCHAR(10),
    comprovante_endereco TEXT,
    conselho_id UUID REFERENCES conselhos_profissionais(id) ON DELETE NO ACTION,
    numero_conselho VARCHAR(30),
    comprovante_registro TEXT,
    banco VARCHAR(100),
    tipo_conta VARCHAR(20),
    agencia VARCHAR(10),
    conta_numero VARCHAR(15),
    conta_digito VARCHAR(2),
    pix VARCHAR(100),
    tipo_pix VARCHAR(30),
    comprovante_bancario TEXT,
    user_id UUID,
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);

-- 8. Pacientes
CREATE TABLE pacientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_completo VARCHAR(150) NOT NULL,
    email VARCHAR(100) UNIQUE,
    whatsapp VARCHAR(20),
    cpf VARCHAR(14) UNIQUE NOT NULL,
    data_nascimento DATE,
    tipo_servico VARCHAR(20) NOT NULL,
    convenio_id UUID REFERENCES convenios(id) ON DELETE NO ACTION,
    numero_carteirinha VARCHAR(50),
    data_pedido_medico DATE,
    crm VARCHAR(20),
    cbo VARCHAR(20),
    cid VARCHAR(20),
    user_id UUID,
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);

-- 9. Refresh Tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ(6) NOT NULL,
    criado_em TIMESTAMPTZ(6) DEFAULT NOW(),
    ip VARCHAR(50),
    user_agent TEXT
);

-- 10. Profissionais Especialidades (Many-to-many)
CREATE TABLE profissionais_especialidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profissional_id UUID NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
    especialidade_id UUID NOT NULL REFERENCES especialidades(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW(),
    UNIQUE(profissional_id, especialidade_id)
);

-- 11. Profissionais Servicos (Many-to-many)
CREATE TABLE profissionais_servicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profissional_id UUID NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
    servico_id UUID NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW(),
    UNIQUE(profissional_id, servico_id)
);

-- 12. Precos Servicos Profissionais
CREATE TABLE precos_servicos_profissionais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profissional_id UUID NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
    servico_id UUID NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
    preco_profissional DECIMAL(10,2),
    preco_clinica DECIMAL(10,2),
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW(),
    UNIQUE(profissional_id, servico_id)
);

-- 13. Precos Particulares
CREATE TABLE precos_particulares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    servico_id UUID NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
    preco DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW(),
    UNIQUE(paciente_id, servico_id)
);

-- 14. Agendamentos
CREATE TABLE agendamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    profissional_id UUID NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
    tipo_atendimento VARCHAR(20) NOT NULL,
    recurso_id UUID NOT NULL REFERENCES recursos(id) ON DELETE NO ACTION,
    convenio_id UUID NOT NULL REFERENCES convenios(id) ON DELETE NO ACTION,
    servico_id UUID NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
    data_hora_inicio TIMESTAMPTZ(6) NOT NULL,
    data_hora_fim TIMESTAMPTZ(6) NOT NULL,
    cod_liberacao VARCHAR(50),
    status_cod_liberacao VARCHAR(30),
    data_cod_liberacao TIMESTAMPTZ(6),
    status VARCHAR(20) DEFAULT 'agendamento',
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);

-- 15. Disponibilidades Profissionais
CREATE TABLE disponibilidades_profissionais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profissional_id UUID NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
    dia_semana SMALLINT,
    data_especifica DATE,
    hora_inicio TIME(6) NOT NULL,
    hora_fim TIME(6) NOT NULL,
    observacao TEXT,
    tipo VARCHAR(20) DEFAULT 'disponivel',
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);

-- 16. Contratos Profissionais
CREATE TABLE contratos_profissionais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profissional_id UUID NOT NULL REFERENCES profissionais(id) ON DELETE CASCADE,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    arquivo_contrato TEXT,
    observacao TEXT,
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);

-- 17. Adendos Contratos
CREATE TABLE adendos_contratos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contrato_id UUID NOT NULL REFERENCES contratos_profissionais(id) ON DELETE CASCADE,
    data_adendo DATE NOT NULL,
    arquivo_adendo TEXT,
    descricao TEXT,
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);

-- 18. Atendimentos Paciente Servico
CREATE TABLE atendimentos_paciente_servico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    servico_id UUID NOT NULL REFERENCES servicos(id) ON DELETE CASCADE,
    atendimentos_concluidos INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW(),
    UNIQUE(paciente_id, servico_id)
);

-- 19. Evolucoes Pacientes
CREATE TABLE evolucoes_pacientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    agendamento_id UUID REFERENCES agendamentos(id),
    data_evolucao DATE NOT NULL,
    objetivo_sessao TEXT,
    descricao_evolucao TEXT,
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);

-- 20. Anexos
CREATE TABLE anexos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entidade_id UUID NOT NULL,
    bucket VARCHAR(100) NOT NULL,
    nome_arquivo VARCHAR(255) NOT NULL,
    descricao TEXT,
    criado_por UUID,
    url TEXT,
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX idx_profissionais_cpf ON profissionais(cpf);
CREATE INDEX idx_profissionais_email ON profissionais(email);
CREATE INDEX idx_pacientes_cpf ON pacientes(cpf);
CREATE INDEX idx_pacientes_email ON pacientes(email);
CREATE INDEX idx_agendamentos_data_hora_inicio ON agendamentos(data_hora_inicio);
CREATE INDEX idx_agendamentos_paciente_id ON agendamentos(paciente_id);
CREATE INDEX idx_agendamentos_profissional_id ON agendamentos(profissional_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tipo ON users(tipo);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Add triggers for updated_at columns (optional, if you want automatic timestamp updates)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to all tables with updated_at columns
CREATE TRIGGER update_especialidades_updated_at BEFORE UPDATE ON especialidades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conselhos_profissionais_updated_at BEFORE UPDATE ON conselhos_profissionais FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_convenios_updated_at BEFORE UPDATE ON convenios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_servicos_updated_at BEFORE UPDATE ON servicos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recursos_updated_at BEFORE UPDATE ON recursos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profissionais_updated_at BEFORE UPDATE ON profissionais FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pacientes_updated_at BEFORE UPDATE ON pacientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profissionais_especialidades_updated_at BEFORE UPDATE ON profissionais_especialidades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profissionais_servicos_updated_at BEFORE UPDATE ON profissionais_servicos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_precos_servicos_profissionais_updated_at BEFORE UPDATE ON precos_servicos_profissionais FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_precos_particulares_updated_at BEFORE UPDATE ON precos_particulares FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agendamentos_updated_at BEFORE UPDATE ON agendamentos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_disponibilidades_profissionais_updated_at BEFORE UPDATE ON disponibilidades_profissionais FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contratos_profissionais_updated_at BEFORE UPDATE ON contratos_profissionais FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_adendos_contratos_updated_at BEFORE UPDATE ON adendos_contratos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_atendimentos_paciente_servico_updated_at BEFORE UPDATE ON atendimentos_paciente_servico FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_evolucoes_pacientes_updated_at BEFORE UPDATE ON evolucoes_pacientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_anexos_updated_at BEFORE UPDATE ON anexos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();