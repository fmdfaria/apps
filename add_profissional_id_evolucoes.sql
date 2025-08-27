-- SQL para adicionar campo profissional_id à tabela evolucoes_pacientes
-- Execute este script no seu banco PostgreSQL

-- 1. Adicionar coluna profissional_id à tabela evolucoes_pacientes
ALTER TABLE evolucoes_pacientes 
ADD COLUMN profissional_id UUID;

-- 2. Adicionar constraint de foreign key
ALTER TABLE evolucoes_pacientes 
ADD CONSTRAINT fk_evolucoes_pacientes_profissional_id 
FOREIGN KEY (profissional_id) REFERENCES profissionais(id) 
ON DELETE SET NULL ON UPDATE NO ACTION;

-- 3. Criar índice para performance
CREATE INDEX idx_evolucoes_pacientes_profissional_id ON evolucoes_pacientes(profissional_id);

-- 4. Comentário da coluna para documentação
COMMENT ON COLUMN evolucoes_pacientes.profissional_id IS 'ID do profissional que criou/é responsável pela evolução';

-- 5. (OPCIONAL) Script para popular profissional_id em evoluções existentes
-- baseado nos agendamentos relacionados (apenas para evoluções com agendamento_id)
UPDATE evolucoes_pacientes 
SET profissional_id = a.profissional_id
FROM agendamentos a
WHERE evolucoes_pacientes.agendamento_id = a.id 
  AND evolucoes_pacientes.profissional_id IS NULL
  AND evolucoes_pacientes.agendamento_id IS NOT NULL;

-- Verificar quantos registros foram atualizados
-- SELECT COUNT(*) FROM evolucoes_pacientes WHERE profissional_id IS NOT NULL;