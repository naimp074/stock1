-- Script para agregar la columna 'unidad' a la tabla productos
-- Ejecutar en Supabase SQL Editor

-- Agregar columna unidad a productos
ALTER TABLE public.productos 
ADD COLUMN IF NOT EXISTS unidad text NOT NULL DEFAULT 'unidad';

-- Actualizar productos existentes que puedan tener NULL
UPDATE public.productos 
SET unidad = 'unidad' 
WHERE unidad IS NULL;

-- Agregar comentario a la columna
COMMENT ON COLUMN public.productos.unidad IS 'Unidad de medida del producto (kg, L, m, unidad, etc.)';

-- Verificar que se agregó correctamente
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'productos' AND column_name = 'unidad';
