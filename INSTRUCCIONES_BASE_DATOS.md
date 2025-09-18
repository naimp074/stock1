# 📋 Instrucciones para Configurar la Base de Datos Tucky2

## 🚀 Pasos para Configurar la Base de Datos

### 1. **Crear el Esquema Principal**
Ejecuta el archivo `supabase_schema_completo.sql` en tu base de datos de Supabase:

1. Ve al **Dashboard de Supabase**
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Copia y pega el contenido de `supabase_schema_completo.sql`
5. Haz clic en **Run** para ejecutar

### 2. **Registrar un Usuario**
Antes de insertar datos iniciales, necesitas tener un usuario registrado:

1. Ve a **Authentication** en el dashboard
2. Crea un usuario manualmente o
3. Registra un usuario desde tu aplicación

### 3. **Insertar Datos Iniciales**
Una vez que tengas un usuario registrado, ejecuta `datos_iniciales.sql`:

1. Ve al **SQL Editor** de Supabase
2. Copia y pega el contenido de `datos_iniciales.sql`
3. Haz clic en **Run** para ejecutar

## 🔧 Alternativa: Función Automática

También puedes llamar a la función desde tu aplicación:

```sql
SELECT insertar_datos_iniciales();
```

## 📊 ¿Qué se Crea?

### **Tablas Principales:**
- ✅ `productos` - Inventario de productos
- ✅ `ventas` - Registro de ventas
- ✅ `cuentas_corrientes` - Cuentas de clientes
- ✅ `pagos_corrientes` - Movimientos de cuenta corriente
- ✅ `configuracion` - Configuración del sistema
- ✅ `categorias` - Categorías de productos
- ✅ `proveedores` - Información de proveedores

### **Funcionalidades:**
- ✅ **Seguridad RLS** - Cada usuario solo ve sus datos
- ✅ **Triggers automáticos** - Campos calculados automáticamente
- ✅ **Índices optimizados** - Consultas rápidas
- ✅ **Datos de ejemplo** - Productos, categorías y proveedores

### **Datos Iniciales:**
- ✅ **Configuración básica** - Empresa, impuestos, moneda
- ✅ **Categorías** - 7 categorías predefinidas
- ✅ **Proveedores** - 3 proveedores de ejemplo
- ✅ **Productos** - 3 productos de ejemplo

## ⚠️ Solución al Error

El error que viste (`null value in column "user_id"`) ocurre porque:
- Los datos iniciales intentan usar `auth.uid()` 
- Pero no hay usuario autenticado durante la creación del esquema

**Solución:** Ejecutar los datos iniciales DESPUÉS de registrar un usuario.

## 🎯 Orden Correcto de Ejecución

1. **Primero:** `supabase_schema_completo.sql` (crea las tablas)
2. **Segundo:** Registrar un usuario en la aplicación
3. **Tercero:** `datos_iniciales.sql` (inserta datos para ese usuario)

## 🔍 Verificar que Funciona

Después de ejecutar todo, puedes verificar que funciona:

```sql
-- Verificar que las tablas existen
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verificar que tienes datos
SELECT COUNT(*) FROM productos;
SELECT COUNT(*) FROM configuracion;
```

¡Tu base de datos estará lista para usar! 🎉
