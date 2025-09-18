-- =====================================================
-- ESQUEMA ACTUALIZADO DE TUCKY2
-- =====================================================
-- Basado en el esquema existente con mejoras necesarias

-- =====================================================
-- 1. TABLA DE CUENTAS CORRIENTES (mejorada)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cuentas_corrientes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cliente text NOT NULL,
  saldo numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cuentas_corrientes_pkey PRIMARY KEY (id),
  CONSTRAINT cuentas_corrientes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =====================================================
-- 2. TABLA DE PAGOS CORRIENTES (mejorada)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pagos_corrientes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cuenta_id uuid NOT NULL,
  monto numeric NOT NULL DEFAULT 0,
  descuento numeric NOT NULL DEFAULT 0,
  monto_real numeric NOT NULL DEFAULT 0,
  fecha timestamp with time zone NOT NULL DEFAULT now(),
  nota text,
  user_id uuid NOT NULL,
  concepto text,
  factura text,
  tipo text NOT NULL DEFAULT 'cargo'::text CHECK (tipo = ANY (ARRAY['cargo'::text, 'pago'::text])),
  CONSTRAINT pagos_corrientes_pkey PRIMARY KEY (id),
  CONSTRAINT pagos_corrientes_cuenta_id_fkey FOREIGN KEY (cuenta_id) REFERENCES public.cuentas_corrientes(id) ON DELETE CASCADE,
  CONSTRAINT pagos_corrientes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =====================================================
-- 3. TABLA DE PRODUCTOS (mejorada)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.productos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  sku text UNIQUE,
  descripcion text,
  precio_costo numeric NOT NULL DEFAULT 0,
  precio_venta numeric NOT NULL DEFAULT 0,
  cantidad integer NOT NULL DEFAULT 0,
  stock_minimo integer NOT NULL DEFAULT 5,
  proveedor text,
  telefono text,
  email text,
  direccion text,
  imagen text,
  categoria text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT productos_pkey PRIMARY KEY (id),
  CONSTRAINT productos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =====================================================
-- 4. TABLA DE VENTAS (mejorada)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ventas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  numero_factura integer,
  fecha timestamp with time zone NOT NULL DEFAULT now(),
  cliente text,
  total numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  impuestos numeric NOT NULL DEFAULT 0,
  descuento numeric NOT NULL DEFAULT 0,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  tipo text NOT NULL DEFAULT 'venta' CHECK (tipo IN ('venta', 'cuenta_corriente')),
  estado text NOT NULL DEFAULT 'completada' CHECK (estado IN ('pendiente', 'completada', 'cancelada')),
  metodo_pago text NOT NULL DEFAULT 'efectivo' CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia', 'cheque')),
  observaciones text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT ventas_pkey PRIMARY KEY (id),
  CONSTRAINT ventas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =====================================================
-- 5. ÍNDICES PARA RENDIMIENTO
-- =====================================================

-- Índices para productos
CREATE INDEX IF NOT EXISTS idx_productos_user_id ON public.productos(user_id);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON public.productos(nombre);
CREATE INDEX IF NOT EXISTS idx_productos_sku ON public.productos(sku);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON public.productos(activo);

