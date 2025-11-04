-- Script para remover constraint que impede agendamento ter conta_receber_id E conta_pagar_id
--
-- Motivo: Um agendamento pode ter AMBOS (fechamento de recebimento E pagamento)
--
-- Execute este script no banco de dados PostgreSQL

-- Verificar se a constraint existe
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'chk_conta_unica'
  AND conrelid = 'agendamentos_contas'::regclass;

-- Remover a constraint
ALTER TABLE agendamentos_contas
DROP CONSTRAINT IF EXISTS chk_conta_unica;

-- Verificar se foi removida
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'chk_conta_unica'
  AND conrelid = 'agendamentos_contas'::regclass;

-- Resultado esperado: nenhuma linha retornada na última consulta
