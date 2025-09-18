-- =====================================================
-- ESQUEMA COMPLETO DE LA BASE DE DATOS TUCKY2
-- =====================================================
-- Este archivo contiene todas las tablas necesarias para la aplicación
-- Incluye: Productos, Ventas, Cuentas Corrientes, Usuarios y más

-- =====================================================
-- 1. TABLA DE USUARIOS (Auth de Supabase)
-- =====================================================
-- Los usuarios se manejan automáticamente por Supabase Auth
-- Esta tabla es solo para referencia

-- =====================================================
-- 2. TABLA DE PRODUCTOS
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

-- Índices para productos
CREATE INDEX IF NOT EXISTS idx_productos_user_id ON public.productos(user_id);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON public.productos(nombre);
CREATE INDEX IF NOT EXISTS idx_productos_sku ON public.productos(sku);
CREATE INDEX IF NOT EXISTS idx_productos_activo ON public.productos(activo);

-- =====================================================
-- 3. TABLA DE VENTAS
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

-- Índices para ventas
CREATE INDEX IF NOT EXISTS idx_ventas_user_id ON public.ventas(user_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON public.ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON public.ventas(cliente);
CREATE INDEX IF NOT EXISTS idx_ventas_tipo ON public.ventas(tipo);
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON public.ventas(estado);
CREATE INDEX IF NOT EXISTS idx_ventas_numero_factura ON public.ventas(numero_factura);

-- =====================================================
-- 4. TABLA DE CUENTAS CORRIENTES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cuentas_corrientes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cliente text NOT NULL,
  email text,
  telefono text,
  direccion text,
  documento text,
  limite_credito numeric NOT NULL DEFAULT 0,
  saldo numeric NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT cuentas_corrientes_pkey PRIMARY KEY (id),
  CONSTRAINT cuentas_corrientes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Índices para cuentas corrientes
CREATE INDEX IF NOT EXISTS idx_cuentas_corrientes_user_id ON public.cuentas_corrientes(user_id);
CREATE INDEX IF NOT EXISTS idx_cuentas_corrientes_cliente ON public.cuentas_corrientes(cliente);
CREATE INDEX IF NOT EXISTS idx_cuentas_corrientes_activo ON public.cuentas_corrientes(activo);

-- =====================================================
-- 5. TABLA DE MOVIMIENTOS DE CUENTA CORRIENTE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pagos_corrientes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cuenta_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'cargo' CHECK (tipo IN ('cargo', 'pago')),
  monto numeric NOT NULL DEFAULT 0,
  descuento numeric NOT NULL DEFAULT 0,
  monto_real numeric NOT NULL DEFAULT 0,
  concepto text,
  factura text,
  fecha timestamp with time zone NOT NULL DEFAULT now(),
  observaciones text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT pagos_corrientes_pkey PRIMARY KEY (id),
  CONSTRAINT pagos_corrientes_cuenta_id_fkey FOREIGN KEY (cuenta_id) REFERENCES public.cuentas_corrientes(id) ON DELETE CASCADE,
  CONSTRAINT pagos_corrientes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Índices para pagos corrientes
CREATE INDEX IF NOT EXISTS idx_pagos_corrientes_cuenta_id ON public.pagos_corrientes(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_pagos_corrientes_user_id ON public.pagos_corrientes(user_id);
CREATE INDEX IF NOT EXISTS idx_pagos_corrientes_fecha ON public.pagos_corrientes(fecha);
CREATE INDEX IF NOT EXISTS idx_pagos_corrientes_tipo ON public.pagos_corrientes(tipo);

-- =====================================================
-- 6. TABLA DE CONFIGURACIÓN
-- =====================================================
CREATE TABLE IF NOT EXISTS public.configuracion (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clave text NOT NULL UNIQUE,
  valor text NOT NULL,
  descripcion text,
  tipo text NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto', 'numero', 'booleano', 'json')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT configuracion_pkey PRIMARY KEY (id),
  CONSTRAINT configuracion_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Índices para configuración
CREATE INDEX IF NOT EXISTS idx_configuracion_user_id ON public.configuracion(user_id);
CREATE INDEX IF NOT EXISTS idx_configuracion_clave ON public.configuracion(clave);

-- =====================================================
-- 7. TABLA DE CATEGORÍAS DE PRODUCTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.categorias (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text,
  color text DEFAULT '#007bff',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT categorias_pkey PRIMARY KEY (id),
  CONSTRAINT categorias_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Índices para categorías
CREATE INDEX IF NOT EXISTS idx_categorias_user_id ON public.categorias(user_id);
CREATE INDEX IF NOT EXISTS idx_categorias_activo ON public.categorias(activo);

-- =====================================================
-- 8. TABLA DE PROVEEDORES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.proveedores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  contacto text,
  telefono text,
  email text,
  direccion text,
  ciudad text,
  codigo_postal text,
  pais text DEFAULT 'Argentina',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT proveedores_pkey PRIMARY KEY (id),
  CONSTRAINT proveedores_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Índices para proveedores
CREATE INDEX IF NOT EXISTS idx_proveedores_user_id ON public.proveedores(user_id);
CREATE INDEX IF NOT EXISTS idx_proveedores_activo ON public.proveedores(activo);

-- =====================================================
-- 9. FUNCIONES Y TRIGGERS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_productos_updated_at BEFORE UPDATE ON public.productos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ventas_updated_at BEFORE UPDATE ON public.ventas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cuentas_corrientes_updated_at BEFORE UPDATE ON public.cuentas_corrientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_configuracion_updated_at BEFORE UPDATE ON public.configuracion FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON public.categorias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_proveedores_updated_at BEFORE UPDATE ON public.proveedores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para calcular monto real en pagos corrientes
CREATE OR REPLACE FUNCTION calculate_monto_real()
RETURNS TRIGGER AS $$
BEGIN
    NEW.monto_real = NEW.monto - (NEW.monto * NEW.descuento / 100);
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para monto real
CREATE TRIGGER calculate_monto_real_trigger BEFORE INSERT OR UPDATE ON public.pagos_corrientes FOR EACH ROW EXECUTE FUNCTION calculate_monto_real();

-- =====================================================
-- 10. POLÍTICAS DE SEGURIDAD (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas_corrientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_corrientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;

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

-- Políticas para configuración
CREATE POLICY "Users can view own configuracion" ON public.configuracion FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own configuracion" ON public.configuracion FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own configuracion" ON public.configuracion FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own configuracion" ON public.configuracion FOR DELETE USING (auth.uid() = user_id);

-- Políticas para categorías
CREATE POLICY "Users can view own categorias" ON public.categorias FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categorias" ON public.categorias FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categorias" ON public.categorias FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categorias" ON public.categorias FOR DELETE USING (auth.uid() = user_id);

-- Políticas para proveedores
CREATE POLICY "Users can view own proveedores" ON public.proveedores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own proveedores" ON public.proveedores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own proveedores" ON public.proveedores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own proveedores" ON public.proveedores FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 11. DATOS INICIALES
-- =====================================================

-- NOTA: Los datos iniciales se insertarán cuando el usuario se registre
-- No se pueden insertar aquí porque auth.uid() no está disponible durante la creación del esquema

-- =====================================================
-- 12. COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE public.productos IS 'Tabla de productos del inventario';
COMMENT ON TABLE public.ventas IS 'Tabla de ventas realizadas';
COMMENT ON TABLE public.cuentas_corrientes IS 'Tabla de cuentas corrientes de clientes';
COMMENT ON TABLE public.pagos_corrientes IS 'Tabla de movimientos de cuenta corriente';
COMMENT ON TABLE public.configuracion IS 'Tabla de configuración del sistema';
COMMENT ON TABLE public.categorias IS 'Tabla de categorías de productos';
COMMENT ON TABLE public.proveedores IS 'Tabla de proveedores';

-- =====================================================
-- FIN DEL ESQUEMA
-- =====================================================
