-- =====================================================
-- DATOS INICIALES PARA TUCKY2
-- =====================================================
-- Este archivo debe ejecutarse DESPUÉS de que el usuario se haya registrado
-- Ejecutar desde la aplicación o desde el dashboard de Supabase

-- =====================================================
-- CONFIGURACIÓN INICIAL DEL SISTEMA
-- =====================================================

-- Insertar configuración inicial para el usuario actual
INSERT INTO public.configuracion (clave, valor, descripcion, tipo, user_id) VALUES
('empresa_nombre', 'Mi Empresa', 'Nombre de la empresa', 'texto', auth.uid()),
('empresa_direccion', 'Dirección de la empresa', 'Dirección de la empresa', 'texto', auth.uid()),
('empresa_telefono', '123-456-7890', 'Teléfono de la empresa', 'texto', auth.uid()),
('empresa_email', 'empresa@email.com', 'Email de la empresa', 'texto', auth.uid()),
('impuestos_porcentaje', '21', 'Porcentaje de IVA', 'numero', auth.uid()),
('moneda_simbolo', '$', 'Símbolo de la moneda', 'texto', auth.uid()),
('factura_numero_inicial', '1', 'Número inicial para facturas', 'numero', auth.uid()),
('stock_minimo_default', '5', 'Stock mínimo por defecto', 'numero', auth.uid()),
('pais_default', 'Argentina', 'País por defecto', 'texto', auth.uid()),
('formato_fecha', 'DD/MM/YYYY', 'Formato de fecha', 'texto', auth.uid())
ON CONFLICT (clave) DO NOTHING;

-- =====================================================
-- CATEGORÍAS INICIALES
-- =====================================================

-- Insertar categorías básicas
INSERT INTO public.categorias (nombre, descripcion, color, user_id) VALUES
('General', 'Productos sin categoría específica', '#6c757d', auth.uid()),
('Electrónicos', 'Dispositivos electrónicos', '#007bff', auth.uid()),
('Ropa', 'Prendas de vestir', '#28a745', auth.uid()),
('Hogar', 'Artículos para el hogar', '#ffc107', auth.uid()),
('Deportes', 'Artículos deportivos', '#dc3545', auth.uid()),
('Libros', 'Libros y material educativo', '#17a2b8', auth.uid()),
('Juguetes', 'Juguetes y entretenimiento', '#fd7e14', auth.uid())
ON CONFLICT DO NOTHING;

-- =====================================================
-- PROVEEDORES INICIALES
-- =====================================================

-- Insertar proveedores de ejemplo
INSERT INTO public.proveedores (nombre, contacto, telefono, email, direccion, ciudad, user_id) VALUES
('Proveedor Principal', 'Juan Pérez', '123-456-7890', 'juan@proveedor.com', 'Av. Principal 123', 'Buenos Aires', auth.uid()),
('Distribuidora ABC', 'María García', '098-765-4321', 'maria@distribuidora.com', 'Calle Secundaria 456', 'Córdoba', auth.uid()),
('Mayorista XYZ', 'Carlos López', '555-123-4567', 'carlos@mayorista.com', 'Ruta Nacional 789', 'Rosario', auth.uid())
ON CONFLICT DO NOTHING;

-- =====================================================
-- PRODUCTOS DE EJEMPLO
-- =====================================================

-- Insertar algunos productos de ejemplo
INSERT INTO public.productos (nombre, sku, descripcion, precio_costo, precio_venta, cantidad, stock_minimo, proveedor, categoria, user_id) VALUES
('Producto Ejemplo 1', 'PE001', 'Descripción del producto ejemplo 1', 100.00, 150.00, 50, 5, 'Proveedor Principal', 'General', auth.uid()),
('Producto Ejemplo 2', 'PE002', 'Descripción del producto ejemplo 2', 200.00, 300.00, 30, 3, 'Distribuidora ABC', 'Electrónicos', auth.uid()),
('Producto Ejemplo 3', 'PE003', 'Descripción del producto ejemplo 3', 50.00, 75.00, 100, 10, 'Mayorista XYZ', 'Hogar', auth.uid())
ON CONFLICT (sku) DO NOTHING;

-- =====================================================
-- FUNCIÓN PARA INSERTAR DATOS INICIALES
-- =====================================================

