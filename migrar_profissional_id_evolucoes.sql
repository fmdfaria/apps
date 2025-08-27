-- Script de migração para popular o campo profissional_id em evoluções existentes
-- Execute APÓS executar o script add_profissional_id_evolucoes.sql

-- Verificar estado antes da migração
SELECT 
  'Antes da migração:' as status,
  COUNT(*) as total_evolucoes,
  COUNT(CASE WHEN profissional_id IS NOT NULL THEN 1 END) as com_profissional,
  COUNT(CASE WHEN profissional_id IS NULL THEN 1 END) as sem_profissional,
  COUNT(CASE WHEN agendamento_id IS NOT NULL THEN 1 END) as com_agendamento
FROM evolucoes_pacientes;

-- Migração: Popular profissional_id baseado nos agendamentos
-- Para evoluções que têm agendamento_id, usar o profissional do agendamento
UPDATE evolucoes_pacientes 
SET profissional_id = a.profissional_id,
    updated_at = NOW()
FROM agendamentos a
WHERE evolucoes_pacientes.agendamento_id = a.id 
  AND evolucoes_pacientes.profissional_id IS NULL
  AND evolucoes_pacientes.agendamento_id IS NOT NULL;

-- Verificar resultados da migração
SELECT 
  'Após a migração:' as status,
  COUNT(*) as total_evolucoes,
  COUNT(CASE WHEN profissional_id IS NOT NULL THEN 1 END) as com_profissional,
  COUNT(CASE WHEN profissional_id IS NULL THEN 1 END) as sem_profissional,
  COUNT(CASE WHEN agendamento_id IS NOT NULL THEN 1 END) as com_agendamento,
  COUNT(CASE WHEN agendamento_id IS NULL AND profissional_id IS NULL THEN 1 END) as standalone_sem_profissional
FROM evolucoes_pacientes;

-- Relatório detalhado
SELECT 
  'Relatório detalhado:' as titulo,
  CASE 
    WHEN agendamento_id IS NOT NULL AND profissional_id IS NOT NULL THEN 'Vinculada com profissional'
    WHEN agendamento_id IS NOT NULL AND profissional_id IS NULL THEN 'Vinculada SEM profissional'
    WHEN agendamento_id IS NULL AND profissional_id IS NOT NULL THEN 'Standalone com profissional'
    WHEN agendamento_id IS NULL AND profissional_id IS NULL THEN 'Standalone SEM profissional'
  END as tipo_evolucao,
  COUNT(*) as quantidade
FROM evolucoes_pacientes
GROUP BY 
  CASE 
    WHEN agendamento_id IS NOT NULL AND profissional_id IS NOT NULL THEN 'Vinculada com profissional'
    WHEN agendamento_id IS NOT NULL AND profissional_id IS NULL THEN 'Vinculada SEM profissional'
    WHEN agendamento_id IS NULL AND profissional_id IS NOT NULL THEN 'Standalone com profissional'
    WHEN agendamento_id IS NULL AND profissional_id IS NULL THEN 'Standalone SEM profissional'
  END
ORDER BY quantidade DESC;