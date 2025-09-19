-- Script para agregar la columna 'items' a la tabla pagos_corrientes
-- Ejecutar en Supabase SQL Editor

-- Agregar columna items a pagos_corrientes
ALTER TABLE public.pagos_corrientes 
ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb;

-- Agregar comentario a la columna
COMMENT ON COLUMN public.pagos_corrientes.items IS 'Items/productos comprados en este movimiento';

-- Verificar que se agregó correctamente
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'pagos_corrientes' AND column_name = 'items';
