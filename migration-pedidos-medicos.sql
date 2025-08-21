-- Script SQL para migração dos dados de Pedidos Médicos
-- Execute este script APÓS o deploy do backend e ANTES de remover as colunas da tabela pacientes

-- 1. Migrar dados existentes da tabela pacientes para pacientes_pedidos
INSERT INTO pacientes_pedidos (
  id,
  data_pedido_medico,
  crm,
  cbo,
  cid,
  auto_pedidos,
  descricao,
  servico_id,
  paciente_id,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid() as id,
  p.data_pedido_medico,
  p.crm,
  p.cbo,
  p.cid,
  p.auto_pedidos,
  p.descricao,
  NULL as servico_id, -- Será NULL inicialmente pois não temos vinculo com serviços ainda
  p.id as paciente_id,
  now() as created_at,
  now() as updated_at
FROM pacientes p
WHERE 
  -- Só migra registros que têm pelo menos um campo de pedido médico preenchido
  p.data_pedido_medico IS NOT NULL 
  OR p.crm IS NOT NULL 
  OR p.cbo IS NOT NULL 
  OR p.cid IS NOT NULL 
  OR p.descricao IS NOT NULL;

-- 2. Verificar quantos registros foram migrados
SELECT 
  COUNT(*) as total_migrados,
  COUNT(CASE WHEN data_pedido_medico IS NOT NULL THEN 1 END) as com_data_pedido,
  COUNT(CASE WHEN crm IS NOT NULL THEN 1 END) as com_crm,
  COUNT(CASE WHEN cbo IS NOT NULL THEN 1 END) as com_cbo,
  COUNT(CASE WHEN cid IS NOT NULL THEN 1 END) as com_cid,
  COUNT(CASE WHEN descricao IS NOT NULL THEN 1 END) as com_descricao
FROM pacientes_pedidos;

-- 3. APENAS APÓS VERIFICAR QUE A MIGRAÇÃO FUNCIONOU CORRETAMENTE,
-- remover as colunas antigas da tabela pacientes (CUIDADO - IRREVERSÍVEL)
-- DESCOMENTE as linhas abaixo apenas quando tiver certeza:

-- ALTER TABLE pacientes DROP COLUMN IF EXISTS data_pedido_medico;
-- ALTER TABLE pacientes DROP COLUMN IF EXISTS crm;
-- ALTER TABLE pacientes DROP COLUMN IF EXISTS cbo;
-- ALTER TABLE pacientes DROP COLUMN IF EXISTS cid;
-- ALTER TABLE pacientes DROP COLUMN IF EXISTS auto_pedidos;
-- ALTER TABLE pacientes DROP COLUMN IF EXISTS descricao;

-- 4. Verificar se ainda há referências às colunas removidas no código
-- Pesquise no código por: dataPedidoMedico, crm, cbo, cid, autoPedidos, descricao
-- relacionados à tabela pacientes

-- 5. Opcionalmente, você pode executar um VACUUM para recuperar espaço:
-- VACUUM ANALYZE pacientes;
-- VACUUM ANALYZE pacientes_pedidos;

-- 6. Verificar dados após migração
SELECT 
  'pacientes' as tabela,
  COUNT(*) as total_registros
FROM pacientes
UNION ALL
SELECT 
  'pacientes_pedidos' as tabela,
  COUNT(*) as total_registros
FROM pacientes_pedidos;