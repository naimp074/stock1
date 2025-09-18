-- =====================================================
-- ESQUEMA SOLO PARA NOTAS DE CRÉDITO
-- =====================================================
-- Ejecuta solo esto si ya tienes las otras tablas

-- =====================================================
-- 1. TABLA DE NOTAS DE CRÉDITO
-- =====================================================
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

-- =====================================================
-- 2. ÍNDICES PARA NOTAS DE CRÉDITO
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_notas_credito_user_id ON public.notas_credito(user_id);
CREATE INDEX IF NOT EXISTS idx_notas_credito_fecha ON public.notas_credito(fecha);
CREATE INDEX IF NOT EXISTS idx_notas_credito_cliente ON public.notas_credito(cliente);
CREATE INDEX IF NOT EXISTS idx_notas_credito_numero ON public.notas_credito(numero_nota);

-- =====================================================
-- 3. TRIGGER PARA UPDATED_AT (solo si no existe)
-- =====================================================
-- Verificar si la función existe, si no, crearla
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    END IF;
END
$$;

-- Crear trigger solo si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_notas_credito_updated_at') THEN
        CREATE TRIGGER update_notas_credito_updated_at 
        BEFORE UPDATE ON public.notas_credito 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- =====================================================
-- 4. HABILITAR RLS PARA NOTAS DE CRÉDITO
-- =====================================================
ALTER TABLE public.notas_credito ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. POLÍTICAS RLS PARA NOTAS DE CRÉDITO
-- =====================================================
-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view own notas_credito" ON public.notas_credito;
DROP POLICY IF EXISTS "Users can insert own notas_credito" ON public.notas_credito;
DROP POLICY IF EXISTS "Users can update own notas_credito" ON public.notas_credito;
DROP POLICY IF EXISTS "Users can delete own notas_credito" ON public.notas_credito;

-- Crear políticas
CREATE POLICY "Users can view own notas_credito" ON public.notas_credito FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notas_credito" ON public.notas_credito FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notas_credito" ON public.notas_credito FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notas_credito" ON public.notas_credito FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 6. COMENTARIO
-- =====================================================
COMMENT ON TABLE public.notas_credito IS 'Tabla de notas de crédito';

-- =====================================================
-- 7. VERIFICACIÓN
-- =====================================================
-- Verificar que la tabla se creó correctamente
SELECT 
    'Tabla notas_credito creada correctamente' as status,
    COUNT(*) as columnas
FROM information_schema.columns 
WHERE table_name = 'notas_credito' 
AND table_schema = 'public';
