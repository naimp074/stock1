// src/services/productosService.js
import { supabase } from '../lib/supabaseClient';

/** LISTAR (con RLS, devuelve solo los del usuario logueado) */
export async function listarProductos() {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/** CREAR (NO mandar id para que Postgres genere UUID por defecto) */
export async function crearProducto(producto) {
  const toInsert = { ...producto };
  delete toInsert.id; // clave: no enviar id vacío

  const { data, error } = await supabase
    .from('productos')
    .insert([toInsert])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** ACTUALIZAR (requiere id) */
export async function actualizarProducto(id, producto) {
  const toUpdate = { ...producto };
  delete toUpdate.id;

  const { data, error } = await supabase
    .from('productos')
    .update(toUpdate)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** ELIMINAR por id */
export async function eliminarProducto(id) {
  const { error } = await supabase
    .from('productos')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}

/** IMPORTACIÓN MASIVA desde Excel (insert en lote) */
export async function guardarProductosMasivo(productos) {
  const aInsertar = productos.map((p) => ({
    nombre: (p.nombre || '').trim(),
    precio_costo: Number(p.precio_costo ?? p.costo ?? 0),
    precio_venta: Number(p.precio_venta ?? p.venta ?? 0),
    cantidad: Number(p.cantidad ?? 0),
    proveedor: p.proveedor || null,
    telefono: p.telefono || null,
    imagen: p.imagen || null,
  }));

  if (aInsertar.length === 0) return [];

  const { data, error } = await supabase
    .from('productos')
    .insert(aInsertar)
    .select();
  if (error) throw error;
  return data || [];
}

/* Alias opcional para compatibilidad si en algún lado importabas guardarProducto */
export { crearProducto as guardarProducto };
