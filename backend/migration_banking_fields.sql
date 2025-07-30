-- Migration: Update banking fields in profissionais table
-- Changes:
-- - Add tipo_conta column
-- - Rename conta to conta_numero  
-- - Add conta_digito column
-- - Adjust agencia size to VARCHAR(10)
-- - Adjust conta_numero size to VARCHAR(15)

-- Database: bd_probotec > public

BEGIN;

-- Step 1: Add new columns
ALTER TABLE public.profissionais 
ADD COLUMN tipo_conta VARCHAR(20),
ADD COLUMN conta_numero VARCHAR(15),
ADD COLUMN conta_digito VARCHAR(2);

-- Step 2: Migrate existing data from 'conta' to 'conta_numero'
-- This assumes existing 'conta' field contains the full account number
UPDATE public.profissionais 
SET conta_numero = conta 
WHERE conta IS NOT NULL;

-- Step 3: Adjust agencia column size (if current data fits)
-- First check if all existing agencia values fit in 10 characters
DO $$ 
BEGIN
    -- Check for agencia values longer than 10 characters
    IF EXISTS (
        SELECT 1 FROM public.profissionais 
        WHERE agencia IS NOT NULL 
        AND LENGTH(agencia) > 10
    ) THEN
        RAISE NOTICE 'WARNING: Some agencia values are longer than 10 characters. Please review before proceeding.';
        -- Uncomment the line below if you want to stop the migration
        -- RAISE EXCEPTION 'Migration stopped due to data length issues';
    END IF;
    
    -- Modify agencia column size
    ALTER TABLE public.profissionais 
    ALTER COLUMN agencia TYPE VARCHAR(10);
END $$;

-- Step 4: Drop the old 'conta' column
ALTER TABLE public.profissionais 
DROP COLUMN conta;

-- Step 5: Add helpful comments to columns
COMMENT ON COLUMN public.profissionais.banco IS 'Nome ou código do banco';
COMMENT ON COLUMN public.profissionais.tipo_conta IS 'Tipo da conta: CORRENTE, POUPANCA, etc.';
COMMENT ON COLUMN public.profissionais.agencia IS 'Número da agência (sem dígito)';
COMMENT ON COLUMN public.profissionais.conta_numero IS 'Número da conta (sem dígito)';
COMMENT ON COLUMN public.profissionais.conta_digito IS 'Dígito verificador da conta';

COMMIT;

-- Verification queries (run after migration):
-- 
-- 1. Check new column structure:
-- SELECT column_name, data_type, character_maximum_length, is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'profissionais' 
-- AND column_name IN ('banco', 'tipo_conta', 'agencia', 'conta_numero', 'conta_digito')
-- ORDER BY column_name;
--
-- 2. Check data migration:
-- SELECT id, nome, banco, tipo_conta, agencia, conta_numero, conta_digito
-- FROM public.profissionais 
-- WHERE banco IS NOT NULL OR agencia IS NOT NULL OR conta_numero IS NOT NULL
-- LIMIT 10;
--
-- 3. Verify old 'conta' column is gone:
-- SELECT column_name 
-- FROM information_schema.columns 
-- WHERE table_name = 'profissionais' AND column_name = 'conta';

-- Example of how to populate tipo_conta after migration:
-- UPDATE public.profissionais 
-- SET tipo_conta = 'CORRENTE' 
-- WHERE conta_numero IS NOT NULL AND tipo_conta IS NULL;