-- Función que puede ser llamada desde la aplicación
CREATE OR REPLACE FUNCTION insertar_datos_iniciales()
RETURNS void AS $$
BEGIN
    -- Insertar configuración inicial
    INSERT INTO public.configuracion (clave, valor, descripcion, tipo, user_id) VALUES
    ('empresa_nombre', 'Mi Empresa', 'Nombre de la empresa', 'texto', auth.uid()),
    ('empresa_direccion', 'Dirección de la empresa', 'Dirección de la empresa', 'texto', auth.uid()),
    ('empresa_telefono', '123-456-7890', 'Teléfono de la empresa', 'texto', auth.uid()),
    ('empresa_email', 'empresa@email.com', 'Email de la empresa', 'texto', auth.uid()),
    ('impuestos_porcentaje', '21', 'Porcentaje de IVA', 'numero', auth.uid()),
    ('moneda_simbolo', '$', 'Símbolo de la moneda', 'texto', auth.uid()),
    ('factura_numero_inicial', '1', 'Número inicial para facturas', 'numero', auth.uid()),
    ('stock_minimo_default', '5', 'Stock mínimo por defecto', 'numero', auth.uid()),
    ('pais_default', 'Argentina', 'País por defecto', 'texto', auth.uid()),
    ('formato_fecha', 'DD/MM/YYYY', 'Formato de fecha', 'texto', auth.uid())
    ON CONFLICT (clave) DO NOTHING;

    -- Insertar categorías básicas
    INSERT INTO public.categorias (nombre, descripcion, color, user_id) VALUES
    ('General', 'Productos sin categoría específica', '#6c757d', auth.uid()),
    ('Electrónicos', 'Dispositivos electrónicos', '#007bff', auth.uid()),
    ('Ropa', 'Prendas de vestir', '#28a745', auth.uid()),
    ('Hogar', 'Artículos para el hogar', '#ffc107', auth.uid()),
    ('Deportes', 'Artículos deportivos', '#dc3545', auth.uid()),
    ('Libros', 'Libros y material educativo', '#17a2b8', auth.uid()),
    ('Juguetes', 'Juguetes y entretenimiento', '#fd7e14', auth.uid())
    ON CONFLICT DO NOTHING;

    -- Insertar proveedores de ejemplo
    INSERT INTO public.proveedores (nombre, contacto, telefono, email, direccion, ciudad, user_id) VALUES
    ('Proveedor Principal', 'Juan Pérez', '123-456-7890', 'juan@proveedor.com', 'Av. Principal 123', 'Buenos Aires', auth.uid()),
    ('Distribuidora ABC', 'María García', '098-765-4321', 'maria@distribuidora.com', 'Calle Secundaria 456', 'Córdoba', auth.uid()),
    ('Mayorista XYZ', 'Carlos López', '555-123-4567', 'carlos@mayorista.com', 'Ruta Nacional 789', 'Rosario', auth.uid())
    ON CONFLICT DO NOTHING;

    -- Insertar algunos productos de ejemplo
    INSERT INTO public.productos (nombre, sku, descripcion, precio_costo, precio_venta, cantidad, stock_minimo, proveedor, categoria, user_id) VALUES
    ('Producto Ejemplo 1', 'PE001', 'Descripción del producto ejemplo 1', 100.00, 150.00, 50, 5, 'Proveedor Principal', 'General', auth.uid()),
    ('Producto Ejemplo 2', 'PE002', 'Descripción del producto ejemplo 2', 200.00, 300.00, 30, 3, 'Distribuidora ABC', 'Electrónicos', auth.uid()),
    ('Producto Ejemplo 3', 'PE003', 'Descripción del producto ejemplo 3', 50.00, 75.00, 100, 10, 'Mayorista XYZ', 'Hogar', auth.uid())
    ON CONFLICT (sku) DO NOTHING;

    RAISE NOTICE 'Datos iniciales insertados correctamente para el usuario %', auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INSTRUCCIONES DE USO
-- =====================================================

-- Para ejecutar los datos iniciales desde la aplicación:
-- SELECT insertar_datos_iniciales();

-- O ejecutar este archivo completo desde el dashboard de Supabase
-- después de que el usuario se haya registrado
