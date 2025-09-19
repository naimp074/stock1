-- Script para agregar la columna 'numero_factura' a la tabla pagos_corrientes
-- Ejecutar en Supabase SQL Editor

-- Agregar columna numero_factura a pagos_corrientes
ALTER TABLE public.pagos_corrientes 
ADD COLUMN IF NOT EXISTS numero_factura integer;

-- Agregar índice para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_pagos_corrientes_numero_factura ON public.pagos_corrientes(numero_factura);

-- Agregar comentario a la columna
COMMENT ON COLUMN public.pagos_corrientes.numero_factura IS 'Número de factura correlativo con ventas';

-- Verificar que se agregó correctamente
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'pagos_corrientes' AND column_name = 'numero_factura';
