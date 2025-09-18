-- =====================================================
-- ESQUEMA SIMPLE PARA NOTAS DE CRÉDITO
-- =====================================================

-- 1. Crear tabla de notas de crédito
CREATE TABLE IF NOT EXISTS public.notas_credito (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  numero_nota integer NOT NULL,
  cliente text NOT NULL,
  motivo text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric NOT NULL DEFAULT 0,
  numero_factura_original text,
  observaciones text,
  venta_original_id uuid,
  fecha timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT notas_credito_pkey PRIMARY KEY (id),
  CONSTRAINT notas_credito_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT notas_credito_venta_original_fkey FOREIGN KEY (venta_original_id) REFERENCES public.ventas(id) ON DELETE SET NULL
);

-- 2. Crear índices
CREATE INDEX IF NOT EXISTS idx_notas_credito_user_id ON public.notas_credito(user_id);
CREATE INDEX IF NOT EXISTS idx_notas_credito_fecha ON public.notas_credito(fecha);
CREATE INDEX IF NOT EXISTS idx_notas_credito_cliente ON public.notas_credito(cliente);
CREATE INDEX IF NOT EXISTS idx_notas_credito_numero ON public.notas_credito(numero_nota);

-- 3. Habilitar RLS
ALTER TABLE public.notas_credito ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas RLS
CREATE POLICY "Users can view own notas_credito" ON public.notas_credito FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notas_credito" ON public.notas_credito FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notas_credito" ON public.notas_credito FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notas_credito" ON public.notas_credito FOR DELETE USING (auth.uid() = user_id);

-- 5. Agregar comentario
COMMENT ON TABLE public.notas_credito IS 'Tabla de notas de crédito';