-- Índices para ventas
CREATE INDEX IF NOT EXISTS idx_ventas_user_id ON public.ventas(user_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON public.ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON public.ventas(cliente);
CREATE INDEX IF NOT EXISTS idx_ventas_tipo ON public.ventas(tipo);
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON public.ventas(estado);
CREATE INDEX IF NOT EXISTS idx_ventas_numero_factura ON public.ventas(numero_factura);

-- Índices para cuentas corrientes
CREATE INDEX IF NOT EXISTS idx_cuentas_corrientes_user_id ON public.cuentas_corrientes(user_id);
CREATE INDEX IF NOT EXISTS idx_cuentas_corrientes_cliente ON public.cuentas_corrientes(cliente);

-- Índices para pagos corrientes
CREATE INDEX IF NOT EXISTS idx_pagos_corrientes_cuenta_id ON public.pagos_corrientes(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_pagos_corrientes_user_id ON public.pagos_corrientes(user_id);
CREATE INDEX IF NOT EXISTS idx_pagos_corrientes_fecha ON public.pagos_corrientes(fecha);
CREATE INDEX IF NOT EXISTS idx_pagos_corrientes_tipo ON public.pagos_corrientes(tipo);

-- =====================================================
-- 6. FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Función para calcular monto real en pagos corrientes
CREATE OR REPLACE FUNCTION calculate_monto_real()
RETURNS TRIGGER AS $$
BEGIN
    NEW.monto_real = NEW.monto - (NEW.monto * NEW.descuento / 100);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_productos_updated_at BEFORE UPDATE ON public.productos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ventas_updated_at BEFORE UPDATE ON public.ventas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cuentas_corrientes_updated_at BEFORE UPDATE ON public.cuentas_corrientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER calculate_monto_real_trigger BEFORE INSERT OR UPDATE ON public.pagos_corrientes FOR EACH ROW EXECUTE FUNCTION calculate_monto_real();

-- =====================================================
-- 7. POLÍTICAS DE SEGURIDAD (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas_corrientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_corrientes ENABLE ROW LEVEL SECURITY;

-- Políticas para productos
CREATE POLICY "Users can view own productos" ON public.productos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own productos" ON public.productos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own productos" ON public.productos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own productos" ON public.productos FOR DELETE USING (auth.uid() = user_id);

-- Políticas para ventas
CREATE POLICY "Users can view own ventas" ON public.ventas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ventas" ON public.ventas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ventas" ON public.ventas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ventas" ON public.ventas FOR DELETE USING (auth.uid() = user_id);

-- Políticas para cuentas corrientes
CREATE POLICY "Users can view own cuentas_corrientes" ON public.cuentas_corrientes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cuentas_corrientes" ON public.cuentas_corrientes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cuentas_corrientes" ON public.cuentas_corrientes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cuentas_corrientes" ON public.cuentas_corrientes FOR DELETE USING (auth.uid() = user_id);

-- Políticas para pagos corrientes
CREATE POLICY "Users can view own pagos_corrientes" ON public.pagos_corrientes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pagos_corrientes" ON public.pagos_corrientes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pagos_corrientes" ON public.pagos_corrientes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pagos_corrientes" ON public.pagos_corrientes FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 8. TABLA DE NOTAS DE CRÉDITO
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

-- Índices para notas de crédito
CREATE INDEX IF NOT EXISTS idx_notas_credito_user_id ON public.notas_credito(user_id);
CREATE INDEX IF NOT EXISTS idx_notas_credito_fecha ON public.notas_credito(fecha);
CREATE INDEX IF NOT EXISTS idx_notas_credito_cliente ON public.notas_credito(cliente);
CREATE INDEX IF NOT EXISTS idx_notas_credito_numero ON public.notas_credito(numero_nota);

-- Trigger para updated_at en notas de crédito
CREATE TRIGGER update_notas_credito_updated_at BEFORE UPDATE ON public.notas_credito FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS para notas de crédito
ALTER TABLE public.notas_credito ENABLE ROW LEVEL SECURITY;

-- Políticas para notas de crédito
CREATE POLICY "Users can view own notas_credito" ON public.notas_credito FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notas_credito" ON public.notas_credito FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notas_credito" ON public.notas_credito FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notas_credito" ON public.notas_credito FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 9. COMENTARIOS
-- =====================================================

COMMENT ON TABLE public.productos IS 'Tabla de productos del inventario';
COMMENT ON TABLE public.ventas IS 'Tabla de ventas realizadas';
COMMENT ON TABLE public.cuentas_corrientes IS 'Tabla de cuentas corrientes de clientes';
COMMENT ON TABLE public.pagos_corrientes IS 'Tabla de movimientos de cuenta corriente';
COMMENT ON TABLE public.notas_credito IS 'Tabla de notas de crédito';