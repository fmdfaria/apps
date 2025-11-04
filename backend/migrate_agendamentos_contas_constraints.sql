-- =====================================================
-- Migração: Permitir dois registros por agendamento
-- =====================================================
--
-- Objetivo: Permitir que um agendamento tenha DOIS registros:
--   1. agendamentoId + conta_receber_id (NULL em conta_pagar_id)
--   2. agendamentoId + conta_pagar_id (NULL em conta_receber_id)
--
-- Mantém constraint chk_conta_unica (cada linha tem apenas UM tipo de conta)
--
-- =====================================================

BEGIN;

-- 1. Verificar constraints atuais
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'agendamentos_contas'::regclass
  AND conname IN ('uq_agendamento_unico', 'chk_conta_unica')
ORDER BY conname;

-- 2. Remover constraint única antiga (impedia múltiplos registros por agendamento)
ALTER TABLE agendamentos_contas
DROP CONSTRAINT IF EXISTS uq_agendamento_unico;

-- 3. Adicionar constraints compostas (permite múltiplos registros, mas não duplicados do mesmo tipo)
ALTER TABLE agendamentos_contas
ADD CONSTRAINT uq_agendamento_conta_receber
UNIQUE (agendamento_id, conta_receber_id);

ALTER TABLE agendamentos_contas
ADD CONSTRAINT uq_agendamento_conta_pagar
UNIQUE (agendamento_id, conta_pagar_id);

-- 4. Verificar novas constraints
SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'agendamentos_contas'::regclass
  AND conname IN ('uq_agendamento_conta_receber', 'uq_agendamento_conta_pagar', 'chk_conta_unica')
ORDER BY conname;

-- 5. Teste: Ver registros atuais
SELECT
  id,
  agendamento_id,
  conta_receber_id IS NOT NULL AS tem_receber,
  conta_pagar_id IS NOT NULL AS tem_pagar,
  CASE
    WHEN conta_receber_id IS NOT NULL AND conta_pagar_id IS NOT NULL THEN 'AMBOS (PROBLEMA!)'
    WHEN conta_receber_id IS NOT NULL THEN 'RECEBER'
    WHEN conta_pagar_id IS NOT NULL THEN 'PAGAR'
    ELSE 'NENHUM'
  END AS tipo_conta
FROM agendamentos_contas
ORDER BY created_at DESC
LIMIT 20;

COMMIT;

-- =====================================================
-- Resultado Esperado:
-- =====================================================
-- ✅ uq_agendamento_unico REMOVIDA
-- ✅ uq_agendamento_conta_receber CRIADA
-- ✅ uq_agendamento_conta_pagar CRIADA
-- ✅ chk_conta_unica MANTIDA (garante cada linha tem apenas um tipo)
-- =====================================================